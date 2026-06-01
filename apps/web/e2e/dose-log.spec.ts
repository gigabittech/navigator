/**
 * Dose-log and correction E2E — the critical write path of the app.
 *
 * Runs against the Next.js dev server in local mode (no Supabase credentials).
 * PGlite seeds demo data on first load: two medications (Methylphenidate ER at
 * 07:00 + 12:00, Guanfacine at 20:00). Today's 07:00 dose is pre-logged; the
 * noon and evening slots are left scheduled so there is always both an
 * unlogged slot to log and a logged slot to correct.
 *
 * These cover:
 *   1. Log a fresh dose outcome -> it sticks and shows on the timeline.
 *   2. Correct an existing dose -> append-only *Corrected event resolves and
 *      the corrected state is reflected in the UI.
 */
import { test, expect, type Page } from "@playwright/test";

/** Wait for PGlite WASM to initialise and seed, then for dose cards to paint. */
async function gotoToday(page: Page) {
  await page.goto("/today");
  // The page wrapper renders immediately; dose chips appear once PGlite has
  // seeded and useTodayDoses has resolved. Wait for the chips, not just the
  // wrapper, so the subsequent interactions are not racing initialisation.
  await page.waitForSelector('[data-testid="today-page"]', { timeout: 20_000 });
  await page
    .waitForSelector('[data-testid="dose-chip"]', { timeout: 20_000 })
    .catch(() => {
      // Fall through — assertions below give a clearer failure than this wait.
    });
}

test.describe("Dose logging", () => {
  test("today page paints dose cards from seeded data", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await gotoToday(page);

    // Seeded medications produce at least one dose card with outcome chips.
    const chipGroups = page.locator('[data-testid="dose-chip"]');
    await expect(chipGroups.first()).toBeVisible({ timeout: 15_000 });
    expect(await chipGroups.count()).toBeGreaterThan(0);
    expect(errors).toHaveLength(0);
  });

  test("logs an unlogged dose and it persists in the card", async ({ page }) => {
    await gotoToday(page);

    // Find a dose card whose "Taken" chip is not yet pressed — i.e. a still
    // scheduled slot (noon / evening in the seed). The seeded morning dose is
    // already logged, so we target an unpressed one to exercise a fresh log.
    const takenChips = page.locator('[data-testid="dose-chip-taken"]');
    await expect(takenChips.first()).toBeVisible({ timeout: 15_000 });

    const count = await takenChips.count();
    let target = takenChips.first();
    for (let i = 0; i < count; i++) {
      const chip = takenChips.nth(i);
      if ((await chip.getAttribute("aria-pressed")) === "false") {
        target = chip;
        break;
      }
    }

    await target.click();

    // The optimistic local INSERT flips aria-pressed almost immediately.
    await expect(target).toHaveAttribute("aria-pressed", "true", {
      timeout: 8_000,
    });

    // The card surfaces an undo affordance ("Logged." + Undo) right after a
    // fresh log — proof the write landed and the projection re-read.
    await expect(
      page.getByText("Logged.", { exact: false }).first(),
    ).toBeVisible({ timeout: 8_000 });
  });

  test("logged dose shows on the timeline", async ({ page }) => {
    await gotoToday(page);

    // Log a fresh "Taken" if any slot is still scheduled (otherwise the seed
    // already has logged events, which is also fine for this assertion).
    const takenChips = page.locator('[data-testid="dose-chip-taken"]');
    await expect(takenChips.first()).toBeVisible({ timeout: 15_000 });
    const count = await takenChips.count();
    for (let i = 0; i < count; i++) {
      const chip = takenChips.nth(i);
      if ((await chip.getAttribute("aria-pressed")) === "false") {
        await chip.click();
        await expect(chip).toHaveAttribute("aria-pressed", "true", {
          timeout: 8_000,
        });
        break;
      }
    }

    await page.goto("/timeline");

    // Seeded history plus today's doses guarantee at least one timeline event.
    const events = page.locator('[data-testid="timeline-event"]');
    await expect(events.first()).toBeVisible({ timeout: 12_000 });
    expect(await events.count()).toBeGreaterThan(0);

    // A dose event renders its medication name as the card title.
    await expect(
      events.filter({ hasText: /Methylphenidate|Guanfacine/ }).first(),
    ).toBeVisible({ timeout: 8_000 });
  });
});

test.describe("Dose correction (append-only)", () => {
  test("correcting a logged dose resolves to the new outcome", async ({
    page,
  }) => {
    await gotoToday(page);

    // The seeded morning 07:00 dose is already logged (taken, slightly late),
    // so its card has a chip with aria-pressed="true". Find that card by
    // locating an already-pressed chip, then tap a *different* outcome on the
    // same card — that emits a MedicationDoseCorrected event.
    const allChips = page.locator(
      '[data-testid^="dose-chip-"]:not([data-testid="dose-chip"])',
    );
    await expect(allChips.first()).toBeVisible({ timeout: 15_000 });

    // Locate a dose-chip group that already has a pressed outcome.
    const groups = page.locator('[data-testid="dose-chip"]');
    const groupCount = await groups.count();

    let loggedGroupIndex = -1;
    for (let i = 0; i < groupCount; i++) {
      const pressed = groups
        .nth(i)
        .locator('button[aria-pressed="true"]');
      if ((await pressed.count()) > 0) {
        loggedGroupIndex = i;
        break;
      }
    }

    // If no slot was pre-logged (seed variance), log one first so we have a
    // logged dose to correct — keeps the test resilient.
    if (loggedGroupIndex === -1) {
      const firstTaken = groups
        .first()
        .locator('[data-testid="dose-chip-taken"]');
      await firstTaken.click();
      await expect(firstTaken).toHaveAttribute("aria-pressed", "true", {
        timeout: 8_000,
      });
      loggedGroupIndex = 0;
    }

    const group = groups.nth(loggedGroupIndex);

    // Read the currently pressed outcome, then pick a different one to correct
    // to. "missed" and "refused" are always present and distinct outcomes.
    const currentlyPressed = group.locator('button[aria-pressed="true"]');
    const pressedTestId = await currentlyPressed
      .first()
      .getAttribute("data-testid");

    const correctionTarget =
      pressedTestId === "dose-chip-refused"
        ? group.locator('[data-testid="dose-chip-missed"]')
        : group.locator('[data-testid="dose-chip-refused"]');

    await correctionTarget.click();

    // The corrected outcome becomes the pressed one — the *Corrected event was
    // appended and the projection resolved it as the winning status.
    await expect(correctionTarget).toHaveAttribute("aria-pressed", "true", {
      timeout: 8_000,
    });

    // And the previously pressed chip is no longer the active outcome.
    await expect(currentlyPressed.first()).toHaveAttribute(
      "aria-pressed",
      "false",
      { timeout: 8_000 },
    );

    // Reloading proves the correction was persisted to the append-only log and
    // re-resolved on a cold read (not just optimistic local state).
    await page.reload();
    await page.waitForSelector('[data-testid="dose-chip"]', {
      timeout: 20_000,
    });
    const groupAfter = page.locator('[data-testid="dose-chip"]').nth(
      loggedGroupIndex,
    );
    const targetTestId = await correctionTarget.getAttribute("data-testid");
    await expect(
      groupAfter.locator(`[data-testid="${targetTestId}"]`),
    ).toHaveAttribute("aria-pressed", "true", { timeout: 12_000 });
  });
});
