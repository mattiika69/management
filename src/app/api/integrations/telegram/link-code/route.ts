import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, requireTenantContext } from "@/lib/tenant-context";

function buildDeepLink(code: string) {
  const username = process.env.TELEGRAM_BOT_USERNAME?.trim();
  return username ? `https://t.me/${username}?start=${code}` : null;
}

export async function POST() {
  try {
    const context = await requireTenantContext(await createClient());
    const code = randomBytes(8).toString("hex").toUpperCase();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error } = await context.supabase.from("telegram_link_codes").insert({
      code,
      user_id: context.user.id,
      organization_id: context.tenant.id,
      expires_at: expiresAt,
    });

    if (error) {
      return NextResponse.json(
        { error: "Telegram link code could not be created." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      code,
      expiresAt,
      deepLink: buildDeepLink(code),
      botUsername: process.env.TELEGRAM_BOT_USERNAME?.trim() || null,
    });
  } catch (error) {
    return jsonError(error);
  }
}
