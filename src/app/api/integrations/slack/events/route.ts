import { NextResponse } from "next/server";
import {
  findSlackConnectionByTeam,
  hasProcessedIntegrationEvent,
  loadIntegrationSecret,
  saveIntegrationMessage,
} from "@/lib/integrations/connections";
import { handleHyperoptimalCommand } from "@/lib/integrations/hyperoptimal-commands";
import { postSlackMessage, verifySlackRequest } from "@/lib/integrations/slack";
import { createAdminClient } from "@/lib/supabase/admin";

type SlackEventEnvelope = {
  type?: string;
  challenge?: string;
  team_id?: string;
  event_id?: string;
  event?: {
    type?: string;
    channel?: string;
    user?: string;
    text?: string;
    ts?: string;
    bot_id?: string;
  };
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const verified = await verifySlackRequest(request, rawBody);

  if (!verified) {
    return NextResponse.json({ error: "Invalid Slack signature." }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as SlackEventEnvelope;

  if (payload.type === "url_verification" && payload.challenge) {
    return NextResponse.json({ challenge: payload.challenge });
  }

  if (!payload.team_id || !payload.event?.channel || payload.event.bot_id) {
    return NextResponse.json({ ok: true });
  }

  const supabase = createAdminClient();
  if (payload.event_id) {
    const duplicate = await hasProcessedIntegrationEvent(supabase, "slack", payload.event_id);
    if (duplicate) return NextResponse.json({ ok: true, duplicate: true });
  }

  const connection = await findSlackConnectionByTeam(supabase, payload.team_id);

  if (!connection) {
    return NextResponse.json({ ok: true, ignored: "connection_not_configured" });
  }

  await saveIntegrationMessage(supabase, {
    connection,
    direction: "inbound",
    externalUserId: payload.event.user,
    externalMessageId: payload.event.ts,
    messageText: payload.event.text,
    payload,
  });

  const result = await handleHyperoptimalCommand(supabase, connection, payload.event.text ?? "");
  const botToken =
    (await loadIntegrationSecret(supabase, connection.organization_id, "slack", "bot_token")) ??
    process.env.SLACK_BOT_TOKEN ??
    null;
  const response = await postSlackMessage(payload.event.channel, result.text, botToken);

  await saveIntegrationMessage(supabase, {
    connection,
    direction: "outbound",
    externalMessageId: response.ts,
    messageText: result.text,
    payload: response,
    command: result.command,
    status: "sent",
  });

  return NextResponse.json({ ok: true });
}
