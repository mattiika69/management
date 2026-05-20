import { NextResponse } from "next/server";
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
    const session = await getStripe().billingPortal.sessions.create({
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
