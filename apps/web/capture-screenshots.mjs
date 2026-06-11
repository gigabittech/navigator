/**
 * Capture marketing-surface screenshots for the proposal + deck.
 * Saves real PNG files to docs/assets/screenshots/.
 *
 * Usage (from apps/web, with the dev server running on :3001):
 *   node capture-screenshots.mjs
 */
import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
// apps/web -> repo root -> docs/assets/screenshots
const OUT = join(__dirname, "..", "..", "docs", "assets", "screenshots");
const BASE = process.env.BASE_URL || "http://localhost:3001";

const SECTIONS = [
  { id: "top", name: "hero" },
  { id: "problem", name: "problem" },
  { id: "tracker", name: "tracker" },
  { id: "report", name: "report" },
  { id: "security", name: "security" },
  { id: "faq", name: "faq" },
  { id: "waitlist", name: "waitlist" },
];

async function captureAt(browser, { width, height, tag, deviceScaleFactor }) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: deviceScaleFactor ?? 2,
  });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  let i = 1;
  for (const s of SECTIONS) {
    const el = await page.$(`#${s.id}`);
    if (!el) {
      console.log(`  [skip] ${tag} #${s.id} not found`);
      continue;
    }
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    const num = String(i).padStart(2, "0");
    const file = join(OUT, `${tag}-${num}-${s.name}.png`);
    await page.screenshot({ path: file });
    console.log(`  [ok] ${file}`);
    i++;
  }
  await ctx.close();
}

const browser = await chromium.launch();
console.log("Desktop (1440x900)…");
await captureAt(browser, { width: 1440, height: 900, tag: "desktop" });
console.log("Mobile (390x844)…");
await captureAt(browser, { width: 390, height: 844, tag: "mobile", deviceScaleFactor: 3 });
await browser.close();
console.log("Done.");
