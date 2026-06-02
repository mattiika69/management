import "server-only";
import { recordToolRun, saveAgentMessage, writeAgentAudit } from "@/lib/agent/audit";
import { planAgentSteps, type PlannedAgentStep } from "@/lib/agent/planner";
import { agentTools } from "@/lib/agent/tools";
import type { AgentContext, AgentRunInput, AgentRunResult, AgentToolInput, AgentToolName } from "@/lib/agent/types";

function isHighRisk(toolName: AgentToolName) {
  const tool = agentTools[toolName];
  return Boolean(tool?.destructive || tool?.billing || tool?.permissionChanging);
}

function shortId(value: string) {
  return value.slice(0, 8);
}

async function createApproval(
  context: AgentContext,
  step: PlannedAgentStep,
  message: string,
) {
  const { data: request, error: requestError } = await context.supabase
    .from("agent_requests")
    .insert({
      tenant_id: context.organizationId,
      requested_by_user_id: context.actorUserId,
      source_provider: context.platform,
      request_text: message,
      risk_level: "high",
      status: "pending",
      metadata: {
        source: "agent_approval_gate",
        toolName: step.toolName,
        toolInput: step.input,
        conversationId: context.conversationId ?? null,
      },
    })
    .select("id")
    .single<{ id: string }>();

  if (requestError) throw new Error(requestError.message);

  const { data: approval, error } = await context.supabase
    .from("agent_approvals")
    .insert({
      tenant_id: context.organizationId,
      request_id: request.id,
      approved_by_user_id: null,
      status: "pending",
      notes: `Pending ${step.toolName} approval`,
      conversation_id: context.conversationId ?? null,
      platform: context.platform,
      actor_user_id: context.actorUserId,
      external_actor_id: context.externalUserId ?? null,
      tool_name: step.toolName,
      tool_input: step.input,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
    .select("id")
    .single<{ id: string }>();

  if (error) throw new Error(error.message);
  await writeAgentAudit(context, {
    action: "agent.approval.requested",
    targetTable: "agent_approvals",
    targetId: approval.id,
    metadata: { toolName: step.toolName, requestId: request.id },
  });

  return approval.id;
}

async function executeTool(
  context: AgentContext,
  step: PlannedAgentStep,
  input: {
    messageId?: string | null;
    confirmed?: boolean;
    approvalId?: string | null;
  } = {},
) {
  const tool = agentTools[step.toolName];
  if (!tool) throw new Error(`Unsupported tool: ${step.toolName}.`);
  if (tool.adminOnly && context.role !== "owner" && context.role !== "admin") {
    throw new Error("Owner or admin access is required for that action.");
  }

  if (isHighRisk(step.toolName) && !input.confirmed) {
    const approvalId = await createApproval(context, step, `${step.toolName}: ${JSON.stringify(step.input)}`);
    await recordToolRun(context, {
      messageId: input.messageId ?? null,
      toolName: step.toolName,
      allowed: false,
      status: "needs_confirmation",
      input: step.input,
      output: { approvalId },
      requiresConfirmation: true,
      approvalId,
    });
    return {
      ok: true,
      summary: [
        `I need confirmation before running ${step.toolName}.`,
        `Reply with: confirm ${shortId(approvalId)}`,
      ].join("\n"),
      status: "needs_confirmation" as const,
      requiresConfirmation: true,
      approvalId,
    };
  }

  const result = await tool.handler(context, step.input);
  await recordToolRun(context, {
    messageId: input.messageId ?? null,
    toolName: step.toolName,
    allowed: result.ok,
    status: result.status ?? (result.ok ? "succeeded" : "failed"),
    input: step.input,
    output: result.data ?? { summary: result.summary },
    requiresConfirmation: Boolean(result.requiresConfirmation),
    approvalId: input.approvalId ?? result.approvalId ?? null,
    targetTable: result.targetTable ?? null,
    targetId: result.targetId ?? null,
    before: result.before,
    after: result.after,
  });
  return result;
}

async function confirmApproval(context: AgentContext, input: AgentToolInput, messageId?: string | null) {
  const approvalPrefix = typeof input.approvalId === "string" ? input.approvalId.trim().toLowerCase() : "";
  if (!approvalPrefix) throw new Error("Approval id is required.");

  const { data: approvals, error } = await context.supabase
    .from("agent_approvals")
    .select("id,request_id,status,tool_name,tool_input,expires_at")
    .eq("tenant_id", context.organizationId)
    .eq("actor_user_id", context.actorUserId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<Array<{
      id: string;
      request_id: string;
      status: string;
      tool_name: AgentToolName | null;
      tool_input: AgentToolInput | null;
      expires_at: string;
    }>>();

  if (error) throw new Error(error.message);
  const matches = (approvals ?? []).filter((approval) => approval.id.toLowerCase().startsWith(approvalPrefix));
  if (!matches.length) return { ok: false, summary: "No pending approval matched that id.", status: "failed" as const };
  if (matches.length > 1) return { ok: false, summary: "Multiple approvals matched. Use more of the approval id.", status: "failed" as const };

  const approval = matches[0];
  if (new Date(approval.expires_at).getTime() < Date.now()) {
    await context.supabase.from("agent_approvals").update({ status: "cancelled" }).eq("id", approval.id);
    return { ok: false, summary: "That approval expired. Ask me to run the action again.", status: "failed" as const };
  }
  if (!approval.tool_name || !approval.tool_input) {
    return { ok: false, summary: "That approval does not include a runnable tool.", status: "failed" as const };
  }

  const result = await executeTool(
    context,
    { toolName: approval.tool_name, input: approval.tool_input },
    { messageId, confirmed: true, approvalId: approval.id },
  );

  await context.supabase
    .from("agent_approvals")
    .update({
      status: result.ok ? "approved" : "rejected",
      approved_by_user_id: context.actorUserId,
      confirmed_at: result.ok ? new Date().toISOString() : null,
      rejected_at: result.ok ? null : new Date().toISOString(),
    })
    .eq("id", approval.id);

  await context.supabase
    .from("agent_requests")
    .update({ status: result.ok ? "approved" : "failed" })
    .eq("id", approval.request_id);

  return {
    ...result,
    summary: result.ok ? `Confirmed and completed. ${result.summary}` : result.summary,
  };
}

function responseStatus(results: Array<{ status?: string; ok?: boolean }>): AgentRunResult["status"] {
  if (results.some((result) => result.status === "needs_confirmation")) return "needs_confirmation";
  if (results.some((result) => result.ok === false || result.status === "failed")) return "failed";
  if (results.some((result) => result.status === "saved")) return "saved";
  return "sent";
}

export async function runAgent(input: AgentRunInput): Promise<AgentRunResult> {
  const message = input.message.trim();
  if (!message) {
    return {
      ok: true,
      text: "Send a message and I will help with the workspace.",
      command: "empty",
      status: "sent",
    };
  }

  const messageId = await saveAgentMessage(input.context, {
    role: "user",
    content: message,
    externalMessageId: input.externalMessageId ?? null,
    metadata: input.payload ?? {},
  });

  const steps = planAgentSteps(message);
  if (!steps.length) {
    return {
      ok: true,
      text: "Tell me what you want to find, create, update, or delete.",
      command: "clarify",
      status: "sent",
    };
  }

  const results = [];
  for (const step of steps) {
    try {
      const result = step.toolName === "confirm_approval"
        ? await confirmApproval(input.context, step.input, messageId)
        : await executeTool(input.context, step, { messageId });
      results.push({ step, result });
      await saveAgentMessage(input.context, {
        role: "tool",
        content: result.summary,
        metadata: { toolName: step.toolName, ok: result.ok },
      });
    } catch (error) {
      const summary = error instanceof Error ? error.message : "Tool failed.";
      await recordToolRun(input.context, {
        messageId,
        toolName: step.toolName,
        allowed: false,
        status: "failed",
        input: step.input,
        errorMessage: summary,
      });
      results.push({ step, result: { ok: false, summary, status: "failed" as const } });
    }
  }

  const status = responseStatus(results.map((item) => item.result));
  const text = results.map((item) => item.result.summary).join("\n\n");
  await saveAgentMessage(input.context, {
    role: "assistant",
    content: text,
    metadata: {
      status,
      tools: results.map((item) => item.step.toolName),
    },
  });

  return {
    ok: status !== "failed",
    text,
    command: results.map((item) => item.step.toolName).join(","),
    status,
    toolRuns: results.map((item) => ({
      toolName: item.step.toolName,
      status: item.result.status ?? (item.result.ok ? "sent" : "failed"),
      summary: item.result.summary,
    })),
  };
}
