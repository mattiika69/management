import { expect, test } from "@playwright/test";

test.describe("production public launch boundaries", () => {
  test("keeps public routes safe for anonymous traffic", async ({
    page,
    request,
  }) => {
    const health = await request.get("/api/health");
    expect(health.ok()).toBe(true);
    const healthPayload = (await health.json()) as Record<string, unknown>;
    expect(healthPayload).toEqual({
      ok: true,
      app: "HyperOptimal Management",
      time: expect.any(String),
    });

    const login = await page.goto("/login", { waitUntil: "domcontentloaded" });
    expect(login?.status()).toBe(200);
    expect(page.url()).toContain("/management");
    await expect(page.getByRole("heading", { name: "Management" })).toBeVisible();

    await page.goto("/management", { waitUntil: "domcontentloaded" });
    expect(page.url()).toContain("/management");

    const admin = await page.goto("/admin", { waitUntil: "domcontentloaded" });
    expect(admin?.status()).toBe(404);

    const adminOverview = await request.get("/api/admin/overview");
    expect(adminOverview.status()).toBe(403);

    const billingPlans = await request.get("/api/billing/plans");
    expect(billingPlans.ok()).toBe(true);
  });
});
