import { NextResponse } from "next/server";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const organization = await getOrCreateDefaultOrganization(supabase, user);
  const { data, error } = await supabase
    .from("integration_connections")
    .select("id,display_name,external_channel_id,external_user_id,created_at")
    .eq("organization_id", organization.id)
    .eq("provider", "telegram")
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    botUsername: process.env.TELEGRAM_BOT_USERNAME?.trim() || null,
    connected: Boolean(data?.length),
    connections: data ?? [],
  });
}
