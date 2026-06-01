import { NextResponse } from "next/server";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { getBillingPlanPriceId } from "@/lib/billing/config";
import { billingCheckoutRedirects } from "@/lib/billing/redirects";
import { envErrorResponse } from "@/lib/env/http";
import { normalizeEmail } from "@/lib/resend/server";
import { enforceSameOrigin } from "@/lib/security/request-guards";
import { getStripe } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";
import { canonicalSiteOrigin } from "@/lib/url/site-origin";
import type Stripe from "stripe";

type CheckoutPayload = {
  email?: string;
};

export async function POST(request: Request) {
  const originGuard = enforceSameOrigin(request);
  if (originGuard) return originGuard;

  const payload = (await request.json().catch(() => ({}))) as CheckoutPayload;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let priceId: string;
  try {
    priceId = getBillingPlanPriceId();
  } catch (error) {
    return envErrorResponse(error) ?? NextResponse.json(
      { error: "Billing is not available right now." },
      { status: 500 },
    );
  }
  const appUrl = canonicalSiteOrigin(request);

  let stripe: Stripe;
  try {
    stripe = getStripe();
  } catch (error) {
    return envErrorResponse(error) ?? NextResponse.json(
      { error: "Billing is not available right now." },
      { status: 500 },
    );
  }

  if (!user?.email) {
    const checkoutEmail = normalizeEmail(payload.email);
    const redirects = billingCheckoutRedirects(appUrl, false);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: checkoutEmail || undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: redirects.successUrl,
      cancel_url: redirects.cancelUrl,
      metadata: {
        account_setup: "checkout_first",
      },
      subscription_data: {
        metadata: {
          account_setup: "checkout_first",
        },
      },
    });

    return NextResponse.json({ url: session.url });
  }

  const organization = await getOrCreateDefaultOrganization(supabase, user);
  const { data: existingCustomer, error: customerSelectError } = await supabase
    .from("billing_customers")
    .select("stripe_customer_id")
    .eq("organization_id", organization.id)
    .maybeSingle<{ stripe_customer_id: string }>();

  if (customerSelectError) {
    return NextResponse.json(
      { error: "Billing customer could not be loaded." },
      { status: 500 },
    );
  }

  let customerId = existingCustomer?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: organization.name,
      metadata: {
        organization_id: organization.id,
        user_id: user.id,
      },
    });

    customerId = customer.id;

    const { error: customerInsertError } = await supabase.from("billing_customers").insert({
      organization_id: organization.id,
      stripe_customer_id: customerId,
    });

    if (customerInsertError) {
      return NextResponse.json(
        { error: "Billing customer could not be saved." },
        { status: 500 },
      );
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: billingCheckoutRedirects(appUrl, true).successUrl,
    cancel_url: billingCheckoutRedirects(appUrl, true).cancelUrl,
    client_reference_id: organization.id,
    metadata: {
      organization_id: organization.id,
      user_id: user.id,
    },
    subscription_data: {
      metadata: {
        organization_id: organization.id,
        user_id: user.id,
      },
    },
  });

  return NextResponse.json({ url: session.url });
}
