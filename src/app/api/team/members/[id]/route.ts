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

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const context = await requireTenantContext(await createClient());
    requireTenantAdmin(context);
    const body = (await request.json()) as { role?: string };

    if (!body.role || !["owner", "admin", "member", "viewer"].includes(body.role)) {
      return NextResponse.json({ error: "Valid role is required." }, { status: 400 });
    }

    const { error } = await context.supabase
      .from("tenant_memberships")
      .update({ role: body.role })
      .eq("tenant_id", context.tenant.id)
      .eq("user_id", id);

    if (error) throw new Error(error.message);

    await context.supabase
      .from("organization_memberships")
      .update({ role: body.role })
      .eq("organization_id", context.tenant.id)
      .eq("user_id", id);

    await auditAction(context, "team.member.role_changed", {
      targetTable: "tenant_memberships",
      targetId: id,
      metadata: { role: body.role },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const context = await requireTenantContext(await createClient());
    requireTenantAdmin(context);

    if (id === context.user.id) {
      return NextResponse.json({ error: "You cannot remove yourself." }, { status: 400 });
    }

    const { error } = await context.supabase
      .from("tenant_memberships")
      .update({ archived_at: new Date().toISOString() })
      .eq("tenant_id", context.tenant.id)
      .eq("user_id", id);

    if (error) throw new Error(error.message);

    await context.supabase
      .from("organization_memberships")
      .delete()
      .eq("organization_id", context.tenant.id)
      .eq("user_id", id);

    await auditAction(context, "team.member.removed", {
      targetTable: "tenant_memberships",
      targetId: id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
