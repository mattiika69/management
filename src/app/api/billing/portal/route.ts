import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/server";
import {
  auditAction,
  jsonError,
  requireTenantAdmin,
  requireTenantContext,
} from "@/lib/tenant-context";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
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

    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
    const session = await getStripe().billingPortal.sessions.create({
      customer: customer.stripe_customer_id,
      return_url: `${origin.replace(/\/$/, "")}/settings/billing`,
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
