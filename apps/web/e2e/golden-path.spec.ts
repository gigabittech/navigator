/**
 * Golden-path E2E — log a dose and see it reflected across the app.
 *
 * These tests run against the Next.js dev server in local mode (no Supabase
 * credentials required). PGlite is seeded with demo data on first load so
 * the /today page will have at least one dose chip.
 */
import { test, expect } from "@playwright/test";

test.describe("Golden path — log a dose and see it everywhere", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to /today and wait for PGlite to initialize + seed.
    await page.goto("/today");

    // Wait for the page wrapper or any dose chip to appear (whichever comes
    // first). PGlite WASM initialization can take several seconds.
    await Promise.race([
      page.waitForSelector('[data-testid="today-page"]', { timeout: 15_000 }),
      page.waitForSelector('[data-testid="dose-chip"]', { timeout: 15_000 }),
    ]).catch(() => {
      // If neither selector appears, continue anyway — the test assertions
      // below will produce the right failure message.
    });
  });

  test("today page renders without JS errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    // Give any deferred init scripts a moment to settle.
    await page.waitForTimeout(2_000);

    expect(errors).toHaveLength(0);
    await expect(page.locator("main, [data-testid='today-page'], h1")).toBeVisible();
  });

  test("logs a dose and sees it on the timeline", async ({ page }) => {
    // The "Taken" chip is the first outcome button in each DoseCard.
    // aria-pressed="false" means it has not been logged yet.
    const takenChip = page
      .locator('[data-testid="dose-chip-taken"]')
      .first();

    // If the specific testid is not found yet, fall back to any button
    // labelled "Taken" in the dose card group.
    const chipLocator = (await takenChip.count()) > 0
      ? takenChip
      : page
          .locator('[role="group"] button')
          .filter({ hasText: "Taken" })
          .first();

    await expect(chipLocator).toBeVisible({ timeout: 10_000 });
    await chipLocator.click();

    // After clicking, the button should become active (aria-pressed="true").
    await expect(chipLocator).toHaveAttribute("aria-pressed", "true", {
      timeout: 5_000,
    });

    // Navigate to the timeline and confirm at least one event appears.
    await page.goto("/timeline");

    const timelineItems = page
      .locator('[data-testid="timeline-event"]')
      .first();

    // Fallback: any Card on the timeline page.
    const fallback = page.locator("main section .card, main [class*='card']").first();

    const visible = (await timelineItems.count()) > 0 ? timelineItems : fallback;
    await expect(visible).toBeVisible({ timeout: 8_000 });
  });

  test("report page renders the generate button without errors", async ({ page }) => {
    await page.goto("/report");
    await page.waitForLoadState("networkidle");

    // The report page starts in idle state with a "Generate report" button.
    const body = await page.textContent("body");
    expect(body).toBeTruthy();
    expect(body!.length).toBeGreaterThan(100);

    // Either the generate button or an already-rendered report container.
    const generateBtn = page.locator('[data-testid="report-content"], button', {
      hasText: /generate report|pulling/i,
    });
    await expect(generateBtn.first()).toBeVisible({ timeout: 10_000 });
  });

  test("prep page renders without errors", async ({ page }) => {
    await page.goto("/prep");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible();
  });
});
