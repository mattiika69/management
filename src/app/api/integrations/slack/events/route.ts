import { NextResponse } from "next/server";
import { hasProcessedIntegrationEvent } from "@/lib/integrations/connections";
import {
  handleSlackAgentMessage,
  isPrefixedSlackMessage,
} from "@/lib/integrations/slack-agent";
import { postSlackMessage, verifySlackRequest } from "@/lib/integrations/slack";
import { createAdminClient } from "@/lib/supabase/admin";

type SlackEventEnvelope = {
  type?: string;
  challenge?: string;
  team_id?: string;
  event_id?: string;
  event?: {
    type?: string;
    subtype?: string;
    channel?: string;
    channel_type?: string;
    user?: string;
    username?: string;
    text?: string;
    ts?: string;
    thread_ts?: string;
    bot_id?: string;
  };
};

function shouldHandleEvent(payload: SlackEventEnvelope) {
  const event = payload.event;
  if (!event || event.bot_id || event.subtype) return false;
  if (event.type === "app_mention") return true;
  return event.type === "message" && isPrefixedSlackMessage(event.text ?? "");
}

async function postIfPossible(channel: string, text: string, threadTs?: string | null, token?: string | null) {
  try {
    await postSlackMessage(channel, text, token ?? null, { threadTs });
  } catch {
    // Slack already received a 200 response path; do not retry provider calls here.
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  let verified = false;
  try {
    verified = await verifySlackRequest(request, rawBody);
  } catch {
    return NextResponse.json({ error: "Slack webhook is not configured." }, { status: 503 });
  }

  if (!verified) {
    return NextResponse.json({ error: "Invalid Slack signature." }, { status: 401 });
  }

  let payload: SlackEventEnvelope;
  try {
    payload = JSON.parse(rawBody) as SlackEventEnvelope;
  } catch {
    return NextResponse.json({ error: "Invalid Slack payload." }, { status: 400 });
  }

  if (payload.type === "url_verification" && payload.challenge) {
    return NextResponse.json({ challenge: payload.challenge });
  }

  const event = payload.event;
  if (!payload.team_id || !event?.channel || !shouldHandleEvent(payload)) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const supabase = createAdminClient();
  if (payload.event_id) {
    const duplicate = await hasProcessedIntegrationEvent(supabase, "slack", payload.event_id);
    if (duplicate) return NextResponse.json({ ok: true, duplicate: true });
  }

  const result = await handleSlackAgentMessage(supabase, {
    teamId: payload.team_id,
    channelId: event.channel,
    userId: event.user,
    userName: event.username,
    text: event.text ?? "",
    eventId: payload.event_id,
    messageId: event.ts,
    threadTs: event.thread_ts ?? event.ts,
    payload: payload as Record<string, unknown>,
    source: "event",
  });

  await postIfPossible(
    event.channel,
    result.text,
    event.thread_ts ?? event.ts,
    result.botToken ?? process.env.SLACK_BOT_TOKEN ?? null,
  );

  return NextResponse.json({ ok: true, handled: result.ok, command: result.command });
}
