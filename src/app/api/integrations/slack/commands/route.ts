import { NextResponse } from "next/server";
import { hasProcessedIntegrationEvent } from "@/lib/integrations/connections";
import { handleSlackAgentMessage } from "@/lib/integrations/slack-agent";
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
  const channelName = form.get("channel_name");
  const userId = form.get("user_id");
  const userName = form.get("user_name");
  const text = form.get("text") ?? "";
  const triggerId = form.get("trigger_id") ?? `${teamId}:${channelId}:${userId}:${text}`;

  if (!teamId || !channelId) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "Slack workspace or channel was not included in the request.",
    });
  }

  const supabase = createAdminClient();
  if (await hasProcessedIntegrationEvent(supabase, "slack", triggerId)) {
    return NextResponse.json({ response_type: "ephemeral", text: "Already handled." });
  }

  const result = await handleSlackAgentMessage(supabase, {
    teamId,
    channelId,
    channelName,
    userId,
    userName,
    text,
    eventId: triggerId,
    messageId: triggerId,
    payload: Object.fromEntries(form),
    source: "command",
  });

  return NextResponse.json({
    response_type: "ephemeral",
    text: result.text,
  });
}
