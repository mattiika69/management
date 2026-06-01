import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env/server";
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
          available: Boolean(getServerEnv("STRIPE_PRICE_BASIC")),
        },
      ],
    });
  } catch (error) {
    return jsonError(error);
  }
}
