import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hashInvitationToken } from "@/lib/team/invitations";

type AcceptPayload = {
  token?: string;
};

type InvitationRow = {
  id: string;
  organization_id: string;
  email: string;
  role: "admin" | "member";
  accepted_at: string | null;
  revoked_at: string | null;
  expires_at: string;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as AcceptPayload;
  const token = payload.token?.trim();

  if (!token) {
    return NextResponse.json({ error: "Invitation token is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const admin = createAdminClient();
  const tokenHash = hashInvitationToken(token);
  const { data: invitation, error: invitationError } = await admin
    .from("organization_invitations")
    .select("id,organization_id,email,role,accepted_at,revoked_at,expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle<InvitationRow>();

  if (invitationError) {
    return NextResponse.json({ error: invitationError.message }, { status: 400 });
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
  }

  const { error: tenantMembershipError } = await admin
    .from("tenant_memberships")
    .upsert(
      {
        tenant_id: invitation.organization_id,
        user_id: user.id,
        role: invitation.role,
      },
      { onConflict: "tenant_id,user_id" },
    );

  if (tenantMembershipError) {
    return NextResponse.json({ error: tenantMembershipError.message }, { status: 400 });
  }

  const { error: invitationUpdateError } = await admin
    .from("organization_invitations")
    .update({
      accepted_at: new Date().toISOString(),
      accepted_by: user.id,
    })
    .eq("id", invitation.id);

  if (invitationUpdateError) {
    return NextResponse.json({ error: invitationUpdateError.message }, { status: 400 });
  }

  await admin.from("tenant_invitations").update({
    accepted_at: new Date().toISOString(),
    accepted_by_user_id: user.id,
  }).eq("id", invitation.id);

  await admin.from("admin_audit_log").insert({
    tenant_id: invitation.organization_id,
    actor_user_id: user.id,
    action: "team.invitation.accepted",
    target_table: "tenant_invitations",
    target_id: invitation.id,
    metadata: { email: invitation.email, role: invitation.role },
  });

  return NextResponse.json({ ok: true });
}
