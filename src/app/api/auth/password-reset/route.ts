import { NextResponse } from "next/server";
import { buildPasswordResetEmail } from "@/lib/auth/password-reset-email";
import { getResend, getResendFromEmail, normalizeEmail } from "@/lib/resend/server";
import { createAdminClient } from "@/lib/supabase/admin";

type PasswordResetPayload = {
  email?: string;
};

function siteOrigin(request: Request) {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    new URL(request.url).origin
  );
}

function actionLinkFromGenerateLink(data: unknown) {
  const properties = (data as { properties?: { action_link?: string } })?.properties;
  return properties?.action_link ?? "";
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as PasswordResetPayload;
  const email = normalizeEmail(payload.email);

  if (!email) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const admin = createAdminClient();
  const redirectTo = `${siteOrigin(request)}/auth/callback?next=${encodeURIComponent("/update-password")}`;
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });

  if (error) {
    return NextResponse.json({ ok: true });
  }

  const resetUrl = actionLinkFromGenerateLink(data);
  if (!resetUrl) {
    return NextResponse.json(
      { error: "Password reset could not be prepared. Try again in a moment." },
      { status: 503 },
    );
  }

  const { subject, text, html } = buildPasswordResetEmail({ resetUrl });
  const result = await (async () => {
    try {
      return await getResend().emails.send({
        from: getResendFromEmail(),
        to: email,
        subject,
        text,
        html,
      });
    } catch {
      return {
        error: { message: "Password reset email could not be sent." },
        data: null,
      };
    }
  })();

  if (result.error) {
    return NextResponse.json(
      { error: "Password reset email could not be sent. Try again in a moment." },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true });
}
