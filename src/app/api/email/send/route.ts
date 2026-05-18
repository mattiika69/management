import { NextResponse } from "next/server";
import { getResend, getResendFromEmail, normalizeEmail } from "@/lib/resend/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, requireTenantContext } from "@/lib/tenant-context";

type EmailPayload = {
  to?: string;
  subject?: string;
  text?: string;
  html?: string;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as EmailPayload;
    const to = normalizeEmail(payload.to);
    const subject = payload.subject?.trim();
    const text = payload.text?.trim();
    const html = payload.html?.trim();

    if (!to || !subject || (!text && !html)) {
      return NextResponse.json(
        { error: "A valid recipient, subject, and message body are required." },
        { status: 400 },
      );
    }

    const context = await requireTenantContext(await createClient());
    const resend = getResend();
    const from = getResendFromEmail();

    const { data: emailMessage, error: insertError } = await context.supabase
      .from("email_messages")
      .insert({
        organization_id: context.tenant.id,
        tenant_id: context.tenant.id,
        created_by: context.user.id,
        to_email: to,
        subject,
        text_body: text,
        html_body: html,
        metadata: { source: "api" },
      })
      .select("id")
      .single<{ id: string }>();

    if (insertError) throw new Error(insertError.message);

    try {
      const result = await resend.emails.send({
        from,
        to,
        subject,
        text: text ?? "",
        ...(html ? { html } : {}),
      });

      if (result.error) throw new Error(result.error.message);

      const { error: updateError } = await context.supabase
        .from("email_messages")
        .update({
          status: "sent",
          external_message_id: result.data?.id,
          metadata: { source: "api", provider_response: result.data },
        })
        .eq("id", emailMessage.id);

      if (updateError) throw new Error(updateError.message);

      return NextResponse.json({ ok: true, id: result.data?.id });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Email send failed.";

      await context.supabase
        .from("email_messages")
        .update({
          status: "failed",
          error_message: message,
          metadata: { source: "api", error: message },
        })
        .eq("id", emailMessage.id);

      return NextResponse.json({ error: message }, { status: 500 });
    }
  } catch (error) {
    return jsonError(error);
  }
}
