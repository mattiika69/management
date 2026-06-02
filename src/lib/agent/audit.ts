import "server-only";
import type { AgentContext } from "@/lib/agent/types";

export async function writeAgentAudit(
  context: AgentContext,
  input: {
    action: string;
    targetTable?: string | null;
    targetId?: string | null;
    before?: unknown;
    after?: unknown;
    metadata?: Record<string, unknown>;
  },
) {
  const payload = {
    tenant_id: context.organizationId,
    organization_id: context.organizationId,
    actor_user_id: context.actorUserId,
    actor_platform: context.platform,
    external_actor_id: context.externalUserId ?? null,
    action: input.action,
    target_table: input.targetTable ?? null,
    target_id: input.targetId ?? null,
    before_values: input.before ?? null,
    after_values: input.after ?? null,
    metadata: {
      externalTeamId: context.externalTeamId ?? null,
      externalChannelId: context.externalChannelId ?? null,
      externalThreadId: context.externalThreadId ?? null,
      sourceLabel: context.sourceLabel ?? null,
      ...(input.metadata ?? {}),
    },
  };

  await Promise.all([
    context.supabase.from("audit_logs").insert(payload),
    context.supabase.from("admin_audit_log").insert({
      tenant_id: context.organizationId,
      actor_user_id: context.actorUserId,
      action: input.action,
      target_table: input.targetTable ?? null,
      target_id: input.targetId ?? null,
      metadata: payload.metadata,
    }),
  ]);
}

export async function recordCapabilityCheck(
  context: AgentContext,
  input: {
    capability: string;
    allowed: boolean;
    reason?: string | null;
    targetType?: string | null;
    targetId?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  await context.supabase.from("capability_checks").insert({
    tenant_id: context.organizationId,
    organization_id: context.organizationId,
    platform: context.platform,
    capability: input.capability,
    target_type: input.targetType ?? null,
    target_id: input.targetId ?? null,
    allowed: input.allowed,
    reason: input.reason ?? null,
    checked_by_user_id: context.actorUserId,
    metadata: input.metadata ?? {},
  });
}

export async function saveAgentMessage(
  context: AgentContext,
  input: {
    role: "user" | "assistant" | "tool" | "system";
    content: string;
    externalMessageId?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const { data, error } = await context.supabase
    .from("agent_messages")
    .insert({
      tenant_id: context.organizationId,
      organization_id: context.organizationId,
      conversation_id: context.conversationId ?? null,
      platform: context.platform,
      role: input.role,
      actor_user_id: context.actorUserId,
      external_user_id: context.externalUserId ?? null,
      external_message_id: input.externalMessageId ?? null,
      content: input.content,
      metadata: input.metadata ?? {},
    })
    .select("id")
    .single<{ id: string }>();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function recordToolRun(
  context: AgentContext,
  input: {
    messageId?: string | null;
    toolName: string;
    allowed: boolean;
    status: string;
    input: Record<string, unknown>;
    output?: unknown;
    errorMessage?: string | null;
    requiresConfirmation?: boolean;
    approvalId?: string | null;
    targetTable?: string | null;
    targetId?: string | null;
    before?: unknown;
    after?: unknown;
  },
) {
  await context.supabase.from("agent_tool_runs").insert({
    tenant_id: context.organizationId,
    conversation_id: context.conversationId ?? null,
    message_id: input.messageId ?? null,
    platform: context.platform,
    actor_user_id: context.actorUserId,
    tool_name: input.toolName,
    allowed: input.allowed,
    status: input.status,
    input_metadata: input.input,
    output_metadata: input.output ?? {},
    error_message: input.errorMessage ?? null,
    requires_confirmation: Boolean(input.requiresConfirmation),
    approval_id: input.approvalId ?? null,
    target_table: input.targetTable ?? null,
    target_id: input.targetId ?? null,
    before_values: input.before ?? null,
    after_values: input.after ?? null,
  });
}
