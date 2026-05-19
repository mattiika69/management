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
    expect([401, 403]).toContain(adminOverview.status());

    const billingPlans = await request.get("/api/billing/plans");
    expect([401, 403]).toContain(billingPlans.status());

    const anonymousMutation = await request.post("/api/learning", {
      data: { title: "Blocked", body: "This should not write." },
    });
    expect(anonymousMutation.status()).toBe(403);

    const companyContext = await request.put("/api/company-context", {
      data: { data: { company: "Blocked" } },
    });
    expect([401, 403]).toContain(companyContext.status());

    const leadCreate = await request.post("/api/leads", {
      data: { email: "blocked@example.com" },
    });
    expect([401, 403]).toContain(leadCreate.status());

    const sidebarOrder = await request.get("/api/settings/sidebar-order");
    expect([401, 403]).toContain(sidebarOrder.status());

    const acceptInvite = await request.post("/api/team/invitations/accept", {
      data: { token: "blocked-token" },
    });
    expect([401, 403]).toContain(acceptInvite.status());

    const smsSend = await request.post("/api/sms/send", {
      data: { phone: "+15555555555", message: "Blocked" },
    });
    expect([401, 403]).toContain(smsSend.status());

    const managementWrite = await request.post("/api/management", {
      data: { action: "setReviewFlag" },
    });
    expect([401, 403]).toContain(managementWrite.status());

    const meetingsWrite = await request.post("/api/meetings", {
      data: { meetingType: "team", meetingDate: "2026-05-19" },
    });
    expect([401, 403]).toContain(meetingsWrite.status());

    const calendarInvite = await request.post("/api/calendar/invites", {
      data: {
        title: "Blocked",
        startAt: "2026-05-19T13:00:00Z",
        endAt: "2026-05-19T13:30:00Z",
        recipientEmails: ["blocked@example.com"],
      },
    });
    expect([401, 403]).toContain(calendarInvite.status());

    const zoomSync = await request.post("/api/zoom/recordings/sync", {
      data: { connectionId: "00000000-0000-0000-0000-000000000000" },
    });
    expect([401, 403]).toContain(zoomSync.status());

    const telegramStatus = await request.get("/api/integrations/telegram/status");
    expect([401, 403]).toContain(telegramStatus.status());

    const slackEvents = await request.post("/api/integrations/slack/events", {
      data: {},
    });
    expect([401, 503]).toContain(slackEvents.status());

    const telegramWebhook = await request.post("/api/integrations/telegram/webhook", {
      data: {},
    });
    expect([401, 503]).toContain(telegramWebhook.status());

    const scheduledWorker = await request.post("/api/workflows/scheduled", {
      data: {},
    });
    expect([401, 503]).toContain(scheduledWorker.status());
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

    const normalSignup = await page.goto("/signup", { waitUntil: "domcontentloaded" });
    expect(normalSignup?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "HyperOptimal" })).toBeVisible();
    await expect(page.getByLabel("Organization Name")).toBeVisible();

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

    await page.goto("/login#access_token=fake&refresh_token=fake&type=recovery", {
      waitUntil: "domcontentloaded",
    });
    await expect(page).toHaveURL(/\/update-password#access_token=fake/);
    await expect(page.getByRole("heading", { name: "Update password" })).toBeVisible();
  });
});
