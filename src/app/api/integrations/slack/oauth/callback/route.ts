import { NextResponse } from "next/server";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import {
  saveIntegrationSecret,
  upsertIntegrationConnection,
} from "@/lib/integrations/connections";
import { exchangeSlackCode } from "@/lib/integrations/slack";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const STATE_COOKIE = "hof_slack_oauth_state";
const RETURN_COOKIE = "hof_slack_oauth_return";

function readCookie(request: Request, name: string) {
  return request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1) ?? "";
}

function redirectBack(request: Request, params: Record<string, string>) {
  const url = new URL(request.url);
  const returnTo = decodeURIComponent(readCookie(request, RETURN_COOKIE));
  const target = new URL(
    returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/settings/slack",
    url.origin,
  );
  Object.entries(params).forEach(([key, value]) => target.searchParams.set(key, value));
  const response = NextResponse.redirect(target);
  response.cookies.delete(STATE_COOKIE);
  response.cookies.delete(RETURN_COOKIE);
  return response;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?next=/settings/slack", request.url));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code")?.trim();
  const state = url.searchParams.get("state")?.trim();
  const expectedState = decodeURIComponent(readCookie(request, STATE_COOKIE));
  const errorCode = url.searchParams.get("error")?.trim();

  if (errorCode) return redirectBack(request, { slack: "error", code: errorCode });
  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectBack(request, { slack: "error", code: "state_mismatch" });
  }

  try {
    const organization = await getOrCreateDefaultOrganization(supabase, user);
    const oauth = await exchangeSlackCode({ code, origin: url.origin });
    const teamId = oauth.team?.id?.trim();
    const botToken = oauth.access_token?.trim();

    if (!teamId || !botToken) {
      return redirectBack(request, { slack: "error", code: "missing_team_or_token" });
    }

    const admin = createAdminClient();
    await upsertIntegrationConnection(admin, {
      organizationId: organization.id,
      provider: "slack",
      externalTeamId: teamId,
      externalChannelId: "",
      externalUserId: oauth.authed_user?.id ?? null,
      botUserId: oauth.bot_user_id ?? null,
      displayName: oauth.team?.name ?? "Slack workspace",
      createdBy: user.id,
      config: { scope: oauth.scope ?? null },
    });
    await saveIntegrationSecret(admin, {
      organizationId: organization.id,
      provider: "slack",
      secretName: "bot_token",
      secretValue: botToken,
      createdBy: user.id,
    });

    return redirectBack(request, { slack: "connected" });
  } catch (error) {
    const codeValue = error instanceof Error ? error.message.slice(0, 80) : "unknown";
    return redirectBack(request, { slack: "error", code: codeValue });
  }
}
