import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

export async function verifySlackRequest(request: Request, rawBody: string) {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;

  if (!signingSecret) {
    throw new Error("SLACK_SIGNING_SECRET is not configured.");
  }

  const timestamp = request.headers.get("x-slack-request-timestamp");
  const signature = request.headers.get("x-slack-signature");

  if (!timestamp || !signature) {
    return false;
  }

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 60 * 5) {
    return false;
  }

  const base = `v0:${timestamp}:${rawBody}`;
  const expected = `v0=${createHmac("sha256", signingSecret).update(base).digest("hex")}`;

  if (expected.length !== signature.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function buildSlackAuthorizeUrl(input: { origin: string; state: string }) {
  const clientId = process.env.SLACK_CLIENT_ID;
  if (!clientId) {
    throw new Error("SLACK_CLIENT_ID is not configured.");
  }

  const scopes =
    process.env.SLACK_BOT_SCOPES?.trim() ||
    "app_mentions:read,channels:history,chat:write,commands,groups:history,im:history";
  const url = new URL("https://slack.com/oauth/v2/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", scopes);
  url.searchParams.set("redirect_uri", `${input.origin}/api/integrations/slack/oauth/callback`);
  url.searchParams.set("state", input.state);
  return url.toString();
}

export async function exchangeSlackCode(input: { code: string; origin: string }) {
  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Slack OAuth credentials are not configured.");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code: input.code,
    redirect_uri: `${input.origin}/api/integrations/slack/oauth/callback`,
  });

  const response = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload = (await response.json()) as {
    ok?: boolean;
    error?: string;
    access_token?: string;
    scope?: string;
    bot_user_id?: string;
    team?: { id?: string; name?: string };
    authed_user?: { id?: string };
  };

  if (!payload.ok) {
    throw new Error(payload.error ?? "Slack OAuth failed.");
  }

  return payload;
}

export async function postSlackMessage(channel: string, text: string, tokenOverride?: string | null) {
  const token = tokenOverride || process.env.SLACK_BOT_TOKEN;

  if (!token) {
    throw new Error("SLACK_BOT_TOKEN is not configured.");
  }

  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ channel, text }),
  });

  const body = (await response.json()) as { ok?: boolean; error?: string; ts?: string };

  if (!body.ok) {
    throw new Error(body.error ?? "Slack message failed.");
  }

  return body;
}
