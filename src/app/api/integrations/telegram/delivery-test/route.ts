import { NextResponse } from "next/server";
import { postTelegramMessage } from "@/lib/integrations/telegram";
import {
  auditAction,
  jsonError,
  requireTenantAdmin,
  requireTenantContext,
} from "@/lib/tenant-context";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const context = await requireTenantContext(await createClient());
    requireTenantAdmin(context);
    const body = (await request.json().catch(() => ({}))) as { chatId?: string };
    const chatId = body.chatId?.trim();

    if (!chatId) {
      return NextResponse.json({ error: "Telegram chat is required." }, { status: 400 });
    }

    const result = await postTelegramMessage(
      chatId,
      "HyperOptimal Management Telegram delivery is working.",
    );

    await context.supabase.from("integration_outbound_messages").insert({
      tenant_id: context.tenant.id,
      provider: "telegram",
      target_id: chatId,
      message_text: "HyperOptimal Management Telegram delivery is working.",
      status: "sent",
      provider_message_id: result.result?.message_id?.toString() ?? null,
      payload: result,
      created_by_user_id: context.user.id,
    });

    await auditAction(context, "integration.telegram.delivery_test", {
      targetTable: "telegram_links",
      targetId: chatId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
