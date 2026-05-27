/**
 * Onboarding and marketing page smoke tests.
 *
 * These verify the three public surfaces load without errors in local mode.
 */
import { test, expect } from "@playwright/test";

test.describe("Onboarding flow", () => {
  test("onboarding page loads", async ({ page }) => {
    await page.goto("/onboarding");
    await page.waitForLoadState("networkidle");
    // Should render the onboarding page without a JS error
    await expect(page.locator("main")).toBeVisible();
  });

  test("marketing home page loads and has Navigator in the title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Navigator/i, { timeout: 10_000 });
  });

  test("waitlist page loads", async ({ page }) => {
    await page.goto("/waitlist");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible();
  });
});
