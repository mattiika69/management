import { NextResponse } from "next/server";
import {
  findIntegrationConnection,
  hasProcessedIntegrationEvent,
  saveIntegrationMessage,
  upsertIntegrationConnection,
} from "@/lib/integrations/connections";
import { handleHyperoptimalCommand } from "@/lib/integrations/hyperoptimal-commands";
import {
  postTelegramMessage,
  verifyTelegramRequest,
} from "@/lib/integrations/telegram";
import { normalizeTelegramUsername } from "@/lib/integrations/telegram-username";
import { createAdminClient } from "@/lib/supabase/admin";

type TelegramUpdate = {
  update_id?: number;
  message?: {
    message_id?: number;
    text?: string;
    chat?: { id?: number | string };
    from?: { id?: number | string; username?: string };
  };
};

type LinkCodeRow = {
  id: string;
  user_id: string;
  organization_id: string;
  expires_at: string;
  used_at: string | null;
};

async function connectTelegramCode(
  chatId: string,
  telegramUserId: string | undefined,
  telegramUsername: string | undefined,
  text: string | undefined,
) {
  const match = text?.match(/^\/start\s+([A-F0-9]+)$/i);
  if (!match || !telegramUserId) return null;

  const supabase = createAdminClient();
  const { data: code, error } = await supabase
    .from("telegram_link_codes")
    .select("id,user_id,organization_id,expires_at,used_at")
    .eq("code", match[1].toUpperCase())
    .maybeSingle<LinkCodeRow>();

  if (error) throw new Error(error.message);
  if (!code || code.used_at || new Date(code.expires_at).getTime() < Date.now()) {
    await postTelegramMessage(chatId, "That HyperOptimal Management link code is invalid or expired.");
    return { handled: true };
  }

  await supabase
    .from("telegram_link_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("id", code.id);
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
  return { handled: true };
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

  if (payload.update_id) {
    const duplicate = await hasProcessedIntegrationEvent(
      createAdminClient(),
      "telegram",
      payload.update_id.toString(),
    );
    if (duplicate) return NextResponse.json({ ok: true, duplicate: true });
  }

  const connected = await connectTelegramCode(
    chatId,
    telegramUserId,
    payload.message?.from?.username,
    payload.message?.text,
  );
  if (connected?.handled) {
    return NextResponse.json({ ok: true });
  }

  const supabase = createAdminClient();
  const connection = await findIntegrationConnection(supabase, {
    provider: "telegram",
    externalChannelId: chatId,
  });

  if (!connection) {
    return NextResponse.json({ ok: true, ignored: "connection_not_configured" });
  }

  await saveIntegrationMessage(supabase, {
    connection,
    direction: "inbound",
    externalUserId: telegramUserId,
    externalMessageId: payload.message?.message_id?.toString(),
    messageText: payload.message?.text,
    payload,
  });

  const result = await handleHyperoptimalCommand(
    supabase,
    connection,
    payload.message?.text ?? "",
    { externalUserId: telegramUserId },
  );
  const response = await postTelegramMessage(chatId, result.text);

  await saveIntegrationMessage(supabase, {
    connection,
    direction: "outbound",
    externalMessageId: response.result?.message_id?.toString(),
    messageText: result.text,
    payload: response,
    command: result.command,
    status: "sent",
  });

  return NextResponse.json({ ok: true });
}
