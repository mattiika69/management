import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  createBillingAccountClaim,
  sendBillingSetupEmail,
} from "@/lib/billing/account-claims";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";
import { canonicalSiteOrigin } from "@/lib/url/site-origin";

function stripeId(value: string | { id: string } | null | undefined) {
  return typeof value === "string" ? value : value?.id ?? null;
}

function toIsoTime(value: number | null | undefined) {
  return value ? new Date(value * 1000).toISOString() : null;
}

function subscriptionClaimMetadata(subscription: Stripe.Subscription) {
  const items = subscription.items.data.map((item) => ({
    stripe_subscription_item_id: item.id,
    price_id: item.price.id,
    quantity: item.quantity ?? 0,
    current_period_start: toIsoTime(item.current_period_start ?? null),
    current_period_end: toIsoTime(item.current_period_end ?? null),
  }));
  const primaryItem = subscription.items.data[0];

  return {
    subscription_status: subscription.status,
    current_period_start: toIsoTime(
      primaryItem?.current_period_start ?? subscription.start_date ?? null,
    ),
    current_period_end: toIsoTime(primaryItem?.current_period_end ?? null),
    cancel_at_period_end: subscription.cancel_at_period_end,
    quantity: items.reduce((total, item) => total + item.quantity, 0),
    subscription_items: items,
  };
}

async function insertBillingEvent(
  admin: ReturnType<typeof createAdminClient>,
  event: Stripe.Event,
) {
  const { error } = await admin.from("billing_events").insert({
    provider: "stripe",
    event_id: event.id,
    event_type: event.type,
    payload: event,
  });

  if (!error) return { duplicate: false };
  if (error.code === "23505") return { duplicate: true };
  throw new Error(error.message);
}

async function markBillingEventProcessed(
  admin: ReturnType<typeof createAdminClient>,
  eventId: string,
  tenantId?: string | null,
) {
  const { error } = await admin
    .from("billing_events")
    .update({
      tenant_id: tenantId ?? null,
      processed_at: new Date().toISOString(),
    })
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);
}

async function upsertBillingCustomer(
  admin: ReturnType<typeof createAdminClient>,
  organizationId: string,
  stripeCustomerId: string,
) {
  const { error } = await admin.from("billing_customers").upsert(
    {
      organization_id: organizationId,
      stripe_customer_id: stripeCustomerId,
    },
    { onConflict: "organization_id" },
  );

  if (error) throw new Error(error.message);
}

async function findOrganizationIdForCustomer(
  admin: ReturnType<typeof createAdminClient>,
  stripeCustomerId: string | null,
) {
  if (!stripeCustomerId) return null;

  const { data, error } = await admin
    .from("billing_customers")
    .select("organization_id")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle<{ organization_id: string }>();

  if (error) throw new Error(error.message);
  return data?.organization_id ?? null;
}

async function syncSubscription(
  admin: ReturnType<typeof createAdminClient>,
  subscription: Stripe.Subscription,
) {
  const stripeCustomerId = stripeId(subscription.customer);
  const organizationId =
    subscription.metadata?.organization_id ??
    subscription.metadata?.tenant_id ??
    (await findOrganizationIdForCustomer(admin, stripeCustomerId));

  if (!organizationId || !stripeCustomerId) return null;

  await upsertBillingCustomer(admin, organizationId, stripeCustomerId);

  const primaryItem = subscription.items.data[0];
  const priceId = primaryItem?.price.id ?? null;
  const quantity = subscription.items.data.reduce(
    (total, item) => total + (item.quantity ?? 0),
    0,
  );
  const currentPeriodStart =
    primaryItem?.current_period_start ?? subscription.start_date ?? null;
  const currentPeriodEnd = primaryItem?.current_period_end ?? null;

  const subscriptionPayload = {
    tenant_id: organizationId,
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    plan_key: subscription.metadata?.plan_key ?? null,
    price_id: priceId,
    seat_quantity: quantity,
    current_period_start: toIsoTime(currentPeriodStart),
    current_period_end: toIsoTime(currentPeriodEnd),
    cancel_at_period_end: subscription.cancel_at_period_end,
    archived_at: subscription.status === "canceled" ? new Date().toISOString() : null,
    metadata: subscription.metadata ?? {},
  };

  const { data: canonicalSubscription, error: canonicalError } = await admin
    .from("billing_subscriptions")
    .upsert(subscriptionPayload, { onConflict: "stripe_subscription_id" })
    .select("id")
    .single<{ id: string }>();

  if (canonicalError) throw new Error(canonicalError.message);

  if (canonicalSubscription?.id) {
    for (const item of subscription.items.data) {
      const { error: itemError } = await admin
        .from("billing_subscription_items")
        .upsert(
          {
            tenant_id: organizationId,
            billing_subscription_id: canonicalSubscription.id,
            stripe_subscription_item_id: item.id,
            price_id: item.price.id,
            quantity: item.quantity ?? 0,
            metadata: item.metadata ?? {},
          },
          { onConflict: "stripe_subscription_item_id" },
        );

      if (itemError) throw new Error(itemError.message);
    }
  }

  const { error: legacyError } = await admin.from("subscriptions").upsert(
    {
      organization_id: organizationId,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      price_id: priceId,
      current_period_end: toIsoTime(currentPeriodEnd),
      cancel_at_period_end: subscription.cancel_at_period_end,
    },
    { onConflict: "stripe_subscription_id" },
  );

  if (legacyError) throw new Error(legacyError.message);
  return organizationId;
}

async function syncCheckoutSession(
  admin: ReturnType<typeof createAdminClient>,
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  appOrigin: string,
) {
  const organizationId = session.metadata?.organization_id ?? null;
  const stripeCustomerId = stripeId(session.customer);
  const subscriptionId = stripeId(session.subscription);

  if (session.metadata?.account_setup === "checkout_first" && !organizationId) {
    const email = session.customer_details?.email ?? session.customer_email ?? "";
    if (!email || !stripeCustomerId) return null;

    let priceId: string | null = null;
    let metadata: Record<string, unknown> = {
      checkout_session_id: session.id,
    };

    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      priceId = subscription.items.data[0]?.price.id ?? null;
      metadata = {
        ...metadata,
        ...subscriptionClaimMetadata(subscription),
      };
    }

    const { claim, token } = await createBillingAccountClaim({
      admin,
      email,
      stripeCustomerId,
      stripeCheckoutSessionId: session.id,
      stripeSubscriptionId: subscriptionId,
      priceId,
      metadata,
    });
    const setupUrl = new URL("/signup", appOrigin);
    setupUrl.searchParams.set("billing_claim", token);
    setupUrl.searchParams.set("email", claim.email);

    await sendBillingSetupEmail({
      admin,
      claimId: claim.id,
      email: claim.email,
      setupUrl: setupUrl.toString(),
    });

    return null;
  }

  if (organizationId && stripeCustomerId) {
    await upsertBillingCustomer(admin, organizationId, stripeCustomerId);
  }

  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return syncSubscription(admin, subscription);
  }

  return organizationId;
}

async function grantCreditCheckout(
  admin: ReturnType<typeof createAdminClient>,
  event: Stripe.Event,
  session: Stripe.Checkout.Session,
) {
  const organizationId = session.metadata?.organization_id;
  const credits = Number(session.metadata?.credits ?? 0);
  const userId = session.metadata?.user_id || null;

  if (!organizationId || !Number.isFinite(credits) || credits <= 0) {
    return;
  }

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

  if (error) throw new Error(error.message);
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook is not configured." },
      { status: 500 },
    );
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
  } catch {
    return NextResponse.json(
      { error: "Invalid Stripe webhook." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const appOrigin = canonicalSiteOrigin(request);

  try {
    const billingEvent = await insertBillingEvent(admin, event);
    if (billingEvent.duplicate) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    let tenantId: string | null = null;

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      tenantId = await syncCheckoutSession(admin, stripe, session, appOrigin);
      await grantCreditCheckout(admin, event, session);
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      tenantId = await syncSubscription(
        admin,
        event.data.object as Stripe.Subscription,
      );
    }

    if (
      event.type === "invoice.payment_succeeded" ||
      event.type === "invoice.payment_failed"
    ) {
      const invoice = event.data.object as Stripe.Invoice & {
        subscription?: string | { id: string } | null;
      };
      const subscriptionId = stripeId(invoice.subscription);

      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        tenantId = await syncSubscription(admin, subscription);
      }
    }

    await markBillingEventProcessed(admin, event.id, tenantId);
  } catch {
    return NextResponse.json(
      { error: "Stripe webhook processing failed." },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
