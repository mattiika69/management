import { NextResponse } from "next/server";
import {
  findSlackConnectionByTeam,
  loadIntegrationSecret,
  saveIntegrationMessage,
} from "@/lib/integrations/connections";
import { handleHyperoptimalCommand } from "@/lib/integrations/hyperoptimal-commands";
import { postSlackMessage, verifySlackRequest } from "@/lib/integrations/slack";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const verified = await verifySlackRequest(request, rawBody).catch(() => null);
  if (!verified) {
    return NextResponse.json({ error: "Invalid Slack signature." }, { status: 401 });
  }

  const form = new URLSearchParams(rawBody);
  const payloadRaw = form.get("payload");
  let payload: Record<string, unknown> | null = null;
  try {
    payload = payloadRaw ? JSON.parse(payloadRaw) as Record<string, unknown> : null;
  } catch {
    return NextResponse.json({ error: "Invalid Slack payload." }, { status: 400 });
  }
  const teamId =
    form.get("team_id") ||
    (payload?.team && typeof payload.team === "object"
      ? String((payload.team as Record<string, unknown>).id ?? "")
      : "");
  const channelId =
    form.get("channel_id") ||
    (payload?.channel && typeof payload.channel === "object"
      ? String((payload.channel as Record<string, unknown>).id ?? "")
      : "");
  const userId =
    form.get("user_id") ||
    (payload?.user && typeof payload.user === "object"
      ? String((payload.user as Record<string, unknown>).id ?? "")
      : "");
  const text = form.get("text") || "help";

  if (!teamId || !channelId) {
    return NextResponse.json({ text: "Slack interaction missing team or channel." });
  }

  const supabase = createAdminClient();
  const connection = await findSlackConnectionByTeam(supabase, teamId);
  if (!connection) {
    return NextResponse.json({ text: "HyperOptimal Management is not connected to this Slack workspace." });
  }

  await saveIntegrationMessage(supabase, {
    connection,
    direction: "inbound",
    externalUserId: userId,
    messageText: text,
    payload: payload ?? Object.fromEntries(form.entries()),
  });

  const result = await handleHyperoptimalCommand(supabase, connection, text);
  const botToken =
    (await loadIntegrationSecret(supabase, connection.organization_id, "slack", "bot_token")) ??
    process.env.SLACK_BOT_TOKEN ??
    null;
  const response = await postSlackMessage(channelId, result.text, botToken);

  await saveIntegrationMessage(supabase, {
    connection,
    direction: "outbound",
    externalMessageId: response.ts,
    messageText: result.text,
    payload: response,
    command: result.command,
    status: "sent",
  });

  return NextResponse.json({ response_type: "ephemeral", text: "Handled by HyperOptimal Management." });
}
