import assert from "node:assert/strict";
import { test } from "node:test";
import {
  providerSetupReport,
  readEnvVar,
  requireEnvVar,
  validatePublicEnv,
  validateServerEnv,
} from "../src/lib/env/core.ts";
import {
  BILLING_PLAN_PRICE_ENV,
  DEFAULT_BILLING_SEAT_QUANTITY,
  validateBillingSeatQuantity,
} from "../src/lib/billing/contract.ts";
import { billingCheckoutRedirects } from "../src/lib/billing/redirects.ts";

test("names missing server environment variables without exposing values", () => {
  assert.throws(
    () => requireEnvVar("STRIPE_SECRET_KEY", {}, "server"),
    /Missing required server environment variable: STRIPE_SECRET_KEY/,
  );
});

test("supports deployed aliases while documenting the requested env names", () => {
  const env = {
    NEXT_PUBLIC_SITE_URL: "https://app.hiretrainmanage.ai",
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_test",
    STRIPE_ONBOARDING_PRICE_ID: "price_basic",
    RESEND_FROM_EMAIL: "team@example.com",
  };

  assert.equal(readEnvVar("NEXT_PUBLIC_APP_URL", env), env.NEXT_PUBLIC_SITE_URL);
  assert.equal(
    readEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY", env),
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  assert.equal(readEnvVar("STRIPE_PRICE_BASIC", env), env.STRIPE_ONBOARDING_PRICE_ID);
  assert.equal(readEnvVar("EMAIL_FROM", env), env.RESEND_FROM_EMAIL);
});

test("validates public env separately from server-only env", () => {
  assert.deepEqual(validatePublicEnv({
    NEXT_PUBLIC_APP_URL: "not-a-url",
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "not-a-publishable-key",
  }), {
    missing: [],
    invalid: ["NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"],
  });

  assert.deepEqual(validateServerEnv({
    SUPABASE_SERVICE_ROLE_KEY: "service",
    STRIPE_SECRET_KEY: "secret",
    STRIPE_WEBHOOK_SECRET: "webhook",
    STRIPE_PRICE_BASIC: "price",
    RESEND_API_KEY: "resend",
    EMAIL_FROM: "team@example.com",
    AI_MODEL: "claude-sonnet-4-5",
    ANTHROPIC_API_KEY: "anthropic",
    SLACK_SIGNING_SECRET: "slack-signing",
    SLACK_CLIENT_ID: "slack-client",
    SLACK_CLIENT_SECRET: "slack-secret",
    TELEGRAM_BOT_TOKEN: "telegram-token",
    TELEGRAM_BOT_USERNAME: "telegram_bot",
    TELEGRAM_WEBHOOK_SECRET: "telegram-secret",
  }), {
    missing: [],
    invalid: [],
  });
});

test("reports only currently needed manual provider setup", () => {
  const report = providerSetupReport({ STRIPE_PRICE_BASIC: "price_basic" });
  const manualMissing = report
    .filter((item) => item.manual && !item.configured)
    .map((item) => item.name);

  assert.deepEqual(manualMissing, [
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
  ]);
  assert.equal(BILLING_PLAN_PRICE_ENV.basic, "STRIPE_PRICE_BASIC");
});

test("keeps seat changes constrained to the current fixed beta quantity", () => {
  assert.equal(DEFAULT_BILLING_SEAT_QUANTITY, 10);
  assert.deepEqual(validateBillingSeatQuantity(10), {
    valid: true,
    quantity: 10,
    error: "",
  });
  assert.deepEqual(validateBillingSeatQuantity(11), {
    valid: false,
    quantity: 11,
    error: "Seat quantity is capped at 10 during beta.",
  });
});

test("keeps checkout and onboarding redirects explicit", () => {
  assert.deepEqual(billingCheckoutRedirects("https://app.example.com", false), {
    successUrl: "https://app.example.com/signup?checkout=success",
    cancelUrl: "https://app.example.com/?checkout=cancelled",
  });
  assert.deepEqual(billingCheckoutRedirects("https://app.example.com", true), {
    successUrl: "https://app.example.com/get-started?billing=success",
    cancelUrl: "https://app.example.com/get-started?billing=cancelled",
  });
});
