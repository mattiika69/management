import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getResend, getResendFromEmail, normalizeEmail } from "@/lib/resend/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { buildTeamInviteEmail } from "@/lib/team/email";
import {
  buildInviteUrl,
  createInvitationToken,
  hashInvitationToken,
  isTeamRole,
} from "@/lib/team/invitations";
import { canManageTeam } from "@/lib/team/permissions";
import { jsonError, requireTenantContext } from "@/lib/tenant-context";

type InvitePayload = {
  email?: string;
  role?: string;
};

type InvitationRow = {
  id: string;
};

type TenantContext = Awaited<ReturnType<typeof requireTenantContext>>;
type AdminClient = ReturnType<typeof createAdminClient>;

type InviteDelivery = {
  sent: boolean;
  provider: "resend" | "supabase" | null;
  externalMessageId?: string;
  providerResponse?: unknown;
  errorMessage?: string;
};

async function sendInviteEmail(input: {
  email: string;
  subject: string;
  text: string;
  html: string;
  inviteUrl: string;
}): Promise<InviteDelivery> {
  try {
    const result = await getResend().emails.send({
      from: getResendFromEmail(),
      to: input.email,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });

    if (result.error) throw new Error(result.error.message);

    return {
      sent: true,
      provider: "resend",
      externalMessageId: result.data?.id,
      providerResponse: result.data,
    };
  } catch (resendError) {
    const resendMessage = resendError instanceof Error ? resendError.message : "Resend delivery failed.";

    try {
      const { error } = await createAdminClient().auth.admin.inviteUserByEmail(
        input.email,
        { redirectTo: input.inviteUrl },
      );

      if (error) throw new Error(error.message);

      return {
        sent: true,
        provider: "supabase",
        externalMessageId: "supabase-auth-invite",
      };
    } catch (supabaseError) {
      const supabaseMessage = supabaseError instanceof Error
        ? supabaseError.message
        : "Supabase invite delivery failed.";

      return {
        sent: false,
        provider: null,
        errorMessage: `${resendMessage} ${supabaseMessage}`.trim(),
      };
    }
  }
}

async function auditTeamAction(
  admin: AdminClient,
  context: TenantContext,
  action: string,
  input: {
    targetTable: string;
    targetId: string;
    metadata?: Record<string, unknown>;
  },
) {
  const { error } = await admin.from("admin_audit_log").insert({
    tenant_id: context.tenant.id,
    actor_user_id: context.user.id,
    action,
    target_table: input.targetTable,
    target_id: input.targetId,
    metadata: input.metadata ?? {},
  });

  if (error) throw new Error(error.message);
}

async function ensureInvitedEmailIsNotMember(
  admin: AdminClient,
  context: TenantContext,
  email: string,
) {
  const { data: profile, error: profileError } = await admin
    .from("user_profiles")
    .select("user_id")
    .eq("email", email)
    .maybeSingle<{ user_id: string }>();

  if (profileError) throw new Error(profileError.message);
  if (!profile) return;

  const { data: tenantMembership, error: tenantMembershipError } = await admin
    .from("tenant_memberships")
    .select("user_id")
    .eq("tenant_id", context.tenant.id)
    .eq("user_id", profile.user_id)
    .is("archived_at", null)
    .maybeSingle<{ user_id: string }>();

  if (tenantMembershipError) throw new Error(tenantMembershipError.message);

  if (tenantMembership) {
    throw new Error("That email is already a member of this workspace.");
  }

  const { data: organizationMembership, error: organizationMembershipError } = await admin
    .from("organization_memberships")
    .select("user_id")
    .eq("organization_id", context.tenant.id)
    .eq("user_id", profile.user_id)
    .maybeSingle<{ user_id: string }>();

  if (organizationMembershipError) throw new Error(organizationMembershipError.message);

  if (organizationMembership) {
    throw new Error("That email is already a member of this workspace.");
  }
}

async function findOpenInvitation(
  admin: AdminClient,
  context: TenantContext,
  email: string,
) {
  const { data: tenantInvitation, error: tenantError } = await admin
    .from("tenant_invitations")
    .select("id")
    .eq("tenant_id", context.tenant.id)
    .eq("email", email)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .maybeSingle<InvitationRow>();

  if (tenantError) throw new Error(tenantError.message);
  if (tenantInvitation) return tenantInvitation;

  const { data: organizationInvitation, error: organizationError } = await admin
    .from("organization_invitations")
    .select("id")
    .eq("organization_id", context.tenant.id)
    .eq("email", email)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .maybeSingle<InvitationRow>();

  if (organizationError) throw new Error(organizationError.message);
  return organizationInvitation;
}

async function upsertInvitationRows(
  admin: AdminClient,
  context: TenantContext,
  input: {
    id: string;
    email: string;
    role: string;
    tokenHash: string;
    expiresAt: string;
  },
) {
  const { data: organizationInvitation, error: organizationError } = await admin
    .from("organization_invitations")
    .upsert(
      {
        id: input.id,
        organization_id: context.tenant.id,
        email: input.email,
        role: input.role,
        token_hash: input.tokenHash,
        invited_by: context.user.id,
        accepted_by: null,
        accepted_at: null,
        revoked_at: null,
        expires_at: input.expiresAt,
      },
      { onConflict: "id" },
    )
    .select("id")
    .single<InvitationRow>();

  if (organizationError) throw new Error(organizationError.message);

  const { data: tenantInvitation, error: tenantError } = await admin
    .from("tenant_invitations")
    .upsert(
      {
        id: input.id,
        tenant_id: context.tenant.id,
        email: input.email,
        role: input.role,
        token_hash: input.tokenHash,
        invited_by_user_id: context.user.id,
        accepted_by_user_id: null,
        accepted_at: null,
        revoked_at: null,
        email_delivery_status: "pending",
        email_error_message: null,
        expires_at: input.expiresAt,
        metadata: { source: "settings_team" },
      },
      { onConflict: "id" },
    )
    .select("id")
    .single<InvitationRow>();

  if (tenantError) throw new Error(tenantError.message);

  return tenantInvitation ?? organizationInvitation;
}

export async function POST(request: Request) {
  try {
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
    const context = await requireTenantContext(supabase);

    if (!canManageTeam(context.role)) {
      return NextResponse.json(
        { error: "Only workspace owners and admins can invite team members." },
        { status: 403 },
      );
    }

    if (email === context.user.email?.toLowerCase()) {
      return NextResponse.json(
        { error: "You are already a member of this workspace." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    await ensureInvitedEmailIsNotMember(admin, context, email);

    const token = createInvitationToken();
    const tokenHash = hashInvitationToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const existingInvitation = await findOpenInvitation(admin, context, email);
    const invitation = await upsertInvitationRows(admin, context, {
      id: existingInvitation?.id ?? randomUUID(),
      email,
      role,
      tokenHash,
      expiresAt,
    });

    await auditTeamAction(admin, context, "team.invitation.created", {
      targetTable: "organization_invitations",
      targetId: invitation.id,
      metadata: { email, role },
    });

    const inviteUrl = buildInviteUrl(
      process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin,
      token,
    );
    const { subject, text, html } = buildTeamInviteEmail({
      inviteUrl,
      organizationName: context.tenant.name,
      inviterEmail: context.user.email ?? "A workspace admin",
      role,
    });

    const { data: emailMessage, error: emailInsertError } = await admin
      .from("email_messages")
      .insert({
        organization_id: context.tenant.id,
        tenant_id: context.tenant.id,
        created_by: context.user.id,
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

    if (emailInsertError) throw new Error(emailInsertError.message);

    const delivery = await sendInviteEmail({ email, subject, text, html, inviteUrl });

    if (delivery.sent) {
      const { error: emailUpdateError } = await admin
        .from("email_messages")
        .update({
          status: "sent",
          external_message_id: delivery.externalMessageId,
          metadata: {
            source: "team_invitation",
            invitation_id: invitation.id,
            delivery_provider: delivery.provider,
            provider_response: delivery.providerResponse,
          },
        })
        .eq("id", emailMessage.id);

      if (emailUpdateError) throw new Error(emailUpdateError.message);

      const { error: deliveryUpdateError } = await admin
        .from("tenant_invitations")
        .update({ email_delivery_status: "sent" })
        .eq("id", invitation.id);

      if (deliveryUpdateError) throw new Error(deliveryUpdateError.message);

      return NextResponse.json({ ok: true, id: invitation.id, emailSent: true });
    }

    const message = delivery.errorMessage ?? "Invitation email could not be sent.";
    const { error: failedEmailUpdateError } = await admin
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

    if (failedEmailUpdateError) throw new Error(failedEmailUpdateError.message);

    const { error: failedDeliveryUpdateError } = await admin
      .from("tenant_invitations")
      .update({ email_delivery_status: "failed", email_error_message: message })
      .eq("id", invitation.id);

    if (failedDeliveryUpdateError) throw new Error(failedDeliveryUpdateError.message);

    return NextResponse.json({
      ok: true,
      id: invitation.id,
      emailSent: false,
      message: "Invite saved, email not sent.",
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const context = await requireTenantContext(supabase);
    const body = (await request.json().catch(() => ({}))) as { id?: string };

    if (!canManageTeam(context.role)) {
      return NextResponse.json(
        { error: "Only workspace owners and admins can cancel invitations." },
        { status: 403 },
      );
    }

    if (!body.id) {
      return NextResponse.json({ error: "Invitation id is required." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: invitation, error: invitationSelectError } = await admin
      .from("tenant_invitations")
      .select("id")
      .eq("id", body.id)
      .eq("tenant_id", context.tenant.id)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .maybeSingle<InvitationRow>();

    if (invitationSelectError) throw new Error(invitationSelectError.message);

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
    }

    const revokedAt = new Date().toISOString();
    const { error: organizationError } = await admin
      .from("organization_invitations")
      .update({ revoked_at: revokedAt })
      .eq("id", body.id)
      .eq("organization_id", context.tenant.id);

    if (organizationError) throw new Error(organizationError.message);

    const { error: tenantError } = await admin
      .from("tenant_invitations")
      .update({ revoked_at: revokedAt })
      .eq("id", body.id)
      .eq("tenant_id", context.tenant.id);

    if (tenantError) throw new Error(tenantError.message);

    await auditTeamAction(admin, context, "team.invitation.cancelled", {
      targetTable: "organization_invitations",
      targetId: body.id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
