import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getNylasApiBaseUrl,
  getNylasApiKey,
  getNylasClientId,
  nylasFetchJson,
} from "@/lib/nylas/server";
import { auditAction, type TenantContext } from "@/lib/tenant-context";
import {
  decryptSecret,
  loadConnectedAccountToken,
  saveConnectedAccountToken,
  tokenExpiresAt,
  tokenIsFresh,
  updateConnectedAccountAccessToken,
  type ConnectedAccountProvider,
} from "@/lib/oauth/connected-accounts";

export const OAUTH_STATE_COOKIE = "hom_provider_oauth_state";
export const OAUTH_RETURN_COOKIE = "hom_provider_oauth_return";

export type OAuthProvider = "google_calendar" | "microsoft_calendar" | "nylas" | "zoom";

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  grant_id?: string;
  email?: string;
  error?: string;
  error_description?: string;
};

type GoogleProfile = {
  sub?: string;
  email?: string;
  name?: string;
};

type MicrosoftProfile = {
  id?: string;
  displayName?: string;
  mail?: string | null;
  userPrincipalName?: string | null;
};

type NylasGrant = {
  data?: {
    id?: string;
    grant_id?: string;
    email?: string;
    provider?: string;
  };
  id?: string;
  grant_id?: string;
  email?: string;
  provider?: string;
};

type ZoomProfile = {
  id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
};

export function readCookie(request: Request, name: string) {
  return request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1) ?? "";
}

export function safeReturnTo(value: string | null, fallback: string) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

export function randomState() {
  return randomBytes(24).toString("base64url");
}

export function oauthProviderReady(provider: OAuthProvider) {
  if (provider === "google_calendar") {
    return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  }
  if (provider === "microsoft_calendar") {
    return Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);
  }
  if (provider === "nylas") {
    return Boolean(process.env.NYLAS_CLIENT_ID && process.env.NYLAS_API_KEY);
  }
  return Boolean(process.env.ZOOM_CLIENT_ID && process.env.ZOOM_CLIENT_SECRET);
}

export function oauthAuthorizeUrl(provider: OAuthProvider, origin: string, state: string) {
  if (provider === "google_calendar") {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) throw new Error("Google Calendar is not available.");
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", `${origin}/api/calendars/google/oauth/callback`);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile https://www.googleapis.com/auth/calendar.events");
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("state", state);
    return url;
  }

  if (provider === "microsoft_calendar") {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    if (!clientId) throw new Error("Outlook Calendar is not available.");
    const tenant = process.env.MICROSOFT_TENANT_ID || "common";
    const url = new URL(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", `${origin}/api/calendars/microsoft/oauth/callback`);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "offline_access User.Read Calendars.ReadWrite");
    url.searchParams.set("state", state);
    return url;
  }

  if (provider === "nylas") {
    const url = new URL(`${getNylasApiBaseUrl()}/v3/connect/auth`);
    url.searchParams.set("client_id", getNylasClientId());
    url.searchParams.set("redirect_uri", `${origin}/api/calendars/nylas/oauth/callback`);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("state", state);
    return url;
  }

  const clientId = process.env.ZOOM_CLIENT_ID;
  if (!clientId) throw new Error("Zoom is not available.");
  const url = new URL("https://zoom.us/oauth/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", `${origin}/api/zoom/oauth/callback`);
  url.searchParams.set("state", state);
  return url;
}

async function fetchJson<T>(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  const body = (await response.json().catch(() => ({}))) as T & {
    error?: string | { message?: string };
    message?: string;
  };
  if (!response.ok) {
    const errorMessage = typeof body.error === "string" ? body.error : body.error?.message;
    throw new Error(errorMessage || body.message || "Provider request failed.");
  }
  return body;
}

async function exchangeCode(provider: OAuthProvider, code: string, origin: string) {
  if (provider === "google_calendar") {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error("Google Calendar is not available.");
    return fetchJson<TokenResponse>("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${origin}/api/calendars/google/oauth/callback`,
        grant_type: "authorization_code",
      }),
    });
  }

  if (provider === "microsoft_calendar") {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const tenant = process.env.MICROSOFT_TENANT_ID || "common";
    if (!clientId || !clientSecret) throw new Error("Outlook Calendar is not available.");
    return fetchJson<TokenResponse>(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${origin}/api/calendars/microsoft/oauth/callback`,
        grant_type: "authorization_code",
      }),
    });
  }

  if (provider === "nylas") {
    return fetchJson<TokenResponse>(`${getNylasApiBaseUrl()}/v3/connect/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        client_id: getNylasClientId(),
        client_secret: getNylasApiKey(),
        grant_type: "authorization_code",
        redirect_uri: `${origin}/api/calendars/nylas/oauth/callback`,
      }),
    });
  }

  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Zoom is not available.");
  return fetchJson<TokenResponse>("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      redirect_uri: `${origin}/api/zoom/oauth/callback`,
      grant_type: "authorization_code",
    }),
  });
}

async function refreshToken(supabase: SupabaseClient, token: Awaited<ReturnType<typeof loadConnectedAccountToken>>) {
  if (!token?.refresh_token_ciphertext) throw new Error("Connection needs to be reconnected.");
  const refreshTokenValue = decryptSecret(token.refresh_token_ciphertext);

  let response: TokenResponse;
  if (token.provider === "google_calendar") {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error("Google Calendar is not available.");
    response = await fetchJson<TokenResponse>("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshTokenValue,
        grant_type: "refresh_token",
      }),
    });
  } else if (token.provider === "microsoft_calendar") {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const tenant = process.env.MICROSOFT_TENANT_ID || "common";
    if (!clientId || !clientSecret) throw new Error("Outlook Calendar is not available.");
    response = await fetchJson<TokenResponse>(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshTokenValue,
        grant_type: "refresh_token",
      }),
    });
  } else if (token.provider === "zoom") {
    const clientId = process.env.ZOOM_CLIENT_ID;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error("Zoom is not available.");
    response = await fetchJson<TokenResponse>("https://zoom.us/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        refresh_token: refreshTokenValue,
        grant_type: "refresh_token",
      }),
    });
  } else {
    throw new Error("Connection needs to be reconnected.");
  }

  if (!response.access_token) throw new Error("Provider did not return an access token.");
  await updateConnectedAccountAccessToken(supabase, {
    tokenId: token.id,
    accessToken: response.access_token,
    refreshToken: response.refresh_token ?? null,
    expiresAt: tokenExpiresAt(response.expires_in),
    scope: response.scope ?? null,
  });
  return response.access_token;
}

export async function getProviderAccessToken(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    provider: ConnectedAccountProvider;
    connectionId?: string | null;
  },
) {
  const token = await loadConnectedAccountToken(supabase, input);
  if (!token) throw new Error("Connection needs to be reconnected.");
  if (tokenIsFresh(token.expires_at)) return decryptSecret(token.access_token_ciphertext);
  return refreshToken(supabase, token);
}

export async function connectCalendarProvider(
  admin: SupabaseClient,
  context: TenantContext,
  provider: "google_calendar" | "microsoft_calendar" | "nylas",
  code: string,
  origin: string,
) {
  const token = await exchangeCode(provider, code, origin);
  if (!token.access_token && !token.grant_id) {
    throw new Error("Provider did not return a usable connection token.");
  }

  let accountEmail: string | undefined;
  let accountId: string | undefined;
  let displayName: string | undefined;
  let providerName: string | undefined;

  if (provider === "google_calendar") {
    if (!token.access_token) throw new Error("Provider did not return an access token.");
    const profile = await fetchJson<GoogleProfile>("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    accountEmail = profile.email?.trim().toLowerCase();
    accountId = profile.sub;
    displayName = profile.name || accountEmail || "Google Calendar";
  } else if (provider === "microsoft_calendar") {
    if (!token.access_token) throw new Error("Provider did not return an access token.");
    const profile = await fetchJson<MicrosoftProfile>("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    accountEmail = (profile.mail || profile.userPrincipalName)?.trim().toLowerCase();
    accountId = profile.id;
    displayName = profile.displayName || accountEmail || "Outlook Calendar";
  } else {
    const grantId = token.grant_id;
    if (!grantId) throw new Error("Nylas did not return a grant id.");
    accountId = grantId;
    accountEmail = token.email?.trim().toLowerCase();
    if (!accountEmail) {
      const grant = await nylasFetchJson<NylasGrant>(`/v3/grants/${grantId}`);
      const data = grant.data ?? grant;
      accountEmail = data.email?.trim().toLowerCase();
      providerName = data.provider;
    }
    displayName = accountEmail || "Nylas Calendar";
  }

  if (!accountEmail) throw new Error("Provider account email was not available.");

  const calendarProvider =
    provider === "google_calendar" ? "google" : provider === "microsoft_calendar" ? "microsoft" : "nylas";
  const { data: existing, error: findError } = await admin
    .from("calendar_connections")
    .select("id")
    .eq("tenant_id", context.tenant.id)
    .eq("provider", calendarProvider)
    .eq("account_email", accountEmail)
    .is("archived_at", null)
    .maybeSingle<{ id: string }>();
  if (findError) throw new Error(findError.message);

  const payload = {
    tenant_id: context.tenant.id,
    organization_id: context.tenant.id,
    provider: calendarProvider,
    display_name: displayName,
    account_email: accountEmail,
    provider_account_id: accountId ?? null,
    sync_direction: "two_way",
    sync_enabled: true,
    include_events: true,
    include_tasks: false,
    status: "connected",
    metadata: { scope: token.scope ?? null, nylas_provider: providerName ?? null },
    created_by_user_id: context.user.id,
    updated_by_user_id: context.user.id,
    archived_at: null,
  };

  const query = existing
    ? admin.from("calendar_connections").update(payload).eq("id", existing.id).select("id").single<{ id: string }>()
    : admin.from("calendar_connections").insert(payload).select("id").single<{ id: string }>();
  const { data: connection, error } = await query;
  if (error) throw new Error(error.message);

  const storedAccessToken = token.access_token ?? token.grant_id ?? accountId;
  if (!storedAccessToken) throw new Error("Provider did not return a storable connection token.");

  await saveConnectedAccountToken(admin, {
    tenantId: context.tenant.id,
    provider,
    connectionId: connection.id,
    accountEmail,
    accountId: accountId ?? null,
    accessToken: storedAccessToken,
    refreshToken: token.refresh_token ?? null,
    tokenType: token.token_type ?? null,
    scope: token.scope ?? null,
    expiresAt: tokenExpiresAt(token.expires_in),
    userId: context.user.id,
  });

  await auditAction(context, "calendar.oauth_connected", {
    targetTable: "calendar_connections",
    targetId: connection.id,
    metadata: { provider: calendarProvider, account_email: accountEmail },
  });
}

export async function connectZoomProvider(
  admin: SupabaseClient,
  context: TenantContext,
  code: string,
  origin: string,
) {
  const token = await exchangeCode("zoom", code, origin);
  if (!token.access_token) throw new Error("Provider did not return an access token.");

  const profile = await fetchJson<ZoomProfile>("https://api.zoom.us/v2/users/me", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const accountEmail = profile.email?.trim().toLowerCase();
  if (!accountEmail) throw new Error("Zoom account email was not available.");
  const displayName = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || accountEmail;

  const { data: existing, error: findError } = await admin
    .from("zoom_connections")
    .select("id")
    .eq("tenant_id", context.tenant.id)
    .eq("account_email", accountEmail)
    .is("archived_at", null)
    .maybeSingle<{ id: string }>();
  if (findError) throw new Error(findError.message);

  const payload = {
    tenant_id: context.tenant.id,
    organization_id: context.tenant.id,
    display_name: displayName,
    account_email: accountEmail,
    zoom_account_id: profile.id ?? null,
    sync_enabled: true,
    cloud_recording_sync: true,
    default_meeting_duration_minutes: 30,
    status: "connected",
    metadata: { scope: token.scope ?? null },
    created_by_user_id: context.user.id,
    updated_by_user_id: context.user.id,
    archived_at: null,
  };

  const query = existing
    ? admin.from("zoom_connections").update(payload).eq("id", existing.id).select("id").single<{ id: string }>()
    : admin.from("zoom_connections").insert(payload).select("id").single<{ id: string }>();
  const { data: connection, error } = await query;
  if (error) throw new Error(error.message);

  await saveConnectedAccountToken(admin, {
    tenantId: context.tenant.id,
    provider: "zoom",
    connectionId: connection.id,
    accountEmail,
    accountId: profile.id ?? null,
    accessToken: token.access_token,
    refreshToken: token.refresh_token ?? null,
    tokenType: token.token_type ?? null,
    scope: token.scope ?? null,
    expiresAt: tokenExpiresAt(token.expires_in),
    userId: context.user.id,
  });

  await auditAction(context, "zoom.oauth_connected", {
    targetTable: "zoom_connections",
    targetId: connection.id,
    metadata: { account_email: accountEmail },
  });
}
