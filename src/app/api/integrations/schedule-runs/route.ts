import { NextResponse } from "next/server";
import { jsonError, requireTenantContext } from "@/lib/tenant-context";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const context = await requireTenantContext(await createClient());
    const { data, error } = await context.supabase
      .from("integration_workflow_runs")
      .select("*")
      .eq("tenant_id", context.tenant.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);

    return NextResponse.json({ runs: data ?? [] });
  } catch (error) {
    return jsonError(error);
  }
}
