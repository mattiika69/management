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
    await expect(page.getByRole("heading", { name: "HyperOptimal" })).toBeVisible();

    const management = await page.goto("/management", { waitUntil: "domcontentloaded" });
    expect(management?.status()).toBeLessThan(400);
    expect(page.url()).toContain("/login");
    expect(page.url()).toContain("next=%2Fmanagement");

    const admin = await page.goto("/admin", { waitUntil: "domcontentloaded" });
    expect(admin?.status()).toBeLessThan(400);
    expect(page.url()).toContain("/login");
    expect(page.url()).toContain("next=%2Fadmin");

    const adminOverview = await request.get("/api/admin/overview");
    expect(adminOverview.status()).toBe(403);

    const billingPlans = await request.get("/api/billing/plans");
    expect([401, 403]).toContain(billingPlans.status());
  });

  test("keeps invite auth and password reset outside the app bypass", async ({
    page,
  }) => {
    const inviteEmail = "invitee@example.com";
    const invitePath = "/invite/test-token";

    const login = await page.goto(
      `/login?next=${encodeURIComponent(invitePath)}&email=${encodeURIComponent(inviteEmail)}`,
      { waitUntil: "domcontentloaded" },
    );
    expect(login?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "HyperOptimal" })).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveValue(inviteEmail);
    await expect(page.getByRole("link", { name: "Forgot password?" })).toHaveAttribute(
      "href",
      `/reset-password?email=${encodeURIComponent(inviteEmail)}`,
    );

    const signup = await page.goto(
      `/signup?next=${encodeURIComponent(invitePath)}&email=${encodeURIComponent(inviteEmail)}`,
      { waitUntil: "domcontentloaded" },
    );
    expect(signup?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "HyperOptimal" })).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveValue(inviteEmail);
    await expect(page.getByLabel("Organization Name")).toHaveCount(0);

    const reset = await page.goto(
      `/reset-password?email=${encodeURIComponent(inviteEmail)}`,
      { waitUntil: "domcontentloaded" },
    );
    expect(reset?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "HyperOptimal" })).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveValue(inviteEmail);

    const update = await page.goto("/update-password?token_hash=fake&type=recovery", {
      waitUntil: "domcontentloaded",
    });
    expect(update?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Update password" })).toBeVisible();
  });
});
