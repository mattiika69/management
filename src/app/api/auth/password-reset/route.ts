import { NextResponse } from "next/server";
import { buildPasswordResetEmail } from "@/lib/auth/password-reset-email";
import { getResend, getResendFromEmail, normalizeEmail } from "@/lib/resend/server";
import {
  checkRateLimit,
  rateLimitKey,
  rateLimitResponse,
  requestIp,
} from "@/lib/security/rate-limit";
import { enforceSameOrigin } from "@/lib/security/request-guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { canonicalSiteOrigin, isLocalhostUrl } from "@/lib/url/site-origin";

type PasswordResetPayload = {
  email?: string;
};

function actionLinkFromGenerateLink(data: unknown) {
  const properties = (data as { properties?: { action_link?: string } })?.properties;
  return properties?.action_link ?? "";
}

function tokenHashFromGenerateLink(data: unknown) {
  const properties = (data as { properties?: { hashed_token?: string; token_hash?: string } })?.properties;
  return properties?.hashed_token ?? properties?.token_hash ?? "";
}

function safeActionLinkFromGenerateLink(data: unknown, request: Request) {
  const actionLink = actionLinkFromGenerateLink(data);
  if (!actionLink) return "";

  try {
    const url = new URL(actionLink);
    const redirectTo = `${canonicalSiteOrigin(request)}/update-password`;

    if (url.searchParams.has("redirect_to")) {
      url.searchParams.set("redirect_to", redirectTo);
    }

    const finalUrl = url.toString();
    return isLocalhostUrl(finalUrl) ? "" : finalUrl;
  } catch {
    return "";
  }
}

function buildResetUrl(data: unknown, request: Request) {
  const tokenHash = tokenHashFromGenerateLink(data);
  if (tokenHash) {
    const resetUrl = new URL("/update-password", canonicalSiteOrigin(request));
    resetUrl.searchParams.set("token_hash", tokenHash);
    resetUrl.searchParams.set("type", "recovery");
    return resetUrl.toString();
  }

  return safeActionLinkFromGenerateLink(data, request);
}

export async function POST(request: Request) {
  const originGuard = enforceSameOrigin(request);
  if (originGuard) return originGuard;

  const payload = (await request.json().catch(() => ({}))) as PasswordResetPayload;
  const email = normalizeEmail(payload.email);

  if (!email) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const limit = checkRateLimit({
    key: rateLimitKey(["password-reset", requestIp(request), email]),
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });

  if (!limit.allowed) {
    return rateLimitResponse(limit.retryAfterSeconds);
  }

  const admin = createAdminClient();
  const redirectTo = `${canonicalSiteOrigin(request)}/update-password`;
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });

  if (error) {
    return NextResponse.json({ ok: true });
  }

  const resetUrl = buildResetUrl(data, request);
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
