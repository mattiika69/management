import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    plans: [
      {
        key: "onboarding",
        name: "Onboarding",
        priceId:
          process.env.STRIPE_ONBOARDING_PRICE_ID ??
          process.env.STRIPE_PRICE_ID ??
          null,
      },
    ],
  });
}
