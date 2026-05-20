import { NextResponse } from "next/server";
import { getCurrentOrganization } from "@/lib/auth/organization";
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
    const organization = await getCurrentOrganization(supabase, user);
    if (!organization) {
      return NextResponse.redirect(new URL("/get-started", request.url));
    }

    const oauth = await exchangeSlackCode({ code, origin: url.origin });
    const teamId = oauth.team?.id?.trim();
    const botToken = oauth.access_token?.trim();
    const channelId = oauth.incoming_webhook?.channel_id?.trim();
    const channelName = oauth.incoming_webhook?.channel?.trim();

    if (!teamId || !botToken) {
      return redirectBack(request, { slack: "error", code: "missing_team_or_token" });
    }

    if (!channelId) {
      return redirectBack(request, { slack: "error", code: "missing_channel" });
    }

    const admin = createAdminClient();
    const connection = await upsertIntegrationConnection(admin, {
      organizationId: organization.id,
      provider: "slack",
      externalTeamId: teamId,
      externalChannelId: channelId,
      externalUserId: oauth.authed_user?.id ?? null,
      botUserId: oauth.bot_user_id ?? null,
      displayName: channelName
        ? `${oauth.team?.name ?? "Slack"} #${channelName}`
        : oauth.team?.name ?? "Slack workspace",
      createdBy: user.id,
      config: {
        scope: oauth.scope ?? null,
        slack_team_name: oauth.team?.name ?? null,
        slack_channel_name: channelName ?? null,
        incoming_webhook_config_url: oauth.incoming_webhook?.configuration_url ?? null,
      },
    });
    await saveIntegrationSecret(admin, {
      organizationId: organization.id,
      provider: "slack",
      secretName: "bot_token",
      secretValue: botToken,
      createdBy: user.id,
    });
    if (oauth.incoming_webhook?.url) {
      await saveIntegrationSecret(admin, {
        organizationId: organization.id,
        provider: "slack",
        secretName: "incoming_webhook_url",
        secretValue: oauth.incoming_webhook.url,
        createdBy: user.id,
      });
    }

    const { error: channelError } = await admin.from("slack_channels").upsert(
      {
        tenant_id: organization.id,
        organization_id: organization.id,
        slack_team_id: teamId,
        slack_channel_id: channelId,
        slack_channel_name: channelName ?? null,
        is_private: true,
        enabled: true,
        created_by_user_id: user.id,
        updated_by_user_id: user.id,
      },
      { onConflict: "slack_team_id,slack_channel_id" },
    );
    if (channelError) {
      throw new Error(channelError.message);
    }

    const { error: auditError } = await admin.from("admin_audit_log").insert({
      tenant_id: organization.id,
      actor_user_id: user.id,
      action: "integration.slack.connected",
      target_table: "integration_connections",
      target_id: connection.id,
      metadata: {
        slack_team_id: teamId,
        slack_channel_id: channelId,
        slack_channel_name: channelName ?? null,
      },
    });
    if (auditError) {
      throw new Error(auditError.message);
    }

    return redirectBack(request, { slack: "connected" });
  } catch (error) {
    const codeValue = error instanceof Error ? error.message.slice(0, 80) : "unknown";
    return redirectBack(request, { slack: "error", code: codeValue });
  }
}
