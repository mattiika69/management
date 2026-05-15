import { NextResponse } from "next/server";
import { jsonError, requireTenantContext } from "@/lib/tenant-context";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const context = await requireTenantContext(await createClient());
    const { data, error } = await context.supabase
      .from("integration_connections")
      .select("id,provider,status,display_name,external_team_id,external_channel_id,external_user_id,created_at")
      .eq("organization_id", context.tenant.id)
      .is("revoked_at", null)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return NextResponse.json({ integrations: data ?? [] });
  } catch (error) {
    return jsonError(error);
  }
}
