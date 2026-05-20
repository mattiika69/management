import "server-only";

import { createHash, randomBytes } from "crypto";
import { getResend, getResendFromEmail, normalizeEmail } from "@/lib/resend/server";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export type BillingAccountClaim = {
  id: string;
  email: string;
  token_hash: string;
  stripe_customer_id: string;
  stripe_checkout_session_id: string;
  stripe_subscription_id: string | null;
  price_id: string | null;
  status: string;
  metadata: Record<string, unknown>;
  expires_at: string;
};

export function createBillingClaimToken() {
  return randomBytes(32).toString("base64url");
}

export function hashBillingClaimToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function buildSetupEmail(setupUrl: string) {
  const subject = "Set up your HyperOptimal workspace";
  const text = [
    "Your HyperOptimal workspace is ready.",
    "",
    "Use this secure link to create your owner account and finish setup:",
    setupUrl,
    "",
    "This link expires in 14 days.",
  ].join("\n");
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
      <h1 style="font-size:22px;margin:0 0 12px">Your HyperOptimal workspace is ready</h1>
      <p>Use this secure link to create your owner account and finish setup.</p>
      <p><a href="${setupUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Set up workspace</a></p>
      <p style="font-size:13px;color:#64748b">This link expires in 14 days.</p>
    </div>
  `;

  return { subject, text, html };
}

export async function createBillingAccountClaim({
  admin,
  email,
  stripeCustomerId,
  stripeCheckoutSessionId,
  stripeSubscriptionId,
  priceId,
  metadata,
}: {
  admin: AdminClient;
  email: string;
  stripeCustomerId: string;
  stripeCheckoutSessionId: string;
  stripeSubscriptionId?: string | null;
  priceId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new Error("Checkout email is missing.");
  }

  const token = createBillingClaimToken();
  const tokenHash = hashBillingClaimToken(token);
  const { data, error } = await admin
    .from("billing_account_claims")
    .insert({
      email: normalizedEmail,
      token_hash: tokenHash,
      stripe_customer_id: stripeCustomerId,
      stripe_checkout_session_id: stripeCheckoutSessionId,
      stripe_subscription_id: stripeSubscriptionId ?? null,
      price_id: priceId ?? null,
      metadata: metadata ?? {},
    })
    .select("id,email,token_hash,stripe_customer_id,stripe_checkout_session_id,stripe_subscription_id,price_id,status,metadata,expires_at")
    .single<BillingAccountClaim>();

  if (error) {
    throw new Error(error.message);
  }

  return { claim: data, token };
}

export async function sendBillingSetupEmail({
  admin,
  claimId,
  email,
  setupUrl,
}: {
  admin: AdminClient;
  claimId: string;
  email: string;
  setupUrl: string;
}) {
  const { subject, text, html } = buildSetupEmail(setupUrl);

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

    await admin
      .from("billing_account_claims")
      .update({
        setup_email_status: "sent",
        setup_email_error_message: null,
        setup_sent_at: new Date().toISOString(),
      })
      .eq("id", claimId);

    return { sent: true };
  } catch (error) {
    await admin
      .from("billing_account_claims")
      .update({
        setup_email_status: "failed",
        setup_email_error_message:
          error instanceof Error ? error.message.slice(0, 500) : "Email delivery failed.",
      })
      .eq("id", claimId);

    return { sent: false };
  }
}

export async function getPendingBillingAccountClaim(
  admin: AdminClient,
  token: string,
  email: string,
) {
  const tokenHash = hashBillingClaimToken(token);
  const normalizedEmail = normalizeEmail(email);

  if (!tokenHash || !normalizedEmail) return null;

  const { data, error } = await admin
    .from("billing_account_claims")
    .select("id,email,token_hash,stripe_customer_id,stripe_checkout_session_id,stripe_subscription_id,price_id,status,metadata,expires_at")
    .eq("token_hash", tokenHash)
    .eq("email", normalizedEmail)
    .eq("status", "pending")
    .is("claimed_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle<BillingAccountClaim>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? null;
}
