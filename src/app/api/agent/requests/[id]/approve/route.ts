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
      .update({ status: "approved" })
      .eq("id", id)
      .eq("tenant_id", context.tenant.id);

    if (error) throw new Error(error.message);

    await context.supabase.from("agent_approvals").insert({
      tenant_id: context.tenant.id,
      request_id: id,
      approved_by_user_id: context.user.id,
      status: "approved",
    });

    await auditAction(context, "agent.request.approved", {
      targetTable: "agent_requests",
      targetId: id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
