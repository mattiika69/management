import { NextResponse } from "next/server";
import { buildVerificationEmail } from "@/lib/auth/verification-email";
import {
  getPendingBillingAccountClaim,
  hashBillingClaimToken,
} from "@/lib/billing/account-claims";
import {
  cleanOrganizationName,
  cleanPersonName,
  isStrongPassword,
  passwordPolicyMessage,
} from "@/lib/auth/validation";
import { getResend, getResendFromEmail, normalizeEmail } from "@/lib/resend/server";
import {
  checkRateLimit,
  rateLimitKey,
  rateLimitResponse,
  requestIp,
} from "@/lib/security/rate-limit";
import { enforceSameOrigin } from "@/lib/security/request-guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { canonicalSiteOrigin } from "@/lib/url/site-origin";
import { safeRelativePath } from "@/lib/auth/redirects";

type SignupPayload = {
  organizationName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  redirect?: string;
  next?: string;
  billingClaimToken?: string;
};

function tokenHashFromGenerateLink(data: unknown) {
  const properties = (data as { properties?: { hashed_token?: string; token_hash?: string } })?.properties;
  return properties?.hashed_token ?? properties?.token_hash ?? "";
}

function existingSignupError(message: string) {
  const lower = message.toLowerCase();
  return lower.includes("already") || lower.includes("registered") || lower.includes("exists");
}

function buildVerifyUrl(data: unknown, request: Request, nextPath: string) {
  const tokenHash = tokenHashFromGenerateLink(data);
  if (!tokenHash) return "";

  const verifyUrl = new URL("/auth/callback", canonicalSiteOrigin(request));
  verifyUrl.searchParams.set("token_hash", tokenHash);
  verifyUrl.searchParams.set("type", "signup");
  verifyUrl.searchParams.set("redirect", nextPath);
  return verifyUrl.toString();
}

export async function POST(request: Request) {
  const originGuard = enforceSameOrigin(request);
  if (originGuard) return originGuard;

  const payload = (await request.json().catch(() => ({}))) as SignupPayload;
  const email = normalizeEmail(payload.email);
  const password = typeof payload.password === "string" ? payload.password : "";
  const firstName = cleanPersonName(payload.firstName);
  const lastName = cleanPersonName(payload.lastName);
  const nextPath = safeRelativePath(payload.redirect ?? payload.next, "/get-started");
  const isInviteSignup = nextPath.startsWith("/invite/");
  const billingClaimToken =
    typeof payload.billingClaimToken === "string" ? payload.billingClaimToken.trim() : "";
  const isBillingClaimSignup = Boolean(billingClaimToken) && !isInviteSignup;
  const organizationName = cleanOrganizationName(payload.organizationName);

  if (!email) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  if (!firstName || !lastName) {
    return NextResponse.json({ error: "First and last name are required." }, { status: 400 });
  }

  if (!isInviteSignup && !organizationName) {
    return NextResponse.json({ error: "Organization name is required." }, { status: 400 });
  }

  if (!isStrongPassword(password)) {
    return NextResponse.json({ error: passwordPolicyMessage }, { status: 400 });
  }

  const limit = checkRateLimit({
    key: rateLimitKey(["signup", requestIp(request), email]),
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });

  if (!limit.allowed) {
    return rateLimitResponse(limit.retryAfterSeconds);
  }

  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  const admin = createAdminClient();

  if (isBillingClaimSignup) {
    const claim = await getPendingBillingAccountClaim(admin, billingClaimToken, email);
    if (!claim) {
      return NextResponse.json(
        { error: "Billing setup link is invalid or expired." },
        { status: 400 },
      );
    }
  }

  const bootstrapMetadata = isInviteSignup
    ? { onboarding_bootstrap: "invite" }
    : isBillingClaimSignup
      ? {
          organization_name: organizationName,
          onboarding_organization_name: organizationName,
          onboarding_bootstrap: "billing_claim",
          billing_claim_token_hash: hashBillingClaimToken(billingClaimToken),
        }
      : {
          organization_name: organizationName,
          onboarding_organization_name: organizationName,
          onboarding_bootstrap: "new_organization",
        };

  const { data, error } = await admin.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: {
      redirectTo: `${canonicalSiteOrigin(request)}/auth/callback?redirect=${encodeURIComponent(nextPath)}`,
      data: {
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        name: fullName,
        ...bootstrapMetadata,
      },
    },
  });

  if (error) {
    return NextResponse.json(
      {
        error: existingSignupError(error.message)
          ? "An account with this email already exists. Please sign in instead."
          : "Authentication provider is temporarily unavailable. Please retry in a minute.",
      },
      { status: existingSignupError(error.message) ? 409 : 503 },
    );
  }

  const verifyUrl = buildVerifyUrl(data, request, nextPath);
  if (!verifyUrl) {
    return NextResponse.json(
      { error: "Verification email could not be prepared. Please retry in a minute." },
      { status: 503 },
    );
  }

  const { subject, text, html } = buildVerificationEmail({ verifyUrl });

  try {
    const result = await getResend().emails.send({
      from: getResendFromEmail(),
      to: email,
      subject,
      text,
      html,
    });

    if (result.error) {
      return NextResponse.json(
        { error: "Verification email could not be sent. Please retry in a minute." },
        { status: 503 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Verification email could not be sent. Please retry in a minute." },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true, email });
}
