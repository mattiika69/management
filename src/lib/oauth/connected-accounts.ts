import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ConnectedAccountProvider = "google_calendar" | "microsoft_calendar" | "zoom";

type TokenInput = {
  tenantId: string;
  provider: ConnectedAccountProvider;
  connectionId: string;
  accountEmail: string;
  accountId?: string | null;
  accessToken: string;
  refreshToken?: string | null;
  tokenType?: string | null;
  scope?: string | null;
  expiresAt?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown>;
};

export type ConnectedAccountToken = {
  id: string;
  tenant_id: string;
  provider: ConnectedAccountProvider;
  connection_id: string | null;
  account_email: string;
  account_id: string | null;
  access_token_ciphertext: string;
  refresh_token_ciphertext: string | null;
  token_type: string | null;
  scope: string | null;
  expires_at: string | null;
  metadata: Record<string, unknown>;
};

const TOKEN_SELECT =
  "id,tenant_id,provider,connection_id,account_email,account_id,access_token_ciphertext,refresh_token_ciphertext,token_type,scope,expires_at,metadata";

function encryptionKey() {
  const secret = process.env.INTEGRATION_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("Connection encryption is not configured.");
  }
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptSecret(value: string) {
  const [version, ivValue, tagValue, encryptedValue] = value.split(".");
  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) {
    throw new Error("Stored connection token is invalid.");
  }

  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export async function saveConnectedAccountToken(supabase: SupabaseClient, input: TokenInput) {
  const payload = {
    tenant_id: input.tenantId,
    organization_id: input.tenantId,
    provider: input.provider,
    connection_id: input.connectionId,
    account_email: input.accountEmail.toLowerCase(),
    account_id: input.accountId ?? null,
    access_token_ciphertext: encryptSecret(input.accessToken),
    refresh_token_ciphertext: input.refreshToken ? encryptSecret(input.refreshToken) : null,
    token_type: input.tokenType ?? null,
    scope: input.scope ?? null,
    expires_at: input.expiresAt ?? null,
    metadata: input.metadata ?? {},
    created_by_user_id: input.userId ?? null,
    updated_by_user_id: input.userId ?? null,
    archived_at: null,
  };

  const { data: existing, error: findError } = await supabase
    .from("connected_account_tokens")
    .select("id")
    .eq("tenant_id", input.tenantId)
    .eq("provider", input.provider)
    .eq("account_email", input.accountEmail.toLowerCase())
    .is("archived_at", null)
    .maybeSingle<{ id: string }>();

  if (findError) throw new Error(findError.message);

  const query = existing
    ? supabase.from("connected_account_tokens").update(payload).eq("id", existing.id)
    : supabase.from("connected_account_tokens").insert(payload);

  const { error } = await query;
  if (error) throw new Error(error.message);
}

export async function loadConnectedAccountToken(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    provider: ConnectedAccountProvider;
    connectionId?: string | null;
  },
) {
  let query = supabase
    .from("connected_account_tokens")
    .select(TOKEN_SELECT)
    .eq("tenant_id", input.tenantId)
    .eq("provider", input.provider)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (input.connectionId) query = query.eq("connection_id", input.connectionId);

  const { data, error } = await query.maybeSingle<ConnectedAccountToken>();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateConnectedAccountAccessToken(
  supabase: SupabaseClient,
  input: {
    tokenId: string;
    accessToken: string;
    refreshToken?: string | null;
    expiresAt?: string | null;
    scope?: string | null;
  },
) {
  const patch: Record<string, unknown> = {
    access_token_ciphertext: encryptSecret(input.accessToken),
    expires_at: input.expiresAt ?? null,
  };
  if (input.refreshToken) patch.refresh_token_ciphertext = encryptSecret(input.refreshToken);
  if (input.scope) patch.scope = input.scope;

  const { error } = await supabase.from("connected_account_tokens").update(patch).eq("id", input.tokenId);
  if (error) throw new Error(error.message);
}

export function tokenExpiresAt(expiresInSeconds?: number | null) {
  if (!expiresInSeconds || !Number.isFinite(expiresInSeconds)) return null;
  return new Date(Date.now() + Math.max(0, expiresInSeconds - 60) * 1000).toISOString();
}

export function tokenIsFresh(expiresAt: string | null) {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() > Date.now() + 60_000;
}
