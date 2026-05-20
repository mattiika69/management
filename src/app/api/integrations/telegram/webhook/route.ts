import { NextResponse } from "next/server";
import { createHash } from "crypto";
import {
  findIntegrationConnection,
  hasProcessedIntegrationEvent,
  saveIntegrationMessage,
  upsertIntegrationConnection,
} from "@/lib/integrations/connections";
import { handlePrivateChannelAgentMessage } from "@/lib/integrations/private-channel-agent";
import {
  postTelegramMessage,
  verifyTelegramRequest,
} from "@/lib/integrations/telegram";
import { normalizeTelegramUsername } from "@/lib/integrations/telegram-username";
import { createAdminClient } from "@/lib/supabase/admin";

type TelegramMessage = {
  message_id?: number;
  text?: string;
  chat?: { id?: number | string };
  from?: { id?: number | string; username?: string; first_name?: string; last_name?: string };
};

type TelegramUpdate = {
  update_id?: number;
  message?: TelegramMessage;
};

type LinkCodeRow = {
  id: string;
  user_id: string;
  organization_id: string;
  expires_at: string;
  used_at: string | null;
};

function hashTelegramLinkCode(code: string) {
  return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}

async function connectTelegramCode(
  supabase: ReturnType<typeof createAdminClient>,
  chatId: string,
  telegramUserId: string | undefined,
  telegramUsername: string | undefined,
  text: string | undefined,
) {
  const match = text?.match(/^\/start\s+([A-F0-9]+)$/i);
  if (!match || !telegramUserId) return null;

  const rawCode = match[1].toUpperCase();
  const now = new Date().toISOString();
  const { data: code, error } = await supabase
    .from("telegram_link_codes")
    .update({ used_at: now })
    .select("id,user_id,organization_id,expires_at,used_at")
    .in("code", [hashTelegramLinkCode(rawCode), rawCode])
    .is("used_at", null)
    .gt("expires_at", now)
    .maybeSingle<LinkCodeRow>();

  if (error) throw new Error(error.message);
  if (!code) {
    await postTelegramMessage(chatId, "That HyperOptimal Management link code is invalid or expired.");
    return { handled: true };
  }

  const displayUsername = normalizeTelegramUsername(telegramUsername);
  const connection = await upsertIntegrationConnection(supabase, {
    organizationId: code.organization_id,
    provider: "telegram",
    externalChannelId: chatId,
    externalUserId: telegramUserId,
    displayName: displayUsername || `Telegram ${chatId}`,
    createdBy: code.user_id,
    config: displayUsername ? { telegram_username: displayUsername } : {},
  });
  const response = await postTelegramMessage(
    chatId,
    "Telegram is connected to HyperOptimal Management. Send /help for commands.",
  );
  await saveIntegrationMessage(supabase, {
    connection,
    direction: "outbound",
    externalMessageId: response.result?.message_id?.toString(),
    messageText: "Telegram is connected to HyperOptimal Management. Send /help for commands.",
    payload: response,
    command: "connect",
    status: "sent",
  });
  await supabase.from("admin_audit_log").insert({
    tenant_id: code.organization_id,
    actor_user_id: code.user_id,
    action: "integration.telegram.connected",
    target_table: "integration_connections",
    target_id: connection.id,
    metadata: {
      telegram_chat_id: chatId,
      telegram_user_id: telegramUserId,
      telegram_username: displayUsername,
      link_code_id: code.id,
    },
  });
  return { handled: true };
}

function telegramDisplayName(from: TelegramMessage["from"]) {
  const username = normalizeTelegramUsername(from?.username);
  if (username) return username;
  return [from?.first_name, from?.last_name].filter(Boolean).join(" ").trim() || null;
}

export async function POST(request: Request) {
  let verified = false;
  try {
    verified = verifyTelegramRequest(request);
  } catch {
    return NextResponse.json({ error: "Telegram webhook is not configured." }, { status: 503 });
  }

  if (!verified) {
    return NextResponse.json({ error: "Invalid Telegram secret." }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as TelegramUpdate | null;
  if (!payload) {
    return NextResponse.json({ error: "Invalid Telegram payload." }, { status: 400 });
  }
  const chatId = payload.message?.chat?.id?.toString();
  const telegramUserId = payload.message?.from?.id?.toString();

  if (!chatId) {
    return NextResponse.json({ ok: true });
  }

  const supabase = createAdminClient();

  if (payload.update_id) {
    const duplicate = await hasProcessedIntegrationEvent(
      supabase,
      "telegram",
      payload.update_id.toString(),
    );
    if (duplicate) return NextResponse.json({ ok: true, duplicate: true });
  }

  const connected = await connectTelegramCode(
    supabase,
    chatId,
    telegramUserId,
    payload.message?.from?.username,
    payload.message?.text,
  );
  if (connected?.handled) {
    return NextResponse.json({ ok: true });
  }

  const connection = await findIntegrationConnection(supabase, {
    provider: "telegram",
    externalChannelId: chatId,
  });

  if (!connection) {
    if (payload.message?.text) {
      await postTelegramMessage(
        chatId,
        "This Telegram chat is not connected to HyperOptimal Management yet. Connect it from Settings > Telegram, then try again.",
      ).catch(() => null);
    }
    return NextResponse.json({ ok: true, ignored: "connection_not_configured" });
  }

  const result = await handlePrivateChannelAgentMessage(supabase, connection, {
    provider: "telegram",
    externalChannelId: chatId,
    externalUserId: telegramUserId,
    externalUserName: telegramDisplayName(payload.message?.from),
    text: payload.message?.text ?? "",
    eventId: payload.update_id?.toString() ?? null,
    messageId: payload.message?.message_id?.toString() ?? null,
    payload: payload as unknown as Record<string, unknown>,
    source: "webhook",
  });
  const response = await postTelegramMessage(chatId, result.text);

  await saveIntegrationMessage(supabase, {
    connection,
    direction: "outbound",
    externalMessageId: response.result?.message_id?.toString(),
    messageText: result.text,
    payload: response,
    command: result.command,
    status: result.status === "failed" ? "failed" : result.status === "ignored" || result.status === "needs_confirmation" ? "ignored" : "sent",
  });

  return NextResponse.json({ ok: true });
}
