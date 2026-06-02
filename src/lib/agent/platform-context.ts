import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { IntegrationConnection } from "@/lib/integrations/connections";
import type {
  AgentContext,
  AgentPlatform,
  AgentResolution,
  AgentRole,
} from "@/lib/agent/types";

type ConversationType = "chat" | "dm" | "channel" | "group" | "supergroup" | "thread" | "web";

type MembershipRow = {
  role: AgentRole;
};

type PlatformAccountRow = {
  app_user_id: string;
  display_name: string | null;
};

async function getMembershipRole(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
) {
  const { data: tenantMembership, error: tenantError } = await supabase
    .from("tenant_memberships")
    .select("role")
    .eq("tenant_id", organizationId)
    .eq("user_id", userId)
    .is("archived_at", null)
    .maybeSingle<MembershipRow>();

  if (tenantError) throw new Error(tenantError.message);
  if (tenantMembership?.role) return tenantMembership.role;

  const { data: legacyMembership, error: legacyError } = await supabase
    .from("organization_memberships")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle<MembershipRow>();

  if (legacyError) throw new Error(legacyError.message);
  return legacyMembership?.role ?? null;
}

export async function upsertPlatformInstallation(
  supabase: SupabaseClient,
  input: {
    platform: AgentPlatform;
    organizationId: string;
    externalTeamId?: string | null;
    externalChannelId?: string | null;
    botUserId?: string | null;
    installingUserId?: string | null;
    scopes?: string[];
    config?: Record<string, unknown>;
  },
) {
  const { data: existing, error: existingError } = await supabase
    .from("platform_installations")
    .select("id")
    .eq("tenant_id", input.organizationId)
    .eq("platform", input.platform)
    .eq("external_team_id", input.externalTeamId ?? "")
    .eq("external_channel_id", input.externalChannelId ?? "")
    .eq("status", "active")
    .maybeSingle<{ id: string }>();

  if (existingError) throw new Error(existingError.message);

  const payload = {
    tenant_id: input.organizationId,
    organization_id: input.organizationId,
    platform: input.platform,
    external_team_id: input.externalTeamId ?? "",
    external_channel_id: input.externalChannelId ?? "",
    bot_user_id: input.botUserId ?? null,
    installing_user_id: input.installingUserId ?? null,
    scopes: input.scopes ?? [],
    token_reference: input.platform === "web" ? null : "integration_secrets.bot_token",
    status: "active",
    config: input.config ?? {},
  };

  if (existing) {
    const { data, error } = await supabase
      .from("platform_installations")
      .update(payload)
      .eq("id", existing.id)
      .select("id")
      .single<{ id: string }>();
    if (error) throw new Error(error.message);
    return data.id;
  }

  const { data, error } = await supabase
    .from("platform_installations")
    .insert(payload)
    .select("id")
    .single<{ id: string }>();
  if (error) throw new Error(error.message);
  return data.id;
}

async function ensureConversation(
  supabase: SupabaseClient,
  input: {
    platform: AgentPlatform;
    organizationId: string;
    installationId?: string | null;
    externalTeamId?: string | null;
    externalChannelId?: string | null;
    externalThreadId?: string | null;
    conversationType: ConversationType;
    title?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const { data: existing, error: existingError } = await supabase
    .from("platform_conversations")
    .select("id")
    .eq("tenant_id", input.organizationId)
    .eq("platform", input.platform)
    .eq("external_team_id", input.externalTeamId ?? "")
    .eq("external_channel_id", input.externalChannelId ?? "")
    .eq("external_thread_id", input.externalThreadId ?? "")
    .eq("status", "active")
    .maybeSingle<{ id: string }>();

  if (existingError) throw new Error(existingError.message);
  if (existing) return existing.id;

  const { data, error } = await supabase
    .from("platform_conversations")
    .insert({
      tenant_id: input.organizationId,
      organization_id: input.organizationId,
      platform: input.platform,
      installation_id: input.installationId ?? null,
      external_team_id: input.externalTeamId ?? "",
      external_channel_id: input.externalChannelId ?? "",
      external_thread_id: input.externalThreadId ?? "",
      conversation_type: input.conversationType,
      title: input.title ?? null,
      status: "active",
      metadata: input.metadata ?? {},
    })
    .select("id")
    .single<{ id: string }>();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function upsertPlatformAccount(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    platform: AgentPlatform;
    externalTeamId?: string | null;
    externalUserId: string;
    appUserId: string;
    displayName?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const { data: existing, error: existingError } = await supabase
    .from("platform_accounts")
    .select("id")
    .eq("tenant_id", input.organizationId)
    .eq("platform", input.platform)
    .eq("external_team_id", input.externalTeamId ?? "")
    .eq("external_user_id", input.externalUserId)
    .eq("status", "linked")
    .maybeSingle<{ id: string }>();

  if (existingError) throw new Error(existingError.message);

  const payload = {
    tenant_id: input.organizationId,
    organization_id: input.organizationId,
    platform: input.platform,
    external_team_id: input.externalTeamId ?? "",
    external_user_id: input.externalUserId,
    app_user_id: input.appUserId,
    display_name: input.displayName ?? null,
    status: "linked",
    revoked_at: null,
    metadata: input.metadata ?? {},
  };

  const query = existing
    ? supabase.from("platform_accounts").update(payload).eq("id", existing.id)
    : supabase.from("platform_accounts").insert(payload);
  const { error } = await query;
  if (error) throw new Error(error.message);
}

async function findPlatformAccount(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    platform: AgentPlatform;
    externalTeamId?: string | null;
    externalUserId?: string | null;
  },
) {
  if (!input.externalUserId) return null;

  const { data, error } = await supabase
    .from("platform_accounts")
    .select("app_user_id,display_name")
    .eq("tenant_id", input.organizationId)
    .eq("platform", input.platform)
    .eq("external_team_id", input.externalTeamId ?? "")
    .eq("external_user_id", input.externalUserId)
    .eq("status", "linked")
    .maybeSingle<PlatformAccountRow>();

  if (error) throw new Error(error.message);
  return data;
}

export async function createWebAgentContext(input: {
  supabase: SupabaseClient;
  organizationId: string;
  organizationName?: string | null;
  actorUserId: string;
  role: AgentRole;
}) {
  const installationId = await upsertPlatformInstallation(input.supabase, {
    platform: "web",
    organizationId: input.organizationId,
    installingUserId: input.actorUserId,
  });
  const conversationId = await ensureConversation(input.supabase, {
    platform: "web",
    organizationId: input.organizationId,
    installationId,
    externalTeamId: "web",
    externalChannelId: input.actorUserId,
    externalThreadId: "settings-agent",
    conversationType: "web",
    title: "Web chat",
  });

  return {
    supabase: input.supabase,
    platform: "web",
    organizationId: input.organizationId,
    organizationName: input.organizationName ?? null,
    actorUserId: input.actorUserId,
    role: input.role,
    externalTeamId: "web",
    externalChannelId: input.actorUserId,
    externalThreadId: "settings-agent",
    externalUserId: input.actorUserId,
    conversationId,
    sourceLabel: "App",
  } satisfies AgentContext;
}

export async function resolveIntegrationAgentContext(
  supabase: SupabaseClient,
  connection: IntegrationConnection,
  input: {
    platform: "slack" | "telegram";
    externalTeamId?: string | null;
    externalChannelId: string;
    externalThreadId?: string | null;
    externalUserId?: string | null;
    externalUserName?: string | null;
    botUserId?: string | null;
    scopes?: string[] | null;
    conversationType?: ConversationType;
  },
): Promise<AgentResolution> {
  const installationId = await upsertPlatformInstallation(supabase, {
    platform: input.platform,
    organizationId: connection.organization_id,
    externalTeamId: input.externalTeamId ?? connection.external_team_id,
    externalChannelId: input.externalChannelId,
    botUserId: input.botUserId ?? null,
    installingUserId: connection.created_by,
    scopes: input.scopes ?? [],
    config: {
      connectionId: connection.id,
      displayName: input.externalUserName ?? null,
    },
  });

  if (
    input.externalUserId &&
    connection.created_by &&
    connection.external_user_id &&
    connection.external_user_id === input.externalUserId
  ) {
    await upsertPlatformAccount(supabase, {
      organizationId: connection.organization_id,
      platform: input.platform,
      externalTeamId: input.externalTeamId ?? connection.external_team_id,
      externalUserId: input.externalUserId,
      appUserId: connection.created_by,
      displayName: input.externalUserName ?? null,
      metadata: { source: "integration_connection" },
    });
  }

  const account = await findPlatformAccount(supabase, {
    organizationId: connection.organization_id,
    platform: input.platform,
    externalTeamId: input.externalTeamId ?? connection.external_team_id,
    externalUserId: input.externalUserId,
  });

  if (!account?.app_user_id) {
    const settingsPath = input.platform === "slack" ? "/settings/slack" : "/settings/telegram";
    return {
      ok: false,
      status: "ignored",
      text: [
        "Link your HyperOptimal Management account before I can read or change workspace data from here.",
        `Open ${settingsPath} in the app and connect this ${input.platform === "slack" ? "Slack user" : "Telegram account"}.`,
      ].join("\n"),
    };
  }

  const role = await getMembershipRole(supabase, connection.organization_id, account.app_user_id);
  if (!role) {
    return {
      ok: false,
      status: "ignored",
      text: "Your linked account is not a member of this HyperOptimal Management workspace.",
    };
  }

  const conversationId = await ensureConversation(supabase, {
    platform: input.platform,
    organizationId: connection.organization_id,
    installationId,
    externalTeamId: input.externalTeamId ?? connection.external_team_id,
    externalChannelId: input.externalChannelId,
    externalThreadId: input.externalThreadId ?? "",
    conversationType: input.conversationType ?? (input.externalThreadId ? "thread" : "channel"),
    title: connection.external_channel_id ?? input.externalChannelId,
    metadata: { connectionId: connection.id },
  });

  return {
    ok: true,
    context: {
      supabase,
      platform: input.platform,
      organizationId: connection.organization_id,
      actorUserId: account.app_user_id,
      role,
      externalTeamId: input.externalTeamId ?? connection.external_team_id,
      externalChannelId: input.externalChannelId,
      externalThreadId: input.externalThreadId ?? null,
      externalUserId: input.externalUserId ?? null,
      externalUserName: input.externalUserName ?? account.display_name,
      conversationId,
      sourceLabel: input.platform === "slack" ? "Slack" : "Telegram",
    },
  };
}
