import { NextResponse } from "next/server";
import { getResend, getResendFromEmail, normalizeEmail } from "@/lib/resend/server";
import {
  checkRateLimit,
  rateLimitKey,
  rateLimitResponse,
} from "@/lib/security/rate-limit";
import { enforceSameOrigin } from "@/lib/security/request-guards";
import { createClient } from "@/lib/supabase/server";
import { jsonError, requireTenantContext } from "@/lib/tenant-context";

type EmailPayload = {
  to?: string;
  subject?: string;
  text?: string;
  html?: string;
};

const MAX_SUBJECT_LENGTH = 180;
const MAX_TEXT_LENGTH = 10000;
const MAX_HTML_LENGTH = 20000;

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    const originGuard = enforceSameOrigin(request);
    if (originGuard) return originGuard;

    const payload = (await request.json()) as EmailPayload;
    const to = normalizeEmail(payload.to);
    const subject = cleanText(payload.subject);
    const text = cleanText(payload.text);
    const html = cleanText(payload.html);

    if (!to || !subject || (!text && !html)) {
      return NextResponse.json(
        { error: "A valid recipient, subject, and message body are required." },
        { status: 400 },
      );
    }

    if (
      subject.length > MAX_SUBJECT_LENGTH ||
      text.length > MAX_TEXT_LENGTH ||
      html.length > MAX_HTML_LENGTH
    ) {
      return NextResponse.json(
        { error: "Message content is too long." },
        { status: 400 },
      );
    }

    const context = await requireTenantContext(await createClient());
    const limit = checkRateLimit({
      key: rateLimitKey(["email-send", context.tenant.id, context.user.id]),
      limit: 60,
      windowMs: 60 * 60 * 1000,
    });

    if (!limit.allowed) {
      return rateLimitResponse(limit.retryAfterSeconds);
    }

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

    if (insertError) {
      return NextResponse.json(
        { error: "Email could not be queued. Try again in a moment." },
        { status: 500 },
      );
    }

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
          metadata: { source: "api", provider_message_id: result.data?.id ?? null },
        })
        .eq("id", emailMessage.id);

      if (updateError) {
        return NextResponse.json(
          { error: "Email was sent, but delivery status could not be saved." },
          { status: 500 },
        );
      }

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

      return NextResponse.json(
        { error: "Email could not be sent. Try again in a moment." },
        { status: 502 },
      );
    }
  } catch (error) {
    return jsonError(error);
  }
}
