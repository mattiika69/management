import { NextResponse } from "next/server";
import {
  jsonError,
  requireTenantAdmin,
  requireTenantContext,
} from "@/lib/tenant-context";
import { enforceSameOrigin } from "@/lib/security/request-guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type MemberPatchBody = {
  displayName?: string;
  email?: string;
  phone?: string;
  role?: string;
};

type UserProfileRow = {
  email: string | null;
  display_name: string | null;
  metadata: Record<string, unknown> | null;
};

type TenantContext = Awaited<ReturnType<typeof requireTenantContext>>;
type AdminClient = ReturnType<typeof createAdminClient>;
const allowedRoles = ["owner", "admin", "member", "viewer"] as const;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[0-9+().\-\s]{0,40}$/;

function normalizeText(value: unknown, maxLength: number) {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function normalizeEmail(value: unknown) {
  const normalized = normalizeText(value, 254);
  if (normalized === undefined) return undefined;
  if (!normalized) return null;

  const email = normalized.toLowerCase();
  return emailPattern.test(email) ? email : "";
}

function normalizePhone(value: unknown) {
  const normalized = normalizeText(value, 40);
  if (normalized === undefined) return undefined;
  if (!normalized) return null;
  return phonePattern.test(normalized) ? normalized : "";
}

function normalizedMetadata(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!metadata || Array.isArray(metadata) || typeof metadata !== "object") return {};
  return { ...metadata };
}

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

async function updateMemberProfile(
  admin: AdminClient,
  userId: string,
  input: {
    displayName?: string | null;
    email?: string | null;
    phone?: string | null;
  },
) {
  const updatesProfile =
    input.displayName !== undefined ||
    input.email !== undefined ||
    input.phone !== undefined;

  if (!updatesProfile) return;

  const { data: profile, error: profileError } = await admin
    .from("user_profiles")
    .select("email,display_name,metadata")
    .eq("user_id", userId)
    .maybeSingle<UserProfileRow>();

  if (profileError) throw new Error(profileError.message);

  const metadata = normalizedMetadata(profile?.metadata);
  if (input.phone !== undefined) {
    if (input.phone) {
      metadata.phone = input.phone;
    } else {
      delete metadata.phone;
    }
  }

  const { error } = await admin.from("user_profiles").upsert(
    {
      user_id: userId,
      email: input.email !== undefined ? input.email : profile?.email ?? null,
      display_name:
        input.displayName !== undefined ? input.displayName : profile?.display_name ?? null,
      metadata,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

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
    const originGuard = enforceSameOrigin(request);
    if (originGuard) return originGuard;

    const { id } = await params;
    const context = await requireTenantContext(await createClient());
    requireTenantAdmin(context);
    const body = (await request.json().catch(() => ({}))) as MemberPatchBody;
    const nextRole = typeof body.role === "string" ? body.role.trim() : undefined;
    const displayName = normalizeText(body.displayName, 120);
    const email = normalizeEmail(body.email);
    const phone = normalizePhone(body.phone);

    if (nextRole !== undefined && !allowedRoles.includes(nextRole as (typeof allowedRoles)[number])) {
      return NextResponse.json({ error: "Valid role is required." }, { status: 400 });
    }

    if (displayName === "" || email === "" || phone === "") {
      return NextResponse.json(
        { error: "Enter a valid name, email, and phone number." },
        { status: 400 },
      );
    }

    if (
      nextRole === undefined &&
      displayName === undefined &&
      email === undefined &&
      phone === undefined
    ) {
      return NextResponse.json({ error: "No member updates were provided." }, { status: 400 });
    }

    if (id === context.user.id && nextRole !== undefined && nextRole !== context.role) {
      return NextResponse.json({ error: "You cannot change your own role." }, { status: 400 });
    }

    const admin = createAdminClient();
    const membership = await getTenantMembership(admin, context, id);
    if (!membership) {
      return NextResponse.json({ error: "Team member not found." }, { status: 404 });
    }

    if (nextRole !== undefined && nextRole !== "owner") {
      const ownerGuard = await assertCanChangeOwner(admin, context, membership);
      if (ownerGuard) return ownerGuard;
    }

    if (nextRole !== undefined && nextRole !== membership.role) {
      const { error } = await admin
        .from("tenant_memberships")
        .update({ role: nextRole })
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
            role: nextRole,
          },
          { onConflict: "organization_id,user_id" },
        );

      if (organizationMembershipError) throw new Error(organizationMembershipError.message);

      if (membership.role === "owner" && nextRole !== "owner") {
        await transferOrganizationOwnerIfNeeded(admin, context, id);
      }
    }

    await updateMemberProfile(admin, id, { displayName, email, phone });

    await auditTeamAction(admin, context, "team.member.updated", {
      targetId: id,
      metadata: {
        fields: {
          displayName: displayName !== undefined,
          email: email !== undefined,
          phone: phone !== undefined,
          role: nextRole !== undefined,
        },
        role: nextRole,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const originGuard = enforceSameOrigin(request);
    if (originGuard) return originGuard;

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
