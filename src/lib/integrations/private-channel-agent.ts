import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { handleHyperoptimalCommand } from "@/lib/integrations/hyperoptimal-commands";
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

function isHighRiskCommand(text: string) {
  return /^(?:agent|ai)\s+(?:approve|cancel|edit)\b/i.test(text)
    || /^set\s+/i.test(text)
    || /^run\s+/i.test(text)
    || /^(?:delete|remove|archive|disconnect|revoke|cancel)\b/i.test(text);
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

async function loadAgentContextBundle(
  supabase: SupabaseClient,
  connection: IntegrationConnection,
) {
  const [companyContext, training, learnings, recentMessages] = await Promise.all([
    supabase
      .from("company_contexts")
      .select("id")
      .eq("organization_id", connection.organization_id)
      .is("archived_at", null)
      .order("updated_at", { ascending: false })
      .limit(1),
    supabase
      .from("workspace_ai_training")
      .select("id")
      .eq("organization_id", connection.organization_id)
      .order("updated_at", { ascending: false })
      .limit(1),
    supabase
      .from("learning_items")
      .select("id")
      .eq("tenant_id", connection.organization_id)
      .is("archived_at", null)
      .order("updated_at", { ascending: false })
      .limit(1),
    supabase
      .from("integration_messages")
      .select("id")
      .eq("organization_id", connection.organization_id)
      .eq("provider", connection.provider)
      .eq("external_channel_id", connection.external_channel_id)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const error =
    companyContext.error ??
    training.error ??
    learnings.error ??
    recentMessages.error;

  if (error) {
    throw new Error(error.message);
  }
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

  try {
    await loadAgentContextBundle(supabase, connection);
  } catch (error) {
    await auditAgentAction(supabase, connection, input, "agent.context_load_failed", {
      error: error instanceof Error ? error.message : "Unknown context load error",
    });
    return {
      ok: false,
      organizationId,
      externalChannelId: input.externalChannelId,
      text: "I could not load the AI Context Document, Training, and AI Agent memory, so I did not run that request.",
      command: "context_load_failed",
      status: "failed",
    };
  }

  if (!text || /^help$/i.test(text)) {
    return {
      ok: true,
      organizationId,
      externalChannelId: input.externalChannelId,
      text: HELP_TEXT,
      command: "help",
      status: "sent",
    };
  }

  if (isHighRiskCommand(text)) {
    const responseText = [
      "That action needs confirmation inside HyperOptimal Management before I can run it from chat.",
      "Open Settings > AI Agent for approvals, destructive actions, or workspace-wide changes.",
    ].join("\n");

    await auditAgentAction(supabase, connection, input, "agent.command.requires_confirmation", {
      requestedText: text,
      requiresConfirmation: true,
    });

    return {
      ok: true,
      organizationId,
      externalChannelId: input.externalChannelId,
      text: responseText,
      command: "needs_confirmation",
      status: "needs_confirmation",
    };
  }

  let command = "agent_chat";
  let responseText = "";
  let status: PrivateChannelAgentResult["status"] = "sent";

  try {
    const lower = text.toLowerCase();
    if (lower === "status") {
      command = "status";
      responseText = await buildStatus(supabase, organizationId);
    } else if (lower === "summarize today" || lower === "summary" || lower === "summarize" || lower === "what changed today?") {
      command = "summary";
      responseText = await buildSummary(supabase, organizationId);
    } else if (lower === "metrics" || lower === "show metrics" || lower === "show me this week's metrics.") {
      command = "metrics";
      responseText = await showMetrics(supabase, organizationId);
    } else {
      const searchMatch = text.match(/^(?:find|search|look up)\s+(.+)$/i);
      if (searchMatch) {
        command = "search";
        responseText = await searchRecords(supabase, organizationId, searchMatch[1]);
      } else {
        const result = await handleHyperoptimalCommand(supabase, connection, text, {
          externalUserId: input.externalUserId,
        });
        command = result.command;
        responseText = result.text;
        status = result.status ?? "sent";
      }
    }

    if (status === "saved") {
      await auditAgentAction(supabase, connection, input, `agent.command.${command}`, {
        requestedText: text,
        resultText: responseText,
      });
    }

    return {
      ok: true,
      organizationId,
      externalChannelId: input.externalChannelId,
      text: responseText,
      command,
      status,
    };
  } catch (error) {
    await auditAgentAction(supabase, connection, input, `agent.command.${command}.failed`, {
      error: error instanceof Error ? error.message : "Unknown agent error",
    });

    return {
      ok: false,
      organizationId,
      externalChannelId: input.externalChannelId,
      text: "I could not complete that request. Try again or open the app if it keeps failing.",
      command,
      status: "failed",
    };
  }
}
