import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { ACTIVE_ORGANIZATION_COOKIE } from "@/lib/auth/organization";
import { enforceSameOrigin } from "@/lib/security/request-guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSessionClient } from "@/lib/supabase/server";
import { hashInvitationToken } from "@/lib/team/invitations";

type AcceptPayload = {
  token?: string;
};

type InvitationRow = {
  id: string;
  organization_id: string;
  email: string;
  role: "admin" | "member" | "viewer";
  accepted_at: string | null;
  revoked_at: string | null;
  expires_at: string;
};

type TenantInvitationRow = Omit<InvitationRow, "organization_id"> & {
  tenant_id: string;
};

type FoundInvitation = {
  invitation: InvitationRow | null;
  source: "tenant_invitations" | "organization_invitations" | null;
  error: string | null;
};

type UserProfile = {
  metadata: Record<string, unknown> | null;
};

function isVerifiedEmailUser(user: User) {
  return Boolean(user.email_confirmed_at || user.confirmed_at);
}

async function findInvitation(
  admin: ReturnType<typeof createAdminClient>,
  tokenHash: string,
): Promise<FoundInvitation> {
  const { data: tenantInvitation, error: tenantError } = await admin
    .from("tenant_invitations")
    .select("id,tenant_id,email,role,accepted_at,revoked_at,expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle<TenantInvitationRow>();

  if (tenantError) {
    return { invitation: null, source: null, error: tenantError.message };
  }

  if (tenantInvitation) {
    return {
      invitation: {
        id: tenantInvitation.id,
        organization_id: tenantInvitation.tenant_id,
        email: tenantInvitation.email,
        role: tenantInvitation.role,
        accepted_at: tenantInvitation.accepted_at,
        revoked_at: tenantInvitation.revoked_at,
        expires_at: tenantInvitation.expires_at,
      } satisfies InvitationRow,
      source: "tenant_invitations",
      error: null,
    };
  }

  const { data: organizationInvitation, error: organizationError } = await admin
    .from("organization_invitations")
    .select("id,organization_id,email,role,accepted_at,revoked_at,expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle<InvitationRow>();

  return {
    invitation: organizationInvitation,
    source: organizationInvitation ? "organization_invitations" : null,
    error: organizationError?.message ?? null,
  };
}

async function markInvitationAccepted(
  admin: ReturnType<typeof createAdminClient>,
  input: {
    invitation: InvitationRow;
    tokenHash: string;
    userId: string;
    acceptedAt: string;
  },
) {
  const organizationUpdate = await admin
    .from("organization_invitations")
    .update({
      accepted_at: input.acceptedAt,
      accepted_by: input.userId,
    })
    .eq("organization_id", input.invitation.organization_id)
    .eq("token_hash", input.tokenHash)
    .is("accepted_at", null)
    .is("revoked_at", null);

  if (organizationUpdate.error) {
    return organizationUpdate.error.message;
  }

  const tenantUpdate = await admin
    .from("tenant_invitations")
    .update({
      accepted_at: input.acceptedAt,
      accepted_by_user_id: input.userId,
    })
    .eq("tenant_id", input.invitation.organization_id)
    .eq("token_hash", input.tokenHash)
    .is("accepted_at", null)
    .is("revoked_at", null);

  return tenantUpdate.error?.message ?? null;
}

async function saveActiveOrganization(
  admin: ReturnType<typeof createAdminClient>,
  input: {
    userId: string;
    email: string;
    organizationId: string;
  },
) {
  const { data: profile, error: profileError } = await admin
    .from("user_profiles")
    .select("metadata")
    .eq("user_id", input.userId)
    .maybeSingle<UserProfile>();

  if (profileError) {
    return profileError.message;
  }

  const metadata = {
    ...(profile?.metadata ?? {}),
    active_tenant_id: input.organizationId,
  };

  const { error } = await admin
    .from("user_profiles")
    .upsert(
      {
        user_id: input.userId,
        email: input.email,
        metadata,
      },
      { onConflict: "user_id" },
    );

  return error?.message ?? null;
}

export async function POST(request: Request) {
  const originGuard = enforceSameOrigin(request);
  if (originGuard) return originGuard;

  const payload = (await request.json()) as AcceptPayload;
  const token = payload.token?.trim();

  if (!token) {
    return NextResponse.json({ error: "Invitation token is required." }, { status: 400 });
  }

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  if (!isVerifiedEmailUser(user)) {
    return NextResponse.json(
      { error: "Confirm your email before accepting this invitation." },
      { status: 403 },
    );
  }

  const admin = createAdminClient();
  const tokenHash = hashInvitationToken(token);
  const { invitation, error: invitationError } = await findInvitation(admin, tokenHash);

  if (invitationError) {
    return NextResponse.json({ error: invitationError }, { status: 400 });
  }

  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
  }

  if (invitation.accepted_at || invitation.revoked_at) {
    return NextResponse.json(
      { error: "This invitation is no longer active." },
      { status: 410 },
    );
  }

  if (new Date(invitation.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "This invitation has expired." }, { status: 410 });
  }

  if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json(
      { error: `Sign in as ${invitation.email} to accept this invitation.` },
      { status: 403 },
    );
  }

  const { data: existingMembership, error: membershipSelectError } = await admin
    .from("organization_memberships")
    .select("role")
    .eq("organization_id", invitation.organization_id)
    .eq("user_id", user.id)
    .maybeSingle<{ role: string }>();

  if (membershipSelectError) {
    return NextResponse.json({ error: membershipSelectError.message }, { status: 400 });
  }

  if (!existingMembership) {
    const { error: membershipInsertError } = await admin
      .from("organization_memberships")
      .insert({
        organization_id: invitation.organization_id,
        user_id: user.id,
        role: invitation.role,
      });

    if (membershipInsertError) {
      return NextResponse.json({ error: membershipInsertError.message }, { status: 400 });
    }
  } else if (existingMembership.role !== invitation.role) {
    const { error: membershipUpdateError } = await admin
      .from("organization_memberships")
      .update({ role: invitation.role })
      .eq("organization_id", invitation.organization_id)
      .eq("user_id", user.id);

    if (membershipUpdateError) {
      return NextResponse.json({ error: membershipUpdateError.message }, { status: 400 });
    }
  }

  const { error: tenantMembershipError } = await admin
    .from("tenant_memberships")
    .upsert(
      {
        tenant_id: invitation.organization_id,
        user_id: user.id,
        role: invitation.role,
        archived_at: null,
      },
      { onConflict: "tenant_id,user_id" },
    );

  if (tenantMembershipError) {
    return NextResponse.json({ error: tenantMembershipError.message }, { status: 400 });
  }

  const acceptedAt = new Date().toISOString();
  const invitationUpdateError = await markInvitationAccepted(admin, {
    invitation,
    tokenHash,
    userId: user.id,
    acceptedAt,
  });

  if (invitationUpdateError) {
    return NextResponse.json({ error: invitationUpdateError }, { status: 400 });
  }

  const profileError = await saveActiveOrganization(admin, {
    userId: user.id,
    email: user.email,
    organizationId: invitation.organization_id,
  });

  if (profileError) {
    return NextResponse.json({ error: profileError }, { status: 400 });
  }

  await admin.from("admin_audit_log").insert({
    tenant_id: invitation.organization_id,
    actor_user_id: user.id,
    action: "team.invitation.accepted",
    target_table: "tenant_invitations",
    target_id: invitation.id,
    metadata: { email: invitation.email, role: invitation.role },
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ACTIVE_ORGANIZATION_COOKIE, invitation.organization_id, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
