import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { createClient } from "@/lib/supabase/server";

function buildDeepLink(code: string) {
  const username = process.env.TELEGRAM_BOT_USERNAME?.trim();
  return username ? `https://t.me/${username}?start=${code}` : null;
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const organization = await getOrCreateDefaultOrganization(supabase, user);
  const code = randomBytes(8).toString("hex").toUpperCase();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const { error } = await supabase.from("telegram_link_codes").insert({
    code,
    user_id: user.id,
    organization_id: organization.id,
    expires_at: expiresAt,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    code,
    expiresAt,
    deepLink: buildDeepLink(code),
    botUsername: process.env.TELEGRAM_BOT_USERNAME?.trim() || null,
  });
}
