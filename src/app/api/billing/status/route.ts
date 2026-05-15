import { NextResponse } from "next/server";
import { jsonError, requireTenantContext } from "@/lib/tenant-context";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const context = await requireTenantContext(await createClient());
    const { data: subscription } = await context.supabase
      .from("billing_subscriptions")
      .select("*")
      .eq("tenant_id", context.tenant.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data: legacySubscription } = await context.supabase
      .from("subscriptions")
      .select("*")
      .eq("organization_id", context.tenant.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      subscription: subscription ?? legacySubscription ?? null,
    });
  } catch (error) {
    return jsonError(error);
  }
}
