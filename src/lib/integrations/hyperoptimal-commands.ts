import "server-only";
import { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_COMPANY_CONTEXT,
  FUNNEL_DEFINITIONS,
  companyContextToText,
  type CompanyContextData,
} from "@/lib/hyperoptimal/data";
import { handleAgentConversation } from "@/lib/agent/conversation";
import {
  normalizeCompanyContext,
  type FunnelStepRow,
} from "@/lib/hyperoptimal/server";
import type { IntegrationConnection } from "./connections";

type CommandResult = {
  command: string;
  text: string;
  status?: "saved" | "sent" | "failed" | "ignored";
};

type CommandOptions = {
  externalUserId?: string | null;
};

const HELP_TEXT = [
  "HyperOptimal Management commands:",
  "/context - read the AI Context Document summary",
  "/agent request What you need done - create an AI Agent request",
  "/agent edit request-id Updated request - edit a pending AI Agent request",
  "/agent approve request-id - approve a pending AI Agent request",
  "/agent cancel request-id - cancel an AI Agent request",
  "/agent show request-id - read one AI Agent request",
  "/agent status - read recent AI Agent requests",
  "/memory - read saved AI Agent memory",
  "/remember Title | What future work should remember - save AI Agent memory",
  "/outputs - read recent saved outputs",
  "/set context companyName Example Co - update one AI Context Document field",
].join("\n");

function normalizeCommand(text: string) {
  return text
    .replace(/^<@[A-Z0-9]+>\s*/i, "")
    .replace(/^\/sm\s+/i, "")
    .replace(/^\//, "")
    .trim();
}

function canonicalFunnelToken(value: string) {
  return value.replace(/_/g, "-").toLowerCase();
}

type CommandFunnelRow = {
  id: string;
  organization_id: string;
  template_key: "book-a-call";
  name: string;
};

type CommandContextRow = {
  id: string;
  title: string;
  status: "draft" | "confirmed" | "archived";
  data: CompanyContextData;
};

type IntegrationActorRole = "owner" | "admin" | "member" | "viewer";

type AgentRequestRow = {
  id: string;
  status: string;
  risk_level: string;
  request_text: string;
  created_at: string;
  source_provider?: string | null;
  metadata?: Record<string, unknown>;
};

function shortId(value: string) {
  return value.slice(0, 8);
}

function parseAgentRequest(rawText: string) {
  const riskPrefix = rawText.match(/^(low|normal|high)\s*:\s*([\s\S]+)$/i);
  if (riskPrefix) {
    return {
      requestText: riskPrefix[2].trim(),
      riskLevel: riskPrefix[1].toLowerCase() as "low" | "normal" | "high",
    };
  }

  const riskLevel = /\b(delete|remove|deploy|production|billing|stripe|secret|permission|role)\b/i.test(rawText)
    ? "high"
    : "normal";

  return {
    requestText: rawText.trim(),
    riskLevel,
  };
}

function canUseAgent(role: IntegrationActorRole | null) {
  return role === "owner" || role === "admin";
}

function isConnectionActor(
  connection: IntegrationConnection,
  externalUserId?: string | null,
) {
  return !connection.external_user_id || connection.external_user_id === externalUserId;
}

async function getIntegrationActorRole(
  supabase: SupabaseClient,
  connection: IntegrationConnection,
) {
  if (!connection.created_by) return null;

  const { data: tenantMembership, error: tenantError } = await supabase
    .from("tenant_memberships")
    .select("role")
    .eq("tenant_id", connection.organization_id)
    .eq("user_id", connection.created_by)
    .is("archived_at", null)
    .maybeSingle<{ role: IntegrationActorRole }>();

  if (tenantError) throw new Error(tenantError.message);
  if (tenantMembership?.role) return tenantMembership.role;

  const { data: legacyMembership, error: legacyError } = await supabase
    .from("organization_memberships")
    .select("role")
    .eq("organization_id", connection.organization_id)
    .eq("user_id", connection.created_by)
    .maybeSingle<{ role: IntegrationActorRole }>();

  if (legacyError) throw new Error(legacyError.message);
  return legacyMembership?.role ?? null;
}

async function auditIntegrationAgentAction(
  supabase: SupabaseClient,
  connection: IntegrationConnection,
  action: string,
  targetId: string,
  metadata: Record<string, unknown> = {},
) {
  await supabase.from("admin_audit_log").insert({
    tenant_id: connection.organization_id,
    actor_user_id: connection.created_by,
    action,
    target_table: "agent_requests",
    target_id: targetId,
    metadata: {
      source: "integration",
      provider: connection.provider,
      connectionId: connection.id,
      externalTeamId: connection.external_team_id,
      externalChannelId: connection.external_channel_id,
      externalUserId: connection.external_user_id,
      ...metadata,
    },
  });
}

async function loadCompanyContext(
  supabase: SupabaseClient,
  organizationId: string,
) {
  const { data: confirmed, error: confirmedError } = await supabase
    .from("company_contexts")
    .select("id,title,status,data")
    .eq("organization_id", organizationId)
    .eq("status", "confirmed")
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .returns<CommandContextRow[]>();

  if (confirmedError) throw new Error(confirmedError.message);
  if (confirmed?.[0]) {
    return { ...confirmed[0], data: normalizeCompanyContext(confirmed[0].data) };
  }

  const { data, error } = await supabase
    .from("company_contexts")
    .select("id,title,status,data")
    .eq("organization_id", organizationId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .returns<CommandContextRow[]>();

  if (error) throw new Error(error.message);
  return data?.[0] ? { ...data[0], data: normalizeCompanyContext(data[0].data) } : null;
}

async function upsertCompanyContextField(
  supabase: SupabaseClient,
  connection: IntegrationConnection,
  field: string,
  value: string,
) {
  if (!(field in DEFAULT_COMPANY_CONTEXT)) {
    return `Unknown AI Context Document field: ${field}`;
  }

  const existing = await loadCompanyContext(supabase, connection.organization_id);
  const data = { ...(existing?.data ?? DEFAULT_COMPANY_CONTEXT), [field]: value };
  const payload = {
    organization_id: connection.organization_id,
    data,
    updated_by: connection.created_by,
    created_by: connection.created_by,
  };

  const { error } = existing
    ? await supabase
        .from("company_contexts")
        .update(payload)
        .eq("id", existing.id)
    : await supabase.from("company_contexts").insert(payload);

  if (error) throw new Error(error.message);
  return `Saved ${field} to the AI Context Document.`;
}

async function ensureFunnelForCommand(
  supabase: SupabaseClient,
  connection: IntegrationConnection,
  funnelType: "book-a-call",
) {
  const definition = FUNNEL_DEFINITIONS[funnelType];
  const { data: existing, error: selectError } = await supabase
    .from("funnels")
    .select("id,organization_id,template_key,name")
    .eq("organization_id", connection.organization_id)
    .eq("template_key", funnelType)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .returns<CommandFunnelRow[]>();
  if (selectError) throw new Error(selectError.message);

  let funnel = existing?.[0] ?? null;
  if (!funnel) {
    const { data: created, error: insertError } = await supabase
      .from("funnels")
      .insert({
        organization_id: connection.organization_id,
        template_key: funnelType,
        name: definition.name,
        builder_key: "lovable",
        created_by: connection.created_by,
        updated_by: connection.created_by,
      })
      .select("id,organization_id,template_key,name")
      .single<CommandFunnelRow>();
    if (insertError) throw new Error(insertError.message);
    funnel = created;
  }

  const { data: existingSteps, error: stepsError } = await supabase
    .from("funnel_steps")
    .select("id,organization_id,funnel_id,step_key,step_order,title,status,url,notes,assigned_to,ai_agent_id,metadata,updated_at")
    .eq("funnel_id", funnel.id)
    .order("step_order", { ascending: true })
    .returns<FunnelStepRow[]>();
  if (stepsError) throw new Error(stepsError.message);

  const existingKeys = new Set((existingSteps ?? []).map((step) => step.step_key));
  const missing = definition.steps
    .map((step, index) => ({ step, index }))
    .filter(({ step }) => !existingKeys.has(step.key));
  if (missing.length) {
    const { error } = await supabase.from("funnel_steps").insert(
      missing.map(({ step, index }) => ({
        organization_id: connection.organization_id,
        funnel_id: funnel.id,
        step_key: step.key,
        step_order: index + 1,
        title: step.title,
        ai_agent_id: step.agentId,
      })),
    );
    if (error) throw new Error(error.message);
  }

  const { data: steps, error: finalError } = await supabase
    .from("funnel_steps")
    .select("id,organization_id,funnel_id,step_key,step_order,title,status,url,notes,assigned_to,ai_agent_id,metadata,updated_at")
    .eq("funnel_id", funnel.id)
    .order("step_order", { ascending: true })
    .returns<FunnelStepRow[]>();
  if (finalError) throw new Error(finalError.message);

  return { funnel, steps: steps ?? [] };
}

function formatFunnelStatus(funnelType: "book-a-call", steps: FunnelStepRow[]) {
  const definition = FUNNEL_DEFINITIONS[funnelType];
  const done = steps.filter((step) => step.status === "done").length;
  return [
    `${definition.name}: ${done}/${steps.length} complete`,
    "",
    ...steps.map((step) => {
      const url = step.url ? ` | ${step.url}` : "";
      const assigned = step.assigned_to ? ` | DRI: ${step.assigned_to}` : "";
      return `${step.step_order}. ${step.title}: ${step.status}${assigned}${url}`;
    }),
  ].join("\n");
}

async function updateFunnelField(
  supabase: SupabaseClient,
  connection: IntegrationConnection,
  funnelType: "book-a-call",
  stepKey: string,
  field: string,
  value: string,
) {
  const { steps } = await ensureFunnelForCommand(supabase, connection, funnelType);
  const step = steps.find((candidate) => candidate.step_key === stepKey);
  if (!step) return `Unknown ${funnelType} step: ${stepKey}`;

  const normalizedField = field === "dri" ? "assigned_to" : field;
  if (!["status", "url", "notes", "assigned_to"].includes(normalizedField)) {
    return "Use one of these funnel step fields: status, url, notes, assigned_to, dri.";
  }
  if (normalizedField === "status" && !["not_started", "in_progress", "done"].includes(value)) {
    return "Status must be not_started, in_progress, or done.";
  }

  const { error } = await supabase
    .from("funnel_steps")
    .update({ [normalizedField]: value })
    .eq("id", step.id)
    .eq("organization_id", connection.organization_id);
  if (error) throw new Error(error.message);
  return `Saved ${step.title} ${normalizedField}.`;
}

async function listLearnings(supabase: SupabaseClient, organizationId: string) {
  const { data, error } = await supabase
    .from("learning_items")
    .select("title,body,category,source_provider,updated_at")
    .eq("tenant_id", organizationId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(10);

  if (error) throw new Error(error.message);
  if (!data?.length) return "No AI agent memory saved yet.";

  return [
    "Saved AI agent memory",
    ...data.map((item, index) => {
      const body = item.body ? ` - ${item.body}` : "";
      return `${index + 1}. ${item.title}${body}`;
    }),
  ].join("\n");
}

async function listAgentRequests(
  supabase: SupabaseClient,
  connection: IntegrationConnection,
  options: CommandOptions,
) {
  const role = await getIntegrationActorRole(supabase, connection);
  if (!canUseAgent(role) || !isConnectionActor(connection, options.externalUserId)) {
    return "Owner or admin access is required to use the AI Agent from Slack or Telegram.";
  }

  const { data, error } = await supabase
    .from("agent_requests")
    .select("id,status,risk_level,request_text,created_at")
    .eq("tenant_id", connection.organization_id)
    .order("created_at", { ascending: false })
    .limit(5)
    .returns<AgentRequestRow[]>();

  if (error) throw new Error(error.message);
  if (!data?.length) return "No AI Agent requests yet.";

  return [
    "Recent AI Agent requests",
    ...data.map((request) => {
      const created = new Date(request.created_at).toLocaleString();
      return `${shortId(request.id)}: ${request.status} (${request.risk_level}) - ${request.request_text} - ${created}`;
    }),
  ].join("\n");
}

async function loadAgentRequestByPrefix(
  supabase: SupabaseClient,
  connection: IntegrationConnection,
  prefix: string,
) {
  const normalizedPrefix = prefix.trim().toLowerCase();
  if (!/^[0-9a-f-]{4,36}$/i.test(normalizedPrefix)) {
    return { error: "Use the request id shown in /agent status." };
  }

  const { data, error } = await supabase
    .from("agent_requests")
    .select("id,status,risk_level,request_text,created_at,source_provider,metadata")
    .eq("tenant_id", connection.organization_id)
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<AgentRequestRow[]>();

  if (error) throw new Error(error.message);

  const matches = (data ?? []).filter((request) =>
    request.id.toLowerCase().startsWith(normalizedPrefix),
  );

  if (!matches.length) return { error: `No AI Agent request matched ${prefix}.` };
  if (matches.length > 1) return { error: `Multiple requests match ${prefix}. Use more of the id.` };
  return { request: matches[0] };
}

async function showAgentRequestFromCommand(
  supabase: SupabaseClient,
  connection: IntegrationConnection,
  requestId: string,
  options: CommandOptions,
) {
  const role = await getIntegrationActorRole(supabase, connection);
  if (!canUseAgent(role) || !isConnectionActor(connection, options.externalUserId)) {
    return "Owner or admin access is required to read AI Agent requests from Slack or Telegram.";
  }

  const result = await loadAgentRequestByPrefix(supabase, connection, requestId);
  if (result.error) return result.error;
  const request = result.request;
  if (!request) return "AI Agent request was not found.";

  return [
    `AI Agent request ${shortId(request.id)}`,
    `Status: ${request.status}`,
    `Risk: ${request.risk_level}`,
    `Source: ${request.source_provider ?? "web"}`,
    `Request: ${request.request_text}`,
  ].join("\n");
}

async function createAgentRequestFromCommand(
  supabase: SupabaseClient,
  connection: IntegrationConnection,
  rawText: string,
  options: CommandOptions,
) {
  const role = await getIntegrationActorRole(supabase, connection);
  if (!canUseAgent(role) || !isConnectionActor(connection, options.externalUserId)) {
    return "Owner or admin access is required to create AI Agent requests from Slack or Telegram.";
  }

  const { requestText, riskLevel } = parseAgentRequest(rawText);
  if (!requestText) {
    return "Add the work you want after /agent request.";
  }

  const { data, error } = await supabase
    .from("agent_requests")
    .insert({
      tenant_id: connection.organization_id,
      requested_by_user_id: connection.created_by,
      source_provider: connection.provider,
      request_text: requestText,
      risk_level: riskLevel,
      status: "pending",
      metadata: {
        source: "integration_command",
        provider: connection.provider,
        connectionId: connection.id,
        externalTeamId: connection.external_team_id,
        externalChannelId: connection.external_channel_id,
        externalUserId: options.externalUserId ?? connection.external_user_id,
      },
    })
    .select("id,status,risk_level,request_text,created_at")
    .single<AgentRequestRow>();

  if (error) throw new Error(error.message);

  await auditIntegrationAgentAction(
    supabase,
    connection,
    "agent.request.created_from_integration",
    data.id,
    { riskLevel },
  );

  const approvalNote = riskLevel === "high"
    ? " High-risk requests stay pending until approved in Settings > AI Agent."
    : " Review it in Settings > AI Agent.";

  return `AI Agent request created: ${shortId(data.id)} (${data.status}, ${data.risk_level}).${approvalNote}`;
}

async function editAgentRequestFromCommand(
  supabase: SupabaseClient,
  connection: IntegrationConnection,
  requestId: string,
  rawText: string,
  options: CommandOptions,
) {
  const role = await getIntegrationActorRole(supabase, connection);
  if (!canUseAgent(role) || !isConnectionActor(connection, options.externalUserId)) {
    return "Owner or admin access is required to edit AI Agent requests from Slack or Telegram.";
  }

  const { requestText, riskLevel } = parseAgentRequest(rawText);
  if (!requestText) return "Add the updated request after /agent edit request-id.";

  const lookup = await loadAgentRequestByPrefix(supabase, connection, requestId);
  if (lookup.error) return lookup.error;
  const request = lookup.request;
  if (!request) return "AI Agent request was not found.";
  if (!["pending", "approved"].includes(request.status)) {
    return `Request ${shortId(request.id)} is ${request.status} and cannot be edited from chat.`;
  }

  const { data, error } = await supabase
    .from("agent_requests")
    .update({
      request_text: requestText,
      risk_level: riskLevel,
      status: request.status === "approved" ? "pending" : request.status,
      metadata: {
        ...(request.metadata ?? {}),
        lastEditedFrom: connection.provider,
        lastEditedByExternalUserId: options.externalUserId ?? connection.external_user_id,
        lastEditedAt: new Date().toISOString(),
      },
    })
    .eq("id", request.id)
    .eq("tenant_id", connection.organization_id)
    .select("id,status,risk_level,request_text,created_at")
    .single<AgentRequestRow>();

  if (error) throw new Error(error.message);

  await auditIntegrationAgentAction(
    supabase,
    connection,
    "agent.request.edited_from_integration",
    data.id,
    { riskLevel },
  );

  return `Updated AI Agent request ${shortId(data.id)}. Status: ${data.status}.`;
}

async function approveAgentRequestFromCommand(
  supabase: SupabaseClient,
  connection: IntegrationConnection,
  requestId: string,
  options: CommandOptions,
) {
  const role = await getIntegrationActorRole(supabase, connection);
  if (!canUseAgent(role) || !isConnectionActor(connection, options.externalUserId)) {
    return "Owner or admin access is required to approve AI Agent requests from Slack or Telegram.";
  }

  const lookup = await loadAgentRequestByPrefix(supabase, connection, requestId);
  if (lookup.error) return lookup.error;
  const request = lookup.request;
  if (!request) return "AI Agent request was not found.";
  if (request.status !== "pending") {
    return `Request ${shortId(request.id)} is ${request.status}, so it cannot be approved.`;
  }

  const { error } = await supabase
    .from("agent_requests")
    .update({ status: "approved" })
    .eq("id", request.id)
    .eq("tenant_id", connection.organization_id);

  if (error) throw new Error(error.message);

  await supabase.from("agent_approvals").insert({
    tenant_id: connection.organization_id,
    request_id: request.id,
    approved_by_user_id: connection.created_by,
    status: "approved",
    notes: `${connection.provider} approval`,
  });

  await auditIntegrationAgentAction(
    supabase,
    connection,
    "agent.request.approved_from_integration",
    request.id,
  );

  return `Approved AI Agent request ${shortId(request.id)}.`;
}

async function cancelAgentRequestFromCommand(
  supabase: SupabaseClient,
  connection: IntegrationConnection,
  requestId: string,
  options: CommandOptions,
) {
  const role = await getIntegrationActorRole(supabase, connection);
  if (!canUseAgent(role) || !isConnectionActor(connection, options.externalUserId)) {
    return "Owner or admin access is required to cancel AI Agent requests from Slack or Telegram.";
  }

  const lookup = await loadAgentRequestByPrefix(supabase, connection, requestId);
  if (lookup.error) return lookup.error;
  const request = lookup.request;
  if (!request) return "AI Agent request was not found.";
  if (["completed", "cancelled"].includes(request.status)) {
    return `Request ${shortId(request.id)} is already ${request.status}.`;
  }

  const { error } = await supabase
    .from("agent_requests")
    .update({ status: "cancelled" })
    .eq("id", request.id)
    .eq("tenant_id", connection.organization_id);

  if (error) throw new Error(error.message);

  await auditIntegrationAgentAction(
    supabase,
    connection,
    "agent.request.cancelled_from_integration",
    request.id,
  );

  return `Cancelled AI Agent request ${shortId(request.id)}.`;
}

async function formatOutputs(supabase: SupabaseClient, organizationId: string) {
  const { data, error } = await supabase
    .from("funnel_ai_outputs")
    .select("agent_id,asset_key,status,created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw new Error(error.message);
  if (!data?.length) return "No AI outputs saved yet.";
  return [
    "Recent AI outputs",
    ...data.map((row) => `${row.asset_key ?? row.agent_id}: ${row.status} (${new Date(row.created_at).toLocaleString()})`),
  ].join("\n");
}

export async function handleHyperoptimalCommand(
  supabase: SupabaseClient,
  connection: IntegrationConnection,
  rawText: string,
  options: CommandOptions = {},
): Promise<CommandResult> {
  const text = normalizeCommand(rawText);
  if (!text || text === "help") return { command: "help", text: HELP_TEXT };

  const lower = text.toLowerCase();

  if (lower === "company" || lower === "context" || lower === "ai-context" || lower === "ai_company") {
    const context = await loadCompanyContext(supabase, connection.organization_id);
    const summary = companyContextToText(context?.data ?? DEFAULT_COMPANY_CONTEXT);
    return { command: "context", text: summary || "No AI Context Document content saved yet." };
  }

  if (lower === "agent" || lower === "agent help" || lower === "ai agent") {
    return { command: "agent_help", text: HELP_TEXT };
  }

  if (lower === "agent status" || lower === "agent requests" || lower === "ai status") {
    return { command: "agent_status", text: await listAgentRequests(supabase, connection, options) };
  }

  const agentShowMatch = text.match(/^(?:agent|ai)\s+(?:show|read|view)\s+(\S+)$/i);
  if (agentShowMatch) {
    return {
      command: "agent_show",
      text: await showAgentRequestFromCommand(supabase, connection, agentShowMatch[1], options),
    };
  }

  const agentEditMatch = text.match(/^(?:agent|ai)\s+edit\s+(\S+)\s+([\s\S]+)$/i);
  if (agentEditMatch) {
    return {
      command: "agent_edit",
      text: await editAgentRequestFromCommand(
        supabase,
        connection,
        agentEditMatch[1],
        agentEditMatch[2],
        options,
      ),
      status: "saved",
    };
  }

  const agentApproveMatch = text.match(/^(?:agent|ai)\s+approve\s+(\S+)$/i);
  if (agentApproveMatch) {
    return {
      command: "agent_approve",
      text: await approveAgentRequestFromCommand(
        supabase,
        connection,
        agentApproveMatch[1],
        options,
      ),
      status: "saved",
    };
  }

  const agentCancelMatch = text.match(/^(?:agent|ai)\s+cancel\s+(\S+)$/i);
  if (agentCancelMatch) {
    return {
      command: "agent_cancel",
      text: await cancelAgentRequestFromCommand(
        supabase,
        connection,
        agentCancelMatch[1],
        options,
      ),
      status: "saved",
    };
  }

  const agentRequestMatch = text.match(/^(?:agent|ai)\s+(?:request|task|run|do)\s+([\s\S]+)$/i);
  if (agentRequestMatch) {
    return {
      command: "agent_request",
      text: await createAgentRequestFromCommand(supabase, connection, agentRequestMatch[1], options),
      status: "saved",
    };
  }

  const directAgentMatch = text.match(/^(?:agent|ai)\s+([\s\S]+)$/i);
  if (directAgentMatch) {
    return {
      command: "agent_request",
      text: await createAgentRequestFromCommand(supabase, connection, directAgentMatch[1], options),
      status: "saved",
    };
  }

  if (lower === "memory" || lower === "agent-memory" || lower === "learning" || lower === "learnings") {
    return { command: "learnings", text: await listLearnings(supabase, connection.organization_id) };
  }

  const learningMatch = text.match(/^(?:remember|memory|agent-memory|learning)\s+([\s\S]+)$/i);
  if (learningMatch) {
    const result = await handleAgentConversation({
      supabase,
      organizationId: connection.organization_id,
      actorUserId: connection.created_by,
      provider: connection.provider,
      message: `remember ${learningMatch[1]}`,
      sourceLabel: connection.provider === "slack" ? "Slack" : "Telegram",
      sourceChannelId: connection.external_channel_id,
      sourceUserId: options.externalUserId ?? connection.external_user_id,
    });
    return {
      command: result.command,
      text: result.text,
      status: result.status,
    };
  }

  const funnelToken = canonicalFunnelToken(text);
  if (funnelToken === "book-a-call") {
    const { steps } = await ensureFunnelForCommand(supabase, connection, "book-a-call");
    return { command: "book-a-call", text: formatFunnelStatus("book-a-call", steps) };
  }

  if (lower === "book a call" || lower === "book-a-call funnel" || lower === "book_a_call") {
    const { steps } = await ensureFunnelForCommand(supabase, connection, "book-a-call");
    return { command: "book-a-call", text: formatFunnelStatus("book-a-call", steps) };
  }

  if (lower === "outputs") {
    return { command: "outputs", text: await formatOutputs(supabase, connection.organization_id) };
  }

  if (lower.startsWith("run ")) {
    return {
      command: "run",
      text: "Paid launches can only be started inside the app in V1. Use /outputs to fetch saved assets.",
      status: "ignored",
    };
  }

  if (lower.startsWith("set company ") || lower.startsWith("set context ")) {
    const match = text.match(/^set\s+(?:company|context)\s+(\S+)\s+([\s\S]+)$/i);
    if (!match) return { command: "set_context", text: "Use `/set context companyName Example Co`." };
    return {
      command: "set_context",
      text: await upsertCompanyContextField(supabase, connection, match[1], match[2].trim()),
    };
  }

  if (lower.startsWith("set ")) {
    const match = text.match(/^set\s+(\S+)\s+(\S+)\s+(\S+)\s+([\s\S]+)$/i);
    if (!match) {
      return {
        command: "set_funnel",
        text: "Use `/set context companyName Example Co` for workspace updates.",
      };
    }
    const funnelType = canonicalFunnelToken(match[1]);
    if (funnelType !== "book-a-call") {
      return { command: "set_funnel", text: "That workspace command is not available." };
    }
    return {
      command: "set_funnel",
      text: await updateFunnelField(supabase, connection, "book-a-call", match[2], match[3], match[4].trim()),
    };
  }

  const result = await handleAgentConversation({
    supabase,
    organizationId: connection.organization_id,
    actorUserId: connection.created_by,
    provider: connection.provider,
    message: text,
    sourceLabel: connection.provider === "slack" ? "Slack" : "Telegram",
    sourceChannelId: connection.external_channel_id,
    sourceUserId: options.externalUserId ?? connection.external_user_id,
  });
  return {
    command: result.command,
    text: result.text,
    status: result.status,
  };
}
