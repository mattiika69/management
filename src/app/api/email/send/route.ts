import { NextResponse } from "next/server";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { getResend, getResendFromEmail } from "@/lib/resend/server";
import { createClient } from "@/lib/supabase/server";

type EmailPayload = {
  to?: string;
  subject?: string;
  text?: string;
  html?: string;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as EmailPayload;
  const to = payload.to?.trim().toLowerCase();
  const subject = payload.subject?.trim();
  const text = payload.text?.trim();
  const html = payload.html?.trim();

  if (!to || !subject || (!text && !html)) {
    return NextResponse.json(
      { error: "To, subject, and text or html are required." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const organization = await getOrCreateDefaultOrganization(supabase, user);
  const { data: emailMessage, error: insertError } = await supabase
    .from("email_messages")
    .insert({
      organization_id: organization.id,
      created_by: user.id,
      to_email: to,
      subject,
      text_body: text,
      html_body: html,
      metadata: { source: "api" },
    })
    .select("id")
    .single<{ id: string }>();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  try {
    const resend = getResend();
    const from = getResendFromEmail();
    const email = html
      ? { from, to, subject, html }
      : { from, to, subject, text: text ?? "" };
    const result = await resend.emails.send(email);

    if (result.error) {
      throw new Error(result.error.message);
    }

    const { error: updateError } = await supabase
      .from("email_messages")
      .update({
        status: "sent",
        external_message_id: result.data?.id,
        metadata: { source: "api", provider_response: result.data },
      })
      .eq("id", emailMessage.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, id: result.data?.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email send failed.";

    await supabase
      .from("email_messages")
      .update({
        status: "failed",
        error_message: message,
        metadata: { source: "api", error: message },
      })
      .eq("id", emailMessage.id);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
