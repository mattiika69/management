import { SupabaseClient } from "@supabase/supabase-js";

type Provider = "slack" | "telegram";

type ConnectionLookup = {
  provider: Provider;
  externalTeamId?: string | null;
  externalChannelId?: string | null;
};

export type IntegrationConnection = {
  id: string;
  organization_id: string;
  provider: Provider;
  external_team_id: string | null;
  external_channel_id: string | null;
  external_user_id: string | null;
  created_by: string | null;
};

export async function findIntegrationConnection(
  supabase: SupabaseClient,
  lookup: ConnectionLookup,
) {
  let query = supabase
    .from("integration_connections")
    .select("id,organization_id,provider,external_team_id,external_channel_id,external_user_id,created_by")
    .eq("provider", lookup.provider)
    .is("revoked_at", null)
    .limit(1);

  if (lookup.externalTeamId) {
    query = query.eq("external_team_id", lookup.externalTeamId);
  }

  if (lookup.externalChannelId) {
    query = query.eq("external_channel_id", lookup.externalChannelId);
  }

  const { data, error } = await query.maybeSingle<IntegrationConnection>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function findSlackConnectionByTeam(
  supabase: SupabaseClient,
  externalTeamId: string,
) {
  const { data, error } = await supabase
    .from("integration_connections")
    .select("id,organization_id,provider,external_team_id,external_channel_id,external_user_id,created_by")
    .eq("provider", "slack")
    .eq("external_team_id", externalTeamId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<IntegrationConnection>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function hasProcessedIntegrationEvent(
  supabase: SupabaseClient,
  provider: Provider,
  externalEventId: string,
) {
  const { error } = await supabase.from("integration_processed_events").insert({
    provider,
    external_event_id: externalEventId,
  });

  if (!error) return false;
  if (error.code === "23505") return true;
  throw new Error(error.message);
}

export async function upsertIntegrationConnection(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    provider: Provider;
    externalTeamId?: string | null;
    externalChannelId?: string | null;
    externalUserId?: string | null;
    botUserId?: string | null;
    displayName?: string | null;
    createdBy?: string | null;
    config?: Record<string, unknown>;
  },
) {
  const { data: existing, error: findError } = await supabase
    .from("integration_connections")
    .select("id")
    .eq("provider", input.provider)
    .eq("organization_id", input.organizationId)
    .eq("external_team_id", input.externalTeamId ?? "")
    .eq("external_channel_id", input.externalChannelId ?? "")
    .maybeSingle<{ id: string }>();

  if (findError && findError.code !== "PGRST116") {
    throw new Error(findError.message);
  }

  const payload = {
    organization_id: input.organizationId,
    provider: input.provider,
    external_team_id: input.externalTeamId ?? "",
    external_channel_id: input.externalChannelId ?? "",
    external_user_id: input.externalUserId ?? null,
    bot_user_id: input.botUserId ?? null,
    display_name: input.displayName ?? null,
    created_by: input.createdBy ?? null,
    status: "active",
    revoked_at: null,
    config: input.config ?? {},
  };

  const query = existing
    ? supabase
        .from("integration_connections")
        .update(payload)
        .eq("id", existing.id)
        .select("id,organization_id,provider,external_team_id,external_channel_id,external_user_id,created_by")
        .single<IntegrationConnection>()
    : supabase
        .from("integration_connections")
        .insert(payload)
        .select("id,organization_id,provider,external_team_id,external_channel_id,external_user_id,created_by")
        .single<IntegrationConnection>();

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function saveIntegrationSecret(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    provider: Provider;
    secretName: string;
    secretValue: string;
    createdBy?: string | null;
  },
) {
  const hint = input.secretValue.length > 8
    ? `${input.secretValue.slice(0, 4)}...${input.secretValue.slice(-4)}`
    : "configured";
  const { error } = await supabase.from("integration_secrets").upsert(
    {
      organization_id: input.organizationId,
      provider: input.provider,
      secret_name: input.secretName,
      secret_value: input.secretValue,
      secret_hint: hint,
      created_by: input.createdBy ?? null,
    },
    { onConflict: "organization_id,provider,secret_name" },
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function loadIntegrationSecret(
  supabase: SupabaseClient,
  organizationId: string,
  provider: Provider,
  secretName: string,
) {
  const { data, error } = await supabase
    .from("integration_secrets")
    .select("secret_value")
    .eq("organization_id", organizationId)
    .eq("provider", provider)
    .eq("secret_name", secretName)
    .maybeSingle<{ secret_value: string }>();

  if (error) {
    throw new Error(error.message);
  }

  return data?.secret_value ?? null;
}

export async function saveIntegrationMessage(
  supabase: SupabaseClient,
  input: {
    connection: IntegrationConnection;
    direction: "inbound" | "outbound";
    externalUserId?: string;
    externalMessageId?: string;
    messageText?: string;
    payload?: unknown;
    command?: string;
    status?: "saved" | "sent" | "failed" | "ignored";
    errorMessage?: string;
  },
) {
  const { error } = await supabase.from("integration_messages").insert({
    organization_id: input.connection.organization_id,
    connection_id: input.connection.id,
    provider: input.connection.provider,
    direction: input.direction,
    external_team_id: input.connection.external_team_id,
    external_channel_id: input.connection.external_channel_id,
    external_user_id: input.externalUserId,
    external_message_id: input.externalMessageId,
    message_text: input.messageText,
    payload: input.payload ?? {},
    command: input.command,
    status: input.status ?? "saved",
    error_message: input.errorMessage,
  });

  if (error) {
    throw new Error(error.message);
  }
}
