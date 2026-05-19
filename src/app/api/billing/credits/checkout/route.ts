import { NextResponse } from "next/server";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { getStripe } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";
import { canonicalSiteOrigin } from "@/lib/url/site-origin";

type Payload = {
  pack?: string;
};

const PACKS: Record<string, { credits: number; envKey: string; fallbackEnvKey?: string }> = {
  starter: { credits: 100, envKey: "STRIPE_CREDIT_PACK_STARTER_PRICE_ID", fallbackEnvKey: "STRIPE_PRICE_ID" },
  growth: { credits: 500, envKey: "STRIPE_CREDIT_PACK_GROWTH_PRICE_ID" },
};

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as Payload;
  const packKey = payload.pack && PACKS[payload.pack] ? payload.pack : "starter";
  const pack = PACKS[packKey];
  const priceId = process.env[pack.envKey] || (pack.fallbackEnvKey ? process.env[pack.fallbackEnvKey] : "");

  if (!priceId) {
    return NextResponse.json(
      { error: "Credit checkout is not available right now." },
      { status: 500 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const organization = await getOrCreateDefaultOrganization(supabase, user);
  const stripe = getStripe();
  const appUrl = canonicalSiteOrigin(request);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/settings/billing?credits=success`,
    cancel_url: `${appUrl}/settings/billing?credits=cancelled`,
    client_reference_id: organization.id,
    metadata: {
      organization_id: organization.id,
      user_id: user.id,
      credit_pack: packKey,
      credits: String(pack.credits),
    },
  });

  return NextResponse.json({ url: session.url });
}
