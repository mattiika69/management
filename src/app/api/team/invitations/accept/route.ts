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

type AcceptResult = {
  ok: boolean;
  tenant_id: string | null;
  invitation_id: string | null;
  status: string;
  message: string;
};

type InvitationRecord = {
  id: string;
  organization_id: string;
  email: string;
  role: string;
  accepted_at: string | null;
  revoked_at: string | null;
  expires_at: string;
};

type TenantInvitationRecord = Omit<InvitationRecord, "organization_id"> & {
  tenant_id: string;
};

type OrganizationRecord = {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
};

type UserProfileRecord = {
  metadata: Record<string, unknown> | null;
};

function statusCodeFor(result: AcceptResult) {
  if (result.ok) return 200;
  if (result.status === "authentication_required") return 401;
  if (result.status === "email_unconfirmed" || result.status === "wrong_email") return 403;
  if (result.status === "expired" || result.status === "inactive") return 410;
  if (result.status === "not_found") return 404;
  return 400;
}

function result(
  ok: boolean,
  status: string,
  message: string,
  tenantId: string | null = null,
  invitationId: string | null = null,
): AcceptResult {
  return {
    ok,
    tenant_id: tenantId,
    invitation_id: invitationId,
    status,
    message,
  };
}

function normalizedMetadata(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!metadata || Array.isArray(metadata) || typeof metadata !== "object") return {};
  return { ...metadata };
}

async function findInvitation(tokenHash: string) {
  const admin = createAdminClient();
  const { data: tenantInvitation, error: tenantError } = await admin
    .from("tenant_invitations")
    .select("id,tenant_id,email,role,accepted_at,revoked_at,expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle<TenantInvitationRecord>();

  if (tenantError) throw new Error(tenantError.message);

  if (tenantInvitation) {
    return {
      id: tenantInvitation.id,
      organization_id: tenantInvitation.tenant_id,
      email: tenantInvitation.email,
      role: tenantInvitation.role,
      accepted_at: tenantInvitation.accepted_at,
      revoked_at: tenantInvitation.revoked_at,
      expires_at: tenantInvitation.expires_at,
    } satisfies InvitationRecord;
  }

  const { data: organizationInvitation, error: organizationError } = await admin
    .from("organization_invitations")
    .select("id,organization_id,email,role,accepted_at,revoked_at,expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle<InvitationRecord>();

  if (organizationError) throw new Error(organizationError.message);
  return organizationInvitation;
}

async function ensureTenantRecord(organizationId: string) {
  const admin = createAdminClient();
  const { data: organization, error: organizationError } = await admin
    .from("organizations")
    .select("id,name,slug,owner_id")
    .eq("id", organizationId)
    .maybeSingle<OrganizationRecord>();

  if (organizationError) throw new Error(organizationError.message);
  if (!organization) return false;

  const { error: tenantError } = await admin.from("tenants").upsert(
    {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      owner_user_id: organization.owner_id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (tenantError) throw new Error(tenantError.message);
  return true;
}

async function acceptWithServerFallback(
  tokenHash: string,
  user: User,
): Promise<AcceptResult> {
  if (!user.email) {
    return result(false, "authentication_required", "Sign in to accept this invitation.");
  }

  const admin = createAdminClient();
  const { data: authUser, error: authUserError } = await admin.auth.admin.getUserById(user.id);
  if (authUserError || !authUser.user) {
    return result(false, "authentication_required", "Sign in to accept this invitation.");
  }

  const currentEmail = (authUser.user.email ?? user.email).toLowerCase();
  if (!authUser.user.email_confirmed_at) {
    return result(false, "email_unconfirmed", "Confirm your email before accepting this invitation.");
  }

  const invitation = await findInvitation(tokenHash);
  if (!invitation) {
    return result(false, "not_found", "Invitation not found.");
  }

  if (invitation.accepted_at || invitation.revoked_at) {
    return result(
      false,
      "inactive",
      "This invitation is no longer active.",
      invitation.organization_id,
      invitation.id,
    );
  }

  if (new Date(invitation.expires_at).getTime() < Date.now()) {
    return result(
      false,
      "expired",
      "This invitation has expired.",
      invitation.organization_id,
      invitation.id,
    );
  }

  if (invitation.email.toLowerCase() !== currentEmail) {
    return result(
      false,
      "wrong_email",
      `Sign in as ${invitation.email} to accept this invitation.`,
      invitation.organization_id,
      invitation.id,
    );
  }

  const tenantReady = await ensureTenantRecord(invitation.organization_id);
  if (!tenantReady) {
    return result(false, "not_found", "Workspace not found.", invitation.organization_id, invitation.id);
  }

  const now = new Date().toISOString();
  const { error: legacyMembershipError } = await admin
    .from("organization_memberships")
    .upsert(
      {
        organization_id: invitation.organization_id,
        user_id: user.id,
        role: invitation.role,
      },
      { onConflict: "organization_id,user_id" },
    );

  if (legacyMembershipError) throw new Error(legacyMembershipError.message);

  const { error: tenantMembershipError } = await admin
    .from("tenant_memberships")
    .upsert(
      {
        tenant_id: invitation.organization_id,
        user_id: user.id,
        role: invitation.role,
        archived_at: null,
        updated_at: now,
      },
      { onConflict: "tenant_id,user_id" },
    );

  if (tenantMembershipError) throw new Error(tenantMembershipError.message);

  const { error: organizationInvitationError } = await admin
    .from("organization_invitations")
    .update({
      accepted_at: now,
      accepted_by: user.id,
    })
    .eq("organization_id", invitation.organization_id)
    .eq("token_hash", tokenHash)
    .is("accepted_at", null)
    .is("revoked_at", null);

  if (organizationInvitationError) throw new Error(organizationInvitationError.message);

  const { error: tenantInvitationError } = await admin
    .from("tenant_invitations")
    .update({
      accepted_at: now,
      accepted_by_user_id: user.id,
    })
    .eq("tenant_id", invitation.organization_id)
    .eq("token_hash", tokenHash)
    .is("accepted_at", null)
    .is("revoked_at", null);

  if (tenantInvitationError) throw new Error(tenantInvitationError.message);

  const { data: profile } = await admin
    .from("user_profiles")
    .select("metadata")
    .eq("user_id", user.id)
    .maybeSingle<UserProfileRecord>();
  const metadata = {
    ...normalizedMetadata(profile?.metadata),
    active_tenant_id: invitation.organization_id,
  };

  const { error: profileError } = await admin.from("user_profiles").upsert(
    {
      user_id: user.id,
      email: currentEmail,
      display_name:
        (authUser.user.user_metadata?.full_name as string | undefined) ??
        (authUser.user.user_metadata?.name as string | undefined) ??
        null,
      metadata,
      updated_at: now,
    },
    { onConflict: "user_id" },
  );

  if (profileError) throw new Error(profileError.message);

  const { error: auditError } = await admin.from("admin_audit_log").insert({
    tenant_id: invitation.organization_id,
    actor_user_id: user.id,
    action: "team.invitation.accepted",
    target_table: "tenant_invitations",
    target_id: invitation.id,
    metadata: { email: invitation.email, role: invitation.role },
  });

  if (auditError) throw new Error(auditError.message);

  return result(
    true,
    "accepted",
    "Invitation accepted.",
    invitation.organization_id,
    invitation.id,
  );
}

export async function POST(request: Request) {
  const originGuard = enforceSameOrigin(request);
  if (originGuard) return originGuard;

  const payload = (await request.json().catch(() => ({}))) as AcceptPayload;
  const token = payload.token?.trim();

  if (!token || token.length > 256) {
    return NextResponse.json({ error: "Invitation token is required." }, { status: 400 });
  }

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const tokenHash = hashInvitationToken(token);
  const { data, error } = await supabase.rpc("accept_team_invitation", {
    invite_token_hash: tokenHash,
  });

  let resultData: AcceptResult | undefined;
  if (error) {
    try {
      resultData = await acceptWithServerFallback(tokenHash, user);
    } catch {
      return NextResponse.json(
        { error: "Invitation could not be accepted." },
        { status: 400 },
      );
    }
  } else {
    resultData = Array.isArray(data) ? (data[0] as AcceptResult | undefined) : undefined;
  }

  if (!resultData) {
    try {
      resultData = await acceptWithServerFallback(tokenHash, user);
    } catch {
      return NextResponse.json(
        { error: "Invitation could not be accepted." },
        { status: 400 },
      );
    }
  }

  if (!resultData.ok || !resultData.tenant_id) {
    return NextResponse.json(
      { error: resultData.message || "Invitation could not be accepted." },
      { status: statusCodeFor(resultData) },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ACTIVE_ORGANIZATION_COOKIE, resultData.tenant_id, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
