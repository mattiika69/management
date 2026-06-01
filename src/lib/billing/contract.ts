export const BILLING_PLAN_PRICE_ENV = {
  basic: "STRIPE_PRICE_BASIC",
  pro: "STRIPE_PRICE_PRO",
  business: "STRIPE_PRICE_BUSINESS",
} as const;

export type BillingPlanKey = keyof typeof BILLING_PLAN_PRICE_ENV;

export const DEFAULT_BILLING_PLAN: BillingPlanKey = "basic";
export const DEFAULT_BILLING_SEAT_QUANTITY = 10;
export const MIN_BILLING_SEAT_QUANTITY = 10;
export const MAX_BILLING_SEAT_QUANTITY = 10;

export function normalizeBillingPlan(value: unknown): BillingPlanKey {
  return typeof value === "string" && value in BILLING_PLAN_PRICE_ENV
    ? (value as BillingPlanKey)
    : DEFAULT_BILLING_PLAN;
}

export function validateBillingSeatQuantity(value: unknown) {
  const quantity = Number(value);

  if (!Number.isInteger(quantity)) {
    return {
      valid: false,
      quantity: DEFAULT_BILLING_SEAT_QUANTITY,
      error: "Seat quantity must be a whole number.",
    };
  }

  if (
    quantity < MIN_BILLING_SEAT_QUANTITY ||
    quantity > MAX_BILLING_SEAT_QUANTITY
  ) {
    return {
      valid: false,
      quantity,
      error: `Seat quantity is capped at ${DEFAULT_BILLING_SEAT_QUANTITY} during beta.`,
    };
  }

  return { valid: true, quantity, error: "" };
}
