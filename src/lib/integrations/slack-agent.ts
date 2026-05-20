import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  loadIntegrationSecret,
  saveIntegrationMessage,
  upsertIntegrationConnection,
  type IntegrationConnection,
} from "@/lib/integrations/connections";
import {
  handlePrivateChannelAgentMessage,
  type PrivateChannelAgentResult,
} from "@/lib/integrations/private-channel-agent";

type SlackChannelMapping = {
  id: string;
  tenant_id: string;
  organization_id: string;
  slack_team_id: string;
  slack_channel_id: string;
  slack_channel_name: string | null;
  enabled: boolean;
  created_by_user_id: string | null;
};

type SlackAgentInput = {
  teamId: string;
  channelId: string;
  channelName?: string | null;
  userId?: string | null;
  userName?: string | null;
  text: string;
  eventId?: string | null;
  messageId?: string | null;
  threadTs?: string | null;
  payload?: Record<string, unknown>;
  source: "event" | "command";
};

export type SlackAgentResult = {
  ok: boolean;
  ignored?: boolean;
  organizationId?: string;
  channelId: string;
  text: string;
  command?: string;
  status?: "saved" | "sent" | "failed" | "ignored" | "needs_confirmation";
  botToken?: string | null;
};

export function isPrefixedSlackMessage(rawText: string) {
  return /^(?:app|bot)\s*:/i.test(rawText.trim());
}

function buildUnconfiguredMessage(teamId: string, channelId: string) {
  return [
    "This Slack channel is not connected to HyperOptimal Management yet.",
    `Team: ${teamId}`,
    `Channel: ${channelId}`,
    "Add this team/channel to Settings > Integrations or the `slack_channels` Supabase table, then try again.",
  ].join("\n");
}

function integrationStatus(status: PrivateChannelAgentResult["status"]) {
  if (status === "needs_confirmation") return "ignored";
  return status === "saved" || status === "sent" || status === "failed" || status === "ignored"
    ? status
    : "sent";
}

async function resolveSlackChannel(
  supabase: SupabaseClient,
  input: Pick<SlackAgentInput, "teamId" | "channelId">,
) {
  const allowedTeamId = process.env.SLACK_ALLOWED_TEAM_ID?.trim();
  const allowedChannelId = process.env.SLACK_ALLOWED_CHANNEL_ID?.trim();

  if (allowedTeamId && input.teamId !== allowedTeamId) {
    return { error: "This Slack workspace is not allowed for this app." };
  }

  if (allowedChannelId && input.channelId !== allowedChannelId) {
    return { error: "This Slack channel is not allowed for this app." };
  }

  const { data: mapping, error } = await supabase
    .from("slack_channels")
    .select("id,tenant_id,organization_id,slack_team_id,slack_channel_id,slack_channel_name,enabled,created_by_user_id")
    .eq("slack_team_id", input.teamId)
    .eq("slack_channel_id", input.channelId)
    .eq("enabled", true)
    .maybeSingle<SlackChannelMapping>();

  if (error) throw new Error(error.message);
  if (!mapping) {
    return { error: buildUnconfiguredMessage(input.teamId, input.channelId) };
  }

  const connection: IntegrationConnection = await upsertIntegrationConnection(supabase, {
    organizationId: mapping.organization_id,
    provider: "slack",
    externalTeamId: input.teamId,
    externalChannelId: input.channelId,
    externalUserId: null,
    displayName: mapping.slack_channel_name ?? input.channelId,
    createdBy: mapping.created_by_user_id,
    config: {
      slack_channel_name: mapping.slack_channel_name,
      slack_channel_mapping_id: mapping.id,
    },
  });

  const botToken =
    (await loadIntegrationSecret(supabase, mapping.organization_id, "slack", "bot_token")) ??
    process.env.SLACK_BOT_TOKEN ??
    null;

  return { mapping, connection, botToken };
}

export async function handleSlackAgentMessage(
  supabase: SupabaseClient,
  input: SlackAgentInput,
): Promise<SlackAgentResult> {
  const resolved = await resolveSlackChannel(supabase, input);
  if ("error" in resolved) {
    return {
      ok: false,
      channelId: input.channelId,
      text: resolved.error ?? "This Slack channel is not connected to HyperOptimal Management.",
      status: "ignored",
    };
  }

  const result = await handlePrivateChannelAgentMessage(supabase, resolved.connection, {
    provider: "slack",
    externalTeamId: input.teamId,
    externalChannelId: input.channelId,
    externalUserId: input.userId,
    externalUserName: input.userName,
    text: input.text,
    eventId: input.eventId,
    messageId: input.messageId,
    threadId: input.threadTs,
    payload: input.payload,
    source: input.source,
  });

  await saveIntegrationMessage(supabase, {
    connection: resolved.connection,
    direction: "outbound",
    externalUserId: input.userId ?? undefined,
    externalMessageId: input.threadTs ?? input.eventId ?? input.messageId ?? undefined,
    messageText: result.text,
    payload: {
      source: input.source,
      ok: result.ok,
      command: result.command,
      status: result.status,
    },
    command: result.command,
    status: integrationStatus(result.status),
  });

  return {
    ok: result.ok,
    organizationId: result.organizationId,
    channelId: input.channelId,
    text: result.text,
    command: result.command,
    status: result.status,
    botToken: resolved.botToken,
  };
}
