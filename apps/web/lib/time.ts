/**
 * Time + date formatting helpers. All output follows docs/voice.md:
 *   • 12-hour clock, lowercase am/pm — "7:42 am"
 *   • relative timeline times — "12m ago", "2h ago", "Yesterday · 8:14 pm"
 *   • whole-number everything
 *
 * Pure functions, no globals beyond the optional `now` injection point so
 * they stay testable.
 */

function asDate(d: Date | string): Date {
  return d instanceof Date ? d : new Date(d);
}

/** ISO timestamp for a given day at an "HH:MM" wall-clock time, local zone. */
export function slotIso(day: Date, hhmm: string): string {
  const [h, m] = hhmm.split(":").map((n) => Number.parseInt(n, 10));
  const d = new Date(day);
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d.toISOString();
}

/** "7:42 am" — 12-hour, lowercase meridiem, no leading zero on the hour. */
export function formatClock(input: Date | string): string {
  const d = asDate(input);
  let h = d.getHours();
  const m = d.getMinutes();
  const meridiem = h >= 12 ? "pm" : "am";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m.toString().padStart(2, "0")} ${meridiem}`;
}

/** Start of the local day for `input` (defaults to now). */
export function startOfDay(input: Date | string = new Date()): Date {
  const d = asDate(input);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Relative time for timeline rows.
 *   < 1m   → "just now"
 *   < 1h   → "12m ago"
 *   today  → "2h ago"
 *   prior  → "Yesterday · 8:14 pm" / "Mon · 8:14 pm"
 */
export function relativeTime(input: Date | string, now: Date = new Date()): string {
  const d = asDate(input);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;

  if (isSameDay(d, now)) {
    const diffHr = Math.floor(diffMin / 60);
    return `${diffHr}h ago`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(d, yesterday)) return `Yesterday · ${formatClock(d)}`;

  const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
  return `${weekday} · ${formatClock(d)}`;
}

/**
 * A stable, human key for grouping timeline rows under sticky date headers.
 * Returns "Today", "Yesterday", or "Mon, May 18".
 */
export function dayHeading(input: Date | string, now: Date = new Date()): string {
  const d = asDate(input);
  if (isSameDay(d, now)) return "Today";

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(d, yesterday)) return "Yesterday";

  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/** Calendar day bucket key — "2026-05-25" in local time, for grouping. */
export function dayKey(input: Date | string): string {
  const d = asDate(input);
  const y = d.getFullYear();
  const mo = (d.getMonth() + 1).toString().padStart(2, "0");
  const da = d.getDate().toString().padStart(2, "0");
  return `${y}-${mo}-${da}`;
}
