import { expect, test } from "@playwright/test";

function localOrigin() {
  return process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100";
}

test.describe("billing safety boundaries", () => {
  test("guards billing pages and server-only billing actions", async ({ page, request }) => {
    const billingPage = await page.goto("/settings/billing", {
      waitUntil: "domcontentloaded",
    });
    expect(billingPage?.status()).toBeLessThan(400);
    expect(page.url()).toContain("/login");

    const checkout = await request.post("/api/billing/checkout", {
      data: {},
    });
    expect(checkout.status()).toBe(403);

    const portal = await request.post("/api/billing/portal", {
      data: {},
    });
    expect(portal.status()).toBe(403);

    const creditCheckout = await request.post("/api/billing/credits/checkout", {
      data: { pack: "starter" },
    });
    expect(creditCheckout.status()).toBe(403);

    const missingSeatRoute = await request.post("/api/billing/seats", {
      headers: { Origin: localOrigin() },
      data: { quantity: 11 },
    });
    expect([404, 405]).toContain(missingSeatRoute.status());
  });

  test("requires signed Stripe webhook payloads", async ({ request }) => {
    const webhook = await request.post("/api/billing/webhook", {
      data: {},
    });

    if (webhook.status() === 500) {
      const body = (await webhook.json()) as { error?: string };
      expect(body.error).toContain("STRIPE_WEBHOOK_SECRET");
      return;
    }

    expect(webhook.status()).toBe(400);
    const body = (await webhook.json()) as { error?: string };
    expect(body.error).toContain("Stripe signature");
  });
});
