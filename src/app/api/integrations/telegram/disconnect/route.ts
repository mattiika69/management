import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, requireTenantContext } from "@/lib/tenant-context";

export async function POST() {
  try {
    const context = await requireTenantContext(await createClient());
    const { error } = await context.supabase
      .from("integration_connections")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("organization_id", context.tenant.id)
      .eq("provider", "telegram")
      .is("revoked_at", null);

    if (error) {
      return NextResponse.json(
        { error: "Telegram could not be disconnected." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
