import { NextResponse } from "next/server";
import { jsonError, requireTenantContext } from "@/lib/tenant-context";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const context = await requireTenantContext(await createClient());
    const { data, error } = await context.supabase
      .from("tenant_memberships")
      .select("tenant_id,user_id,role,stripe_seat_status,created_at,updated_at")
      .eq("tenant_id", context.tenant.id)
      .is("archived_at", null)
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);

    return NextResponse.json({ members: data ?? [] });
  } catch (error) {
    return jsonError(error);
  }
}
