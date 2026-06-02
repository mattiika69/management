import type { SupabaseClient } from "@supabase/supabase-js";

export type AgentPlatform = "web" | "slack" | "telegram";
export type AgentRole = "owner" | "admin" | "member" | "viewer";
export type AgentToolName =
  | "search_app_data"
  | "get_record"
  | "create_record"
  | "update_record"
  | "delete_record"
  | "invite_team_member"
  | "remove_team_member"
  | "get_billing_status"
  | "create_billing_portal_session"
  | "send_email"
  | "summarize_activity"
  | "request_approval"
  | "confirm_approval";

export type AgentContext = {
  supabase: SupabaseClient;
  platform: AgentPlatform;
  organizationId: string;
  organizationName?: string | null;
  actorUserId: string;
  role: AgentRole;
  externalTeamId?: string | null;
  externalChannelId?: string | null;
  externalThreadId?: string | null;
  externalUserId?: string | null;
  externalUserName?: string | null;
  conversationId?: string | null;
  sourceLabel?: string | null;
};

export type AgentResolution =
  | { ok: true; context: AgentContext }
  | { ok: false; text: string; status?: "ignored" | "failed" };

export type AgentRunInput = {
  context: AgentContext;
  message: string;
  externalMessageId?: string | null;
  payload?: Record<string, unknown>;
};

export type AgentRunResult = {
  ok: boolean;
  text: string;
  command: string;
  status: "sent" | "saved" | "failed" | "ignored" | "needs_confirmation";
  toolRuns?: Array<{
    toolName: string;
    status: string;
    summary: string;
  }>;
};

export type AgentToolInput = Record<string, unknown>;

export type AgentToolResult = {
  ok: boolean;
  summary: string;
  data?: unknown;
  status?: "sent" | "saved" | "failed" | "ignored" | "needs_confirmation";
  targetTable?: string | null;
  targetId?: string | null;
  before?: unknown;
  after?: unknown;
  approvalId?: string | null;
  requiresConfirmation?: boolean;
};

export type AgentToolHandler = (
  context: AgentContext,
  input: AgentToolInput,
) => Promise<AgentToolResult>;

export type AgentToolDefinition = {
  name: AgentToolName;
  description: string;
  destructive?: boolean;
  billing?: boolean;
  permissionChanging?: boolean;
  adminOnly?: boolean;
  handler: AgentToolHandler;
};
