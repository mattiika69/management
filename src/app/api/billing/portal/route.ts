import { NextResponse } from "next/server";
import { envErrorResponse } from "@/lib/env/http";
import { getStripe } from "@/lib/stripe/server";
import {
  auditAction,
  jsonError,
  requireTenantAdmin,
  requireTenantContext,
} from "@/lib/tenant-context";
import { enforceSameOrigin } from "@/lib/security/request-guards";
import { createClient } from "@/lib/supabase/server";
import { canonicalSiteOrigin } from "@/lib/url/site-origin";
import type Stripe from "stripe";

export async function POST(request: Request) {
  const originGuard = enforceSameOrigin(request);
  if (originGuard) return originGuard;

  try {
    const context = await requireTenantContext(await createClient());
    requireTenantAdmin(context);
    const { data: customer } = await context.supabase
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("organization_id", context.tenant.id)
      .maybeSingle<{ stripe_customer_id: string }>();

    if (!customer?.stripe_customer_id) {
      return NextResponse.json({ error: "No billing account found." }, { status: 404 });
    }

    const origin = canonicalSiteOrigin(request);
    let stripe: Stripe;
    try {
      stripe = getStripe();
    } catch (error) {
      return envErrorResponse(error) ?? NextResponse.json(
        { error: "Billing portal is not available right now." },
        { status: 500 },
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customer.stripe_customer_id,
      return_url: `${origin}/settings/billing`,
    });

    await auditAction(context, "billing.portal.created", {
      targetTable: "billing_customers",
      targetId: customer.stripe_customer_id,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return jsonError(error);
  }
}
