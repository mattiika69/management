import { NextResponse } from "next/server";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { getStripe } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const priceId =
    process.env.STRIPE_ONBOARDING_PRICE_ID ?? process.env.STRIPE_PRICE_ID;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const appUrl = siteUrl.replace(/\/$/, "");

  if (!priceId) {
    return NextResponse.json(
      { error: "STRIPE_ONBOARDING_PRICE_ID is not configured." },
      { status: 500 },
    );
  }

  const organization = await getOrCreateDefaultOrganization(supabase, user);
  const stripe = getStripe();

  const { data: existingCustomer, error: customerSelectError } = await supabase
    .from("billing_customers")
    .select("stripe_customer_id")
    .eq("organization_id", organization.id)
    .maybeSingle<{ stripe_customer_id: string }>();

  if (customerSelectError) {
    return NextResponse.json({ error: customerSelectError.message }, { status: 400 });
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
      return NextResponse.json({ error: customerInsertError.message }, { status: 400 });
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
