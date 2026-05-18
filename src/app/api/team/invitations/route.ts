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
import { auditAction, jsonError, requireTenantContext } from "@/lib/tenant-context";

type InvitePayload = {
  email?: string;
  role?: string;
};

type InvitationRow = {
  id: string;
};

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

    const token = createInvitationToken();
    const tokenHash = hashInvitationToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: existingInvitation, error: existingError } = await supabase
      .from("organization_invitations")
      .select("id")
      .eq("organization_id", context.tenant.id)
      .eq("email", email)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .maybeSingle<InvitationRow>();

    if (existingError) throw new Error(existingError.message);

    const invitationQuery = existingInvitation
      ? supabase
          .from("organization_invitations")
          .update({
            role,
            token_hash: tokenHash,
            invited_by: context.user.id,
            expires_at: expiresAt,
          })
          .eq("id", existingInvitation.id)
          .eq("organization_id", context.tenant.id)
          .select("id")
          .single<InvitationRow>()
      : supabase
          .from("organization_invitations")
          .insert({
            organization_id: context.tenant.id,
            email,
            role,
            token_hash: tokenHash,
            invited_by: context.user.id,
            expires_at: expiresAt,
          })
          .select("id")
          .single<InvitationRow>();

    const { data: invitation, error: invitationError } = await invitationQuery;

    if (invitationError) throw new Error(invitationError.message);

    await auditAction(context, "team.invitation.created", {
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

    const { data: emailMessage, error: emailInsertError } = await supabase
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
      await supabase
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

      await supabase
        .from("tenant_invitations")
        .update({ email_delivery_status: "sent" })
        .eq("id", invitation.id);

      return NextResponse.json({ ok: true, id: invitation.id, emailSent: true });
    }

    const message = delivery.errorMessage ?? "Invitation email could not be sent.";
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

    const { error } = await supabase
      .from("organization_invitations")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", body.id)
      .eq("organization_id", context.tenant.id);

    if (error) throw new Error(error.message);

    await auditAction(context, "team.invitation.cancelled", {
      targetTable: "organization_invitations",
      targetId: body.id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
