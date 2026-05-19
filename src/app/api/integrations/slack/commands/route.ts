import { NextResponse } from "next/server";
import {
  findSlackConnectionByTeam,
  hasProcessedIntegrationEvent,
  saveIntegrationMessage,
} from "@/lib/integrations/connections";
import { handleHyperoptimalCommand } from "@/lib/integrations/hyperoptimal-commands";
import { verifySlackRequest } from "@/lib/integrations/slack";
import { createAdminClient } from "@/lib/supabase/admin";

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

  const form = new URLSearchParams(rawBody);
  const teamId = form.get("team_id");
  const channelId = form.get("channel_id");
  const userId = form.get("user_id");
  const text = form.get("text") ?? "";
  const triggerId = form.get("trigger_id") ?? `${teamId}:${channelId}:${userId}:${text}`;

  if (!teamId || !channelId) {
    return NextResponse.json({ text: "Slack workspace is not connected." });
  }

  const supabase = createAdminClient();
  if (await hasProcessedIntegrationEvent(supabase, "slack", triggerId)) {
    return NextResponse.json({ text: "Already handled." });
  }

  const connection = await findSlackConnectionByTeam(supabase, teamId);
  if (!connection) {
    return NextResponse.json({ text: "Slack workspace is not connected." });
  }

  await saveIntegrationMessage(supabase, {
    connection,
    direction: "inbound",
    externalUserId: userId ?? undefined,
    externalMessageId: triggerId,
    messageText: text,
    payload: Object.fromEntries(form),
  });

  const result = await handleHyperoptimalCommand(supabase, connection, text, {
    externalUserId: userId,
  });

  await saveIntegrationMessage(supabase, {
    connection,
    direction: "outbound",
    messageText: result.text,
    payload: { source: "slack_command" },
    command: result.command,
    status: "saved",
  });

  return NextResponse.json({ response_type: "ephemeral", text: result.text });
}
