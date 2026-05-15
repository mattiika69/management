import { NextResponse } from "next/server";
import { getResend, getResendFromEmail } from "@/lib/resend/server";
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

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as InvitePayload;
    const email = payload.email?.trim().toLowerCase();
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
    const { data: invitation, error: invitationError } = await supabase
      .from("organization_invitations")
      .upsert(
        {
          organization_id: context.tenant.id,
          email,
          role,
          token_hash: tokenHash,
          invited_by: context.user.id,
          expires_at: expiresAt,
          revoked_at: null,
          accepted_at: null,
        },
        { onConflict: "token_hash" },
      )
      .select("id")
      .single<{ id: string }>();

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

    try {
      const result = await getResend().emails.send({
        from: getResendFromEmail(),
        to: email,
        subject,
        text,
        html,
      });

      if (result.error) throw new Error(result.error.message);

      await supabase
        .from("email_messages")
        .update({ status: "sent", external_message_id: result.data?.id })
        .eq("id", emailMessage.id);

      await supabase
        .from("tenant_invitations")
        .update({ email_delivery_status: "sent" })
        .eq("id", invitation.id);

      return NextResponse.json({ ok: true, id: invitation.id });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invitation email failed.";
      await supabase
        .from("email_messages")
        .update({ status: "failed", error_message: message })
        .eq("id", emailMessage.id);
      await supabase
        .from("tenant_invitations")
        .update({ email_delivery_status: "failed", email_error_message: message })
        .eq("id", invitation.id);

      return NextResponse.json({ error: message }, { status: 500 });
    }
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
