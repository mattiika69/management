import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  handleHyperoptimalCommand,
} from "@/lib/integrations/hyperoptimal-commands";
import {
  loadIntegrationSecret,
  type IntegrationConnection,
} from "@/lib/integrations/connections";

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

const HELP_TEXT = [
  "HyperOptimal Management Slack bot",
  "Use `help`, `status`, `summarize today`, `find <name>`, `show metrics`, or `save Title | What to remember`.",
  "In a private channel, start normal messages with `app:` or `bot:`. Mentions can be plain: `@bot status`.",
].join("\n");

function normalizeSlackText(rawText: string) {
  return rawText
    .replace(/^<@[A-Z0-9]+>\s*/i, "")
    .replace(/^\/[a-z0-9_-]+\s*/i, "")
    .replace(/^(?:app|bot)\s*:\s*/i, "")
    .trim();
}

export function isPrefixedSlackMessage(rawText: string) {
  return /^(?:app|bot)\s*:/i.test(rawText.trim());
}

function isHighRiskCommand(text: string) {
  return /^(?:agent|ai)\s+(?:approve|cancel|edit)\b/i.test(text)
    || /^set\s+/i.test(text)
    || /^run\s+/i.test(text)
    || /^(?:delete|remove|archive|disconnect|revoke|cancel)\b/i.test(text);
}

function buildUnconfiguredMessage(teamId: string, channelId: string) {
  return [
    "This Slack channel is not connected to HyperOptimal Management yet.",
    `Team: ${teamId}`,
    `Channel: ${channelId}`,
    "Add this team/channel to Settings > Integrations or the `slack_channels` Supabase table, then try again.",
  ].join("\n");
}

async function getCount(
  supabase: SupabaseClient,
  table: string,
  organizationId: string,
  options: { statusColumn?: string; statusValue?: string; archived?: boolean } = {},
) {
  let query = supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", organizationId);

  if (options.archived !== false) {
    query = query.is("archived_at", null);
  }

  if (options.statusColumn && options.statusValue) {
    query = query.eq(options.statusColumn, options.statusValue);
  }

  const { count, error } = await query;
  if (error) return 0;
  return count ?? 0;
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

  const { data: connection } = await supabase
    .from("integration_connections")
    .select("id,organization_id,provider,external_team_id,external_channel_id,external_user_id,created_by")
    .eq("provider", "slack")
    .eq("organization_id", mapping.organization_id)
    .eq("external_team_id", input.teamId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<IntegrationConnection>();

  const resolvedConnection: IntegrationConnection = connection
    ? {
        ...connection,
        external_channel_id: input.channelId,
        external_user_id: null,
        created_by: mapping.created_by_user_id ?? connection.created_by,
      }
    : {
        id: mapping.id,
        organization_id: mapping.organization_id,
        provider: "slack",
        external_team_id: input.teamId,
        external_channel_id: input.channelId,
        external_user_id: null,
        created_by: mapping.created_by_user_id,
      };

  const botToken =
    (await loadIntegrationSecret(supabase, mapping.organization_id, "slack", "bot_token")) ??
    process.env.SLACK_BOT_TOKEN ??
    null;

  return { mapping, connection: resolvedConnection, botToken };
}

async function recordMessage(
  supabase: SupabaseClient,
  input: SlackAgentInput & { organizationId: string; responseText: string; command?: string; status?: string; error?: string | null },
) {
  await supabase.from("slack_agent_messages").insert({
    tenant_id: input.organizationId,
    organization_id: input.organizationId,
    slack_team_id: input.teamId,
    slack_channel_id: input.channelId,
    slack_user_id: input.userId ?? null,
    slack_user_name: input.userName ?? null,
    message_text: input.text,
    response_text: input.responseText,
    command: input.command ?? null,
    status: input.status ?? "sent",
    error: input.error ?? null,
    payload: input.payload ?? {},
  });
}

async function recordAction(
  supabase: SupabaseClient,
  input: SlackAgentInput & {
    organizationId: string;
    actionType: string;
    resultText: string;
    status: "saved" | "sent" | "failed" | "ignored" | "needs_confirmation";
    requiresConfirmation?: boolean;
    error?: string | null;
  },
) {
  const actionPayload = {
    tenant_id: input.organizationId,
    organization_id: input.organizationId,
    slack_team_id: input.teamId,
    slack_channel_id: input.channelId,
    slack_user_id: input.userId ?? null,
    slack_user_name: input.userName ?? null,
    action_type: input.actionType,
    input: {
      text: input.text,
      eventId: input.eventId,
      messageId: input.messageId,
      source: input.source,
    },
    result: { text: input.resultText },
    status: input.status,
    error: input.error ?? null,
    requires_confirmation: input.requiresConfirmation ?? false,
  };

  const { data } = await supabase
    .from("slack_agent_actions")
    .insert(actionPayload)
    .select("id")
    .maybeSingle<{ id: string }>();

  await supabase.from("slack_action_audit_logs").insert({
    tenant_id: input.organizationId,
    organization_id: input.organizationId,
    actor_type: "slack_user",
    actor_id: input.userId ?? "unknown",
    slack_team_id: input.teamId,
    slack_channel_id: input.channelId,
    slack_user_id: input.userId ?? null,
    action: input.actionType,
    target_type: "slack_agent_action",
    target_id: data?.id ?? null,
    metadata: {
      source: input.source,
      status: input.status,
      requiresConfirmation: input.requiresConfirmation ?? false,
    },
  });
}

async function buildStatus(supabase: SupabaseClient, organizationId: string) {
  const [
    activeMembers,
    pendingInvites,
    employees,
    meetings,
    trainings,
    learnings,
  ] = await Promise.all([
    supabase
      .from("tenant_memberships")
      .select("user_id", { count: "exact", head: true })
      .eq("tenant_id", organizationId)
      .is("archived_at", null),
    supabase
      .from("tenant_invitations")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", organizationId)
      .is("accepted_at", null)
      .is("revoked_at", null),
    getCount(supabase, "employees", organizationId),
    getCount(supabase, "meetings", organizationId),
    getCount(supabase, "management_training_programs", organizationId),
    getCount(supabase, "learning_items", organizationId),
  ]);

  return [
    "HyperOptimal Management status",
    `Team members: ${activeMembers.count ?? 0}`,
    `Pending invites: ${pendingInvites.count ?? 0}`,
    `Employees: ${employees}`,
    `Meetings: ${meetings}`,
    `Training programs: ${trainings}`,
    `AI Agent learnings: ${learnings}`,
  ].join("\n");
}

async function buildSummary(supabase: SupabaseClient, organizationId: string) {
  const { data: learnings } = await supabase
    .from("learning_items")
    .select("title,body,source_provider,created_at")
    .eq("tenant_id", organizationId)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: reviews } = await supabase
    .from("management_weekly_reviews")
    .select("subject_name,week_start,start_stop_keep_complete,progress_complete,management_diamond_complete,team_rating_complete,created_at")
    .eq("tenant_id", organizationId)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(5);

  const learningLines = (learnings ?? []).map((item) => `- Learning: ${item.title}`);
  const reviewLines = (reviews ?? []).map((review) => {
    const complete = [
      review.start_stop_keep_complete ? "start/stop/keep" : null,
      review.progress_complete ? "progress" : null,
      review.management_diamond_complete ? "diamond" : null,
      review.team_rating_complete ? "ratings" : null,
    ].filter(Boolean).join(", ") || "not complete";
    return `- ${review.subject_name} week of ${review.week_start}: ${complete}`;
  });

  if (!learningLines.length && !reviewLines.length) {
    return "No recent Management activity found yet.";
  }

  return ["Recent Management activity", ...reviewLines, ...learningLines].join("\n");
}

async function searchRecords(supabase: SupabaseClient, organizationId: string, rawTerm: string) {
  const term = rawTerm.trim();
  if (term.length < 2) return "Search needs at least 2 characters.";
  const pattern = `%${term.replace(/[%_]/g, "\\$&")}%`;

  const [employees, candidates, learnings] = await Promise.all([
    supabase
      .from("employees")
      .select("full_name,email,role_title,employment_status")
      .eq("tenant_id", organizationId)
      .is("archived_at", null)
      .ilike("full_name", pattern)
      .limit(5),
    supabase
      .from("management_hiring_candidates")
      .select("full_name,email,stage,rating")
      .eq("tenant_id", organizationId)
      .is("archived_at", null)
      .ilike("full_name", pattern)
      .limit(5),
    supabase
      .from("learning_items")
      .select("title,body,source_provider")
      .eq("tenant_id", organizationId)
      .is("archived_at", null)
      .ilike("title", pattern)
      .limit(5),
  ]);

  const lines = [
    ...(employees.data ?? []).map((row) => `- Employee: ${row.full_name}${row.role_title ? `, ${row.role_title}` : ""} (${row.employment_status})`),
    ...(candidates.data ?? []).map((row) => `- Candidate: ${row.full_name} (${row.stage})`),
    ...(learnings.data ?? []).map((row) => `- Learning: ${row.title}`),
  ];

  return lines.length ? [`Search results for "${term}"`, ...lines].join("\n") : `No records found for "${term}".`;
}

async function showMetrics(supabase: SupabaseClient, organizationId: string) {
  const [
    employees,
    activeEmployees,
    candidates,
    meetings,
    trainingPrograms,
    calendarConnections,
    zoomConnections,
  ] = await Promise.all([
    getCount(supabase, "employees", organizationId),
    getCount(supabase, "employees", organizationId, { statusColumn: "employment_status", statusValue: "active" }),
    getCount(supabase, "management_hiring_candidates", organizationId),
    getCount(supabase, "meetings", organizationId),
    getCount(supabase, "management_training_programs", organizationId),
    getCount(supabase, "calendar_connections", organizationId),
    getCount(supabase, "zoom_connections", organizationId),
  ]);

  return [
    "Management metrics",
    `Employees: ${employees} (${activeEmployees} active)`,
    `Candidates: ${candidates}`,
    `Meetings: ${meetings}`,
    `Training programs: ${trainingPrograms}`,
    `Calendar connections: ${calendarConnections}`,
    `Zoom connections: ${zoomConnections}`,
  ].join("\n");
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

  const organizationId = resolved.mapping.organization_id;
  const text = normalizeSlackText(input.text);

  if (!text) {
    return {
      ok: true,
      organizationId,
      channelId: input.channelId,
      text: HELP_TEXT,
      command: "help",
      status: "sent",
      botToken: resolved.botToken,
    };
  }

  if (isHighRiskCommand(text)) {
    const responseText = [
      "That action needs confirmation inside HyperOptimal Management before I can run it from Slack.",
      "Open Settings > AI Agent for approvals, destructive actions, or workspace-wide changes.",
    ].join("\n");

    await recordMessage(supabase, {
      ...input,
      organizationId,
      responseText,
      command: "needs_confirmation",
      status: "needs_confirmation",
    });
    await recordAction(supabase, {
      ...input,
      organizationId,
      actionType: "slack.command.requires_confirmation",
      resultText: responseText,
      status: "needs_confirmation",
      requiresConfirmation: true,
    });

    return {
      ok: true,
      organizationId,
      channelId: input.channelId,
      text: responseText,
      command: "needs_confirmation",
      status: "needs_confirmation",
      botToken: resolved.botToken,
    };
  }

  let command = "agent_chat";
  let responseText: string;
  let status: SlackAgentResult["status"] = "sent";

  try {
    const lower = text.toLowerCase();
    if (lower === "help") {
      command = "help";
      responseText = HELP_TEXT;
    } else if (lower === "status") {
      command = "status";
      responseText = await buildStatus(supabase, organizationId);
    } else if (lower === "summarize today" || lower === "summary" || lower === "summarize") {
      command = "summary";
      responseText = await buildSummary(supabase, organizationId);
    } else if (lower === "metrics" || lower === "show metrics") {
      command = "metrics";
      responseText = await showMetrics(supabase, organizationId);
    } else {
      const searchMatch = text.match(/^(?:find|search)\s+(.+)$/i);
      if (searchMatch) {
        command = "search";
        responseText = await searchRecords(supabase, organizationId, searchMatch[1]);
      } else {
        const result = await handleHyperoptimalCommand(supabase, resolved.connection, text, {
          externalUserId: input.userId,
        });
        command = result.command;
        responseText = result.text;
        status = result.status ?? "sent";
      }
    }

    await recordMessage(supabase, {
      ...input,
      organizationId,
      responseText,
      command,
      status,
    });

    if (status === "saved") {
      await recordAction(supabase, {
        ...input,
        organizationId,
        actionType: `slack.command.${command}`,
        resultText: responseText,
        status,
      });
    }

    return {
      ok: true,
      organizationId,
      channelId: input.channelId,
      text: responseText,
      command,
      status,
      botToken: resolved.botToken,
    };
  } catch (error) {
    const responseText = "I could not complete that Slack request. Try again or open the app if it keeps failing.";
    await recordMessage(supabase, {
      ...input,
      organizationId,
      responseText,
      command,
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown Slack agent error",
    });
    await recordAction(supabase, {
      ...input,
      organizationId,
      actionType: `slack.command.${command}`,
      resultText: responseText,
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown Slack agent error",
    });

    return {
      ok: false,
      organizationId,
      channelId: input.channelId,
      text: responseText,
      command,
      status: "failed",
      botToken: resolved.botToken,
    };
  }
}
