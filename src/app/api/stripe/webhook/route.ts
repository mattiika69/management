import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not configured." }, { status: 500 });
  }

  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Stripe signature is required." }, { status: 400 });
  }

  const rawBody = await request.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid Stripe webhook." },
      { status: 400 },
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const organizationId = session.metadata?.organization_id;
    const credits = Number(session.metadata?.credits ?? 0);
    const userId = session.metadata?.user_id || null;

    if (organizationId && Number.isFinite(credits) && credits > 0) {
      const admin = createAdminClient();
      const { error } = await admin.rpc("grant_credits", {
        target_organization_id: organizationId,
        amount_to_grant: Math.floor(credits),
        stripe_event: event.id,
        entry_external_id: `stripe:${event.id}`,
        entry_metadata: {
          checkoutSessionId: session.id,
          creditPack: session.metadata?.credit_pack ?? "",
        },
        actor_user_id: userId,
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
