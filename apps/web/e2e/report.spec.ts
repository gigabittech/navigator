/**
 * Report generation E2E — the product's promise to clinicians.
 *
 * Runs against the Next.js dev server in local mode (no Supabase credentials).
 * PGlite seeds a realistic week-plus of dose events, so generating the 90-day
 * report produces real highlight stats and at least one section.
 *
 * Covers flow 3: navigate to /report, generate, assert a section renders with
 * its stat. The report is generated entirely on-device from the local event
 * log — no network round-trip is involved.
 */
import { test, expect } from "@playwright/test";

test.describe("Report generation", () => {
  test("generates a 90-day report with highlight stats and a section", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/report");
    await page.waitForSelector('[data-testid="report-content"]', {
      timeout: 20_000,
    });

    // Idle state shows the "Generate report" CTA. It is disabled until the
    // child record loads from PGlite, so wait for it to become enabled.
    const generateBtn = page.getByRole("button", { name: /generate report/i });
    await expect(generateBtn).toBeVisible({ timeout: 15_000 });
    await expect(generateBtn).toBeEnabled({ timeout: 15_000 });

    await generateBtn.click();

    // ── Highlight stats ──────────────────────────────────────────────────
    // Once generated, the report renders four highlight metrics. "Adherence"
    // is always present and is shown as a percentage — assert both the label
    // and a numeric % value to prove the stat was computed, not stubbed.
    const adherenceLabel = page.getByText("Adherence", { exact: true });
    await expect(adherenceLabel).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText("Days covered", { exact: true })).toBeVisible();
    await expect(page.getByText("Events logged", { exact: true })).toBeVisible();

    // The adherence metric value sits next to its label; it must end in "%".
    const reportBody = (await page.textContent("body")) ?? "";
    expect(reportBody).toMatch(/\d+%/);

    // ── Section with stat ────────────────────────────────────────────────
    // Generated sections carry an uppercase title (e.g. "Medication
    // adherence"). At least one section must render from the seeded events.
    await expect(
      page.getByText(/medication adherence/i).first(),
    ).toBeVisible({ timeout: 10_000 });

    expect(errors).toHaveLength(0);
  });

  test("report exposes export and refresh actions after generating", async ({
    page,
  }) => {
    await page.goto("/report");
    await page.waitForSelector('[data-testid="report-content"]', {
      timeout: 20_000,
    });

    const generateBtn = page.getByRole("button", { name: /generate report/i });
    await expect(generateBtn).toBeEnabled({ timeout: 15_000 });
    await generateBtn.click();

    // Post-generation action row — proof the report view (not the idle CTA)
    // is now mounted.
    await expect(
      page.getByRole("button", { name: /export pdf/i }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole("button", { name: /add ai summary/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /refresh/i }),
    ).toBeVisible();
  });
});
