import { NextResponse } from "next/server";
import {
  jsonError,
  requireTenantAdmin,
  requireTenantContext,
} from "@/lib/tenant-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type TenantContext = Awaited<ReturnType<typeof requireTenantContext>>;
type AdminClient = ReturnType<typeof createAdminClient>;

async function getTenantMembership(
  admin: AdminClient,
  context: TenantContext,
  userId: string,
) {
  const { data: membership, error } = await admin
    .from("tenant_memberships")
    .select("user_id,role")
    .eq("tenant_id", context.tenant.id)
    .eq("user_id", userId)
    .is("archived_at", null)
    .maybeSingle<{ user_id: string; role: string }>();

  if (error) throw new Error(error.message);
  return membership;
}

async function assertCanChangeOwner(
  admin: AdminClient,
  context: TenantContext,
  membership: { user_id: string; role: string },
) {
  if (membership.role !== "owner") return null;

  const { count, error: countError } = await admin
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

async function auditTeamAction(
  admin: AdminClient,
  context: TenantContext,
  action: string,
  input: {
    targetId: string;
    metadata?: Record<string, unknown>;
  },
) {
  const { error } = await admin.from("admin_audit_log").insert({
    tenant_id: context.tenant.id,
    actor_user_id: context.user.id,
    action,
    target_table: "tenant_memberships",
    target_id: input.targetId,
    metadata: input.metadata ?? {},
  });

  if (error) throw new Error(error.message);
}

async function replacementOwnerId(
  admin: AdminClient,
  context: TenantContext,
  removedOwnerId: string,
) {
  const { data, error } = await admin
    .from("tenant_memberships")
    .select("user_id")
    .eq("tenant_id", context.tenant.id)
    .eq("role", "owner")
    .is("archived_at", null)
    .neq("user_id", removedOwnerId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ user_id: string }>();

  if (error) throw new Error(error.message);
  return data?.user_id ?? null;
}

async function transferOrganizationOwnerIfNeeded(
  admin: AdminClient,
  context: TenantContext,
  removedOwnerId: string,
) {
  if (context.tenant.owner_id !== removedOwnerId) return;

  const replacementId = await replacementOwnerId(admin, context, removedOwnerId);
  if (!replacementId) return;

  const { error } = await admin
    .from("organizations")
    .update({ owner_id: replacementId })
    .eq("id", context.tenant.id)
    .eq("owner_id", removedOwnerId);

  if (error) throw new Error(error.message);
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

    const admin = createAdminClient();
    const membership = await getTenantMembership(admin, context, id);
    if (!membership) {
      return NextResponse.json({ error: "Team member not found." }, { status: 404 });
    }

    if (body.role !== "owner") {
      const ownerGuard = await assertCanChangeOwner(admin, context, membership);
      if (ownerGuard) return ownerGuard;
    }

    const { error } = await admin
      .from("tenant_memberships")
      .update({ role: body.role })
      .eq("tenant_id", context.tenant.id)
      .eq("user_id", id)
      .is("archived_at", null);

    if (error) throw new Error(error.message);

    const { error: organizationMembershipError } = await admin
      .from("organization_memberships")
      .upsert(
        {
          organization_id: context.tenant.id,
          user_id: id,
          role: body.role,
        },
        { onConflict: "organization_id,user_id" },
      );

    if (organizationMembershipError) throw new Error(organizationMembershipError.message);

    if (membership.role === "owner" && body.role !== "owner") {
      await transferOrganizationOwnerIfNeeded(admin, context, id);
    }

    await auditTeamAction(admin, context, "team.member.role_changed", {
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

    const admin = createAdminClient();
    const membership = await getTenantMembership(admin, context, id);
    if (!membership) {
      return NextResponse.json({ error: "Team member not found." }, { status: 404 });
    }

    const ownerGuard = await assertCanChangeOwner(admin, context, membership);
    if (ownerGuard) return ownerGuard;

    const { error } = await admin
      .from("tenant_memberships")
      .update({ archived_at: new Date().toISOString() })
      .eq("tenant_id", context.tenant.id)
      .eq("user_id", id)
      .is("archived_at", null);

    if (error) throw new Error(error.message);

    const { error: organizationMembershipError } = await admin
      .from("organization_memberships")
      .delete()
      .eq("organization_id", context.tenant.id)
      .eq("user_id", id);

    if (organizationMembershipError) throw new Error(organizationMembershipError.message);

    if (membership.role === "owner") {
      await transferOrganizationOwnerIfNeeded(admin, context, id);
    }

    await auditTeamAction(admin, context, "team.member.removed", {
      targetId: id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
