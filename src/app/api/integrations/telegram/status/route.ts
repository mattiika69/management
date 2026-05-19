import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, requireTenantContext } from "@/lib/tenant-context";

export async function GET() {
  try {
    const context = await requireTenantContext(await createClient());
    const { data, error } = await context.supabase
      .from("integration_connections")
      .select("id,display_name,external_channel_id,external_user_id,created_at")
      .eq("organization_id", context.tenant.id)
      .eq("provider", "telegram")
      .is("revoked_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Telegram connection status could not be loaded." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      botUsername: process.env.TELEGRAM_BOT_USERNAME?.trim() || null,
      connected: Boolean(data?.length),
      connections: data ?? [],
    });
  } catch (error) {
    return jsonError(error);
  }
}
