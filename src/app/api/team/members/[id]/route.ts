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

async function assertCanChangeOwner(context: Awaited<ReturnType<typeof requireTenantContext>>, userId: string) {
  const { data: membership, error: membershipError } = await context.supabase
    .from("tenant_memberships")
    .select("role")
    .eq("tenant_id", context.tenant.id)
    .eq("user_id", userId)
    .is("archived_at", null)
    .maybeSingle<{ role: string }>();

  if (membershipError) throw new Error(membershipError.message);
  if (!membership) {
    return NextResponse.json({ error: "Team member not found." }, { status: 404 });
  }

  if (membership.role !== "owner") return null;

  const { count, error: countError } = await context.supabase
    .from("tenant_memberships")
    .select("user_id", { count: "exact", head: true })
    .eq("tenant_id", context.tenant.id)
    .eq("role", "owner")
    .is("archived_at", null);

  if (countError) throw new Error(countError.message);

  if ((count ?? 0) <= 1) {
    return NextResponse.json(
      { error: "Add another owner before changing or removing this owner." },
      { status: 400 },
    );
  }

  return null;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const context = await requireTenantContext(await createClient());
    requireTenantAdmin(context);
    const body = (await request.json()) as { role?: string };

    if (!body.role || !["owner", "admin", "member", "viewer"].includes(body.role)) {
      return NextResponse.json({ error: "Valid role is required." }, { status: 400 });
    }

    if (id === context.user.id) {
      return NextResponse.json({ error: "You cannot change your own role." }, { status: 400 });
    }

    if (body.role !== "owner") {
      const ownerGuard = await assertCanChangeOwner(context, id);
      if (ownerGuard) return ownerGuard;
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

    const ownerGuard = await assertCanChangeOwner(context, id);
    if (ownerGuard) return ownerGuard;

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
