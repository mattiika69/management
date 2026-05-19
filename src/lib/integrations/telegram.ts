import "server-only";
import { constantTimeEquals } from "@/lib/security/request-guards";

export function verifyTelegramRequest(request: Request) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!expectedSecret) {
    throw new Error("TELEGRAM_WEBHOOK_SECRET is not configured.");
  }

  return constantTimeEquals(
    request.headers.get("x-telegram-bot-api-secret-token"),
    expectedSecret,
  );
}

export async function postTelegramMessage(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured.");
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  const body = (await response.json()) as { ok?: boolean; description?: string; result?: { message_id?: number } };

  if (!body.ok) {
    throw new Error(body.description ?? "Telegram message failed.");
  }

  return body;
}
