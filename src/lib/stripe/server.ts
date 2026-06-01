import "server-only";
import Stripe from "stripe";
import { requireServerEnv } from "@/lib/env/server";

export function getStripe() {
  const secretKey = requireServerEnv("STRIPE_SECRET_KEY");
  return new Stripe(secretKey);
}
