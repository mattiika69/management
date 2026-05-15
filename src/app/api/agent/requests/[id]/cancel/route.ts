import { NextResponse } from "next/server";
import {
  auditAction,
  jsonError,
  requireTenantAdmin,
  requireTenantContext,
} from "@/lib/tenant-context";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const context = await requireTenantContext(await createClient());
    requireTenantAdmin(context);

    const { error } = await context.supabase
      .from("agent_requests")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("tenant_id", context.tenant.id);

    if (error) throw new Error(error.message);

    await auditAction(context, "agent.request.cancelled", {
      targetTable: "agent_requests",
      targetId: id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
