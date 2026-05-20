import { NextResponse } from "next/server";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { normalizeEmail } from "@/lib/resend/server";
import { enforceSameOrigin } from "@/lib/security/request-guards";
import { getStripe } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";
import { canonicalSiteOrigin } from "@/lib/url/site-origin";

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

  const priceId =
    process.env.STRIPE_ONBOARDING_PRICE_ID ?? process.env.STRIPE_PRICE_ID;
  const appUrl = canonicalSiteOrigin(request);

  if (!priceId) {
    return NextResponse.json(
      { error: "Billing is not available right now." },
      { status: 500 },
    );
  }

  const stripe = getStripe();

  if (!user?.email) {
    const checkoutEmail = normalizeEmail(payload.email);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: checkoutEmail || undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/signup?checkout=success`,
      cancel_url: `${appUrl}/?checkout=cancelled`,
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
    success_url: `${appUrl}/get-started?billing=success`,
    cancel_url: `${appUrl}/get-started?billing=cancelled`,
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
