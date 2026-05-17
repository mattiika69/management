import { NextResponse } from "next/server";
import { jsonError, requireTenantContext } from "@/lib/tenant-context";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    await requireTenantContext(await createClient());

    return NextResponse.json({
      plans: [
        {
          key: "onboarding",
          name: "Onboarding",
          available: Boolean(
            process.env.STRIPE_ONBOARDING_PRICE_ID ??
              process.env.STRIPE_PRICE_ID,
          ),
        },
      ],
    });
  } catch (error) {
    return jsonError(error);
  }
}
