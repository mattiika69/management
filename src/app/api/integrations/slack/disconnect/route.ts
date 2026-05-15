import { NextResponse } from "next/server";
import {
  auditAction,
  jsonError,
  requireTenantAdmin,
  requireTenantContext,
} from "@/lib/tenant-context";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const context = await requireTenantContext(await createClient());
    requireTenantAdmin(context);
    const { error } = await context.supabase
      .from("integration_connections")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("organization_id", context.tenant.id)
      .eq("provider", "slack")
      .is("revoked_at", null);

    if (error) throw new Error(error.message);

    await auditAction(context, "integration.slack.disconnected", {
      targetTable: "integration_connections",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
