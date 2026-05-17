import { expect, test } from "@playwright/test";

test.describe("app shell", () => {
  test("keeps the management shell and sidebar on the shared visual standard", async ({ page }) => {
    await page.goto("/management", { waitUntil: "domcontentloaded" });

    const sidebar = page.locator("aside.ho-side-nav");
    await expect(sidebar).toBeVisible();
    await expect(sidebar).toHaveCSS("width", "220px");
    await expect(sidebar).toHaveCSS("background-image", /linear-gradient/);
    await expect(sidebar.getByText("Org:", { exact: true })).toHaveCount(0);

    await expect(page.locator(".app-page-title")).toHaveText("Management");
    await expect(page.locator(".app-page-title")).toHaveCSS("font-size", "19px");
    await expect(page.locator(".app-page-shell")).toHaveCSS("padding-top", "37px");
    await expect(page.getByText("MDP", { exact: true })).toHaveCount(0);

    const parent = sidebar.getByRole("button", { name: /^Hiring$/ });
    await expect(parent).toBeVisible();
    await expect(parent).toHaveCSS("font-size", "9.7px");
    await expect(parent).toHaveCSS("font-weight", "500");
    await expect(parent).toHaveCSS("text-transform", "uppercase");
    await expect(parent).toHaveCSS("letter-spacing", "0.575px");

    const overview = sidebar.getByRole("link", { name: "Overview" });
    await expect(overview).toBeVisible();
    await expect(overview).toHaveCSS("font-size", "12px");
    await expect(overview).toHaveCSS("min-height", "24px");

    const dragHandle = sidebar.locator(".ho-sidebar-drag-handle").first();
    await expect(dragHandle).toBeVisible();
    await expect(dragHandle).toHaveCSS("opacity", "0.62");

    await parent.click();
    await expect(sidebar.getByRole("link", { name: "Job Descriptions" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Screening" })).toBeVisible();
  });
});
