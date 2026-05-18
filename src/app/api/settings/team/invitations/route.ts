import { NextResponse } from "next/server";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { getResend, getResendFromEmail, normalizeEmail } from "@/lib/resend/server";
import { createClient } from "@/lib/supabase/server";
import { buildTeamInviteEmail } from "@/lib/team/email";
import {
  buildInviteUrl,
  createInvitationToken,
  hashInvitationToken,
  isTeamRole,
} from "@/lib/team/invitations";
import { canManageTeam, getMembershipRole } from "@/lib/team/permissions";

type InvitePayload = {
  email?: string;
  role?: string;
};

type InvitationRow = {
  id: string;
};

function appOrigin(request: Request) {
  return process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
}

export async function POST(request: Request) {
  const payload = (await request.json()) as InvitePayload;
  const email = normalizeEmail(payload.email);
  const role = payload.role?.trim() ?? "member";

  if (!email || !isTeamRole(role)) {
    return NextResponse.json(
      { error: "A valid email and role are required." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const organization = await getOrCreateDefaultOrganization(supabase, user);
  const membershipRole = await getMembershipRole(supabase, organization.id, user);

  if (!canManageTeam(membershipRole)) {
    return NextResponse.json(
      { error: "Only workspace owners and admins can invite team members." },
      { status: 403 },
    );
  }

  if (email === user.email.toLowerCase()) {
    return NextResponse.json(
      { error: "You are already a member of this workspace." },
      { status: 400 },
    );
  }

  const token = createInvitationToken();
  const tokenHash = hashInvitationToken(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: existingInvitation, error: existingError } = await supabase
    .from("organization_invitations")
    .select("id")
    .eq("organization_id", organization.id)
    .eq("email", email)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .maybeSingle<InvitationRow>();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 400 });
  }

  const invitationQuery = existingInvitation
    ? supabase
        .from("organization_invitations")
        .update({
          role,
          token_hash: tokenHash,
          invited_by: user.id,
          expires_at: expiresAt,
        })
        .eq("id", existingInvitation.id)
        .select("id")
        .single<InvitationRow>()
    : supabase
        .from("organization_invitations")
        .insert({
          organization_id: organization.id,
          email,
          role,
          token_hash: tokenHash,
          invited_by: user.id,
          expires_at: expiresAt,
        })
        .select("id")
        .single<InvitationRow>();

  const { data: invitation, error: invitationError } = await invitationQuery;

  if (invitationError) {
    return NextResponse.json({ error: invitationError.message }, { status: 400 });
  }

  const inviteUrl = buildInviteUrl(appOrigin(request), token);
  const { subject, text, html } = buildTeamInviteEmail({
    inviteUrl,
    organizationName: organization.name,
    inviterEmail: user.email,
    role,
  });

  const { data: emailMessage, error: emailInsertError } = await supabase
    .from("email_messages")
    .insert({
      organization_id: organization.id,
      tenant_id: organization.id,
      created_by: user.id,
      to_email: email,
      subject,
      text_body: text,
      html_body: html,
      metadata: {
        source: "team_invitation",
        invitation_id: invitation.id,
      },
    })
    .select("id")
    .single<{ id: string }>();

  if (emailInsertError) {
    return NextResponse.json({ error: emailInsertError.message }, { status: 400 });
  }

  try {
    const result = await getResend().emails.send({
      from: getResendFromEmail(),
      to: email,
      subject,
      text,
      html,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    const { error: updateError } = await supabase
      .from("email_messages")
      .update({
        status: "sent",
        external_message_id: result.data?.id,
        metadata: {
          source: "team_invitation",
          invitation_id: invitation.id,
          provider_response: result.data,
        },
      })
      .eq("id", emailMessage.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    await supabase
      .from("tenant_invitations")
      .update({ email_delivery_status: "sent" })
      .eq("id", invitation.id);

    return NextResponse.json({ ok: true, id: invitation.id });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invitation email failed.";

    await supabase
      .from("email_messages")
      .update({
        status: "failed",
        error_message: message,
        metadata: {
          source: "team_invitation",
          invitation_id: invitation.id,
          error: message,
        },
      })
      .eq("id", emailMessage.id);

    await supabase
      .from("tenant_invitations")
      .update({ email_delivery_status: "failed", email_error_message: message })
      .eq("id", invitation.id);

      return NextResponse.json({
        ok: true,
        id: invitation.id,
        emailSent: false,
        message: "Invite saved, email not sent.",
      });
    }
}
