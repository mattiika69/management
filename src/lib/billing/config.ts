import "server-only";
import {
  BILLING_PLAN_PRICE_ENV,
  DEFAULT_BILLING_PLAN,
  type BillingPlanKey,
} from "@/lib/billing/contract";
import { requireServerEnv } from "@/lib/env/server";

export function getBillingPlanPriceId(plan: BillingPlanKey = DEFAULT_BILLING_PLAN) {
  return requireServerEnv(BILLING_PLAN_PRICE_ENV[plan]);
}
