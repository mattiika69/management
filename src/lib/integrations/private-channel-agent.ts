import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveIntegrationAgentContext } from "@/lib/agent/platform-context";
import { runAgent } from "@/lib/agent/runner";
import {
  saveIntegrationMessage,
  type IntegrationConnection,
} from "@/lib/integrations/connections";

export type PrivateChannelProvider = "slack" | "telegram";

export type PrivateChannelAgentInput = {
  provider: PrivateChannelProvider;
  externalTeamId?: string | null;
  externalChannelId: string;
  externalUserId?: string | null;
  externalUserName?: string | null;
  text: string;
  eventId?: string | null;
  messageId?: string | null;
  threadId?: string | null;
  payload?: Record<string, unknown>;
  source: "event" | "command" | "webhook";
};

export type PrivateChannelAgentResult = {
  ok: boolean;
  organizationId: string;
  externalChannelId: string;
  text: string;
  command: string;
  status: "saved" | "sent" | "failed" | "ignored" | "needs_confirmation";
};

const HELP_TEXT = [
  "HyperOptimal Management agent",
  "Ask naturally, or use: help, status, summarize today, find <name>, show metrics.",
  "To save durable AI Agent memory, say: remember Title | What the agent should remember.",
  "High-risk changes require confirmation inside the app.",
].join("\n");

function normalizeMessage(input: PrivateChannelAgentInput) {
  let text = input.text.trim();
  if (input.provider === "slack") {
    text = text
      .replace(/^<@[A-Z0-9]+>\s*/i, "")
      .replace(/^\/[a-z0-9_-]+\s*/i, "");
  } else {
    text = text.replace(/^\/([a-z0-9_-]+)@[a-z0-9_]+\b/i, "/$1");
  }

  return text
    .replace(/^(?:app|bot)\s*:\s*/i, "")
    .replace(/^\//, "")
    .trim();
}

async function auditAgentAction(
  supabase: SupabaseClient,
  connection: IntegrationConnection,
  input: PrivateChannelAgentInput,
  action: string,
  metadata: Record<string, unknown> = {},
) {
  await supabase.from("admin_audit_log").insert({
    tenant_id: connection.organization_id,
    actor_user_id: connection.created_by,
    action,
    target_table: "integration_messages",
    target_id: input.messageId ?? input.eventId ?? null,
    metadata: {
      provider: input.provider,
      externalTeamId: input.externalTeamId,
      externalChannelId: input.externalChannelId,
      externalUserId: input.externalUserId,
      externalUserName: input.externalUserName,
      source: input.source,
      ...metadata,
    },
  });
}

export async function handlePrivateChannelAgentMessage(
  supabase: SupabaseClient,
  connection: IntegrationConnection,
  input: PrivateChannelAgentInput,
): Promise<PrivateChannelAgentResult> {
  await saveIntegrationMessage(supabase, {
    connection,
    direction: "inbound",
    externalUserId: input.externalUserId ?? undefined,
    externalMessageId: input.messageId ?? input.eventId ?? undefined,
    messageText: input.text,
    payload: input.payload ?? {},
  });

  const text = normalizeMessage(input);
  const organizationId = connection.organization_id;

  if (!text) {
    return {
      ok: true,
      organizationId,
      externalChannelId: input.externalChannelId,
      text: HELP_TEXT,
      command: "help",
      status: "sent",
    };
  }

  try {
    const resolved = await resolveIntegrationAgentContext(supabase, connection, {
      platform: input.provider,
      externalTeamId: input.externalTeamId,
      externalChannelId: input.externalChannelId,
      externalThreadId: input.threadId,
      externalUserId: input.externalUserId,
      externalUserName: input.externalUserName,
      conversationType: input.threadId ? "thread" : input.provider === "telegram" ? "group" : "channel",
    });

    if (!resolved.ok) {
      return {
        ok: false,
        organizationId,
        externalChannelId: input.externalChannelId,
        text: resolved.text,
        command: "account_link_required",
        status: resolved.status ?? "ignored",
      };
    }

    const result = await runAgent({
      context: resolved.context,
      message: text,
      externalMessageId: input.messageId ?? input.eventId ?? null,
      payload: input.payload ?? {},
    });

    return {
      ok: result.ok,
      organizationId,
      externalChannelId: input.externalChannelId,
      text: result.text,
      command: result.command,
      status: result.status,
    };
  } catch (error) {
    await auditAgentAction(supabase, connection, input, "agent.command.failed", {
      error: error instanceof Error ? error.message : "Unknown agent error",
    });

    return {
      ok: false,
      organizationId,
      externalChannelId: input.externalChannelId,
      text: "I could not complete that request. Try again or open the app if it keeps failing.",
      command: "agent_failed",
      status: "failed",
    };
  }
}
