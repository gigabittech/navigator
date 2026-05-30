/**
 * Projections turn the append-only event stream into UI-ready read models.
 * These functions are pure (no I/O), pure-TS, testable in isolation.
 *
 * Convention: every projection takes a chronologically-sorted (oldest →
 * newest) array of events and returns a state snapshot. Re-runs are cheap
 * because we operate on a bounded window (today, last 7 days, last 90 days).
 */

import type { LogEvent } from "./log-events.js";
import { EventType, type DoseCorrectedPayload } from "./event-types.js";

export interface DoseStatusSnapshot {
  medicationId: string;
  scheduledFor: string;
  status: "scheduled" | "taken" | "missed" | "refused" | "late" | "vomited";
  /** Minutes late vs. `scheduledFor`. Positive = late, negative = early. */
  minutesOffset?: number;
  /** Most recent event id that determined this status (for "undo"). */
  sourceEventId: string;
  /** True if a `DoseCorrected` event has replaced an earlier status. */
  corrected: boolean;
}

/**
 * Reduce all medication events for a window into per-(medication, slot)
 * status snapshots.
 *
 * Two passes, so the result does not depend on whether a `DoseCorrected`
 * event sorts before or after the event it corrects. (Corrections are now
 * stamped with the *original* event's `occurred_at` for stable timeline
 * placement — see `correctDoseEvent` — which means a correction and its
 * target can share an `occurred_at` and arrive in either order.)
 *
 *  1. Build the base snapshot per (medication, slot) from status-setting
 *     events — last one wins.
 *  2. Apply corrections, keyed by the event id they target — last correction
 *     wins. A correction that targets an unknown event id is a no-op.
 */
export function projectDoseStatus(events: LogEvent[]): DoseStatusSnapshot[] {
  const bySlot = new Map<string, DoseStatusSnapshot>();
  // Index of the base event id that currently owns each slot, so a later
  // correction can locate its target regardless of array order.
  const slotByEventId = new Map<string, string>();

  // ── Pass 1: status-setting events ───────────────────────────────────────
  for (const event of events) {
    if (event.eventType === EventType.Corrected) continue;

    const payload = event.payload as Record<string, unknown>;
    const medId = payload["medication_id"] as string | undefined;
    const scheduledFor = payload["scheduled_for"] as string | undefined;
    if (!medId || !scheduledFor) continue;

    const status = mapEventTypeToStatus(event.eventType);
    if (!status) continue;

    const key = `${medId}|${scheduledFor}`;
    bySlot.set(key, {
      medicationId: medId,
      scheduledFor,
      status,
      minutesOffset: payload["minutes_offset"] as number | undefined,
      sourceEventId: event.id,
      corrected: false,
    });
    slotByEventId.set(event.id, key);
  }

  // ── Pass 2: corrections (last correction per target wins) ────────────────
  for (const event of events) {
    if (event.eventType !== EventType.Corrected) continue;

    const correction = event.payload as unknown as DoseCorrectedPayload;
    const slotKey = slotByEventId.get(correction.corrects_event_id);
    if (!slotKey) continue; // orphan correction — no target.

    const target = bySlot.get(slotKey);
    if (!target) continue;

    target.status = correction.new_status;
    target.corrected = true;
    target.sourceEventId = event.id;
    // Allow a subsequent correction to chain onto this one.
    slotByEventId.set(event.id, slotKey);
  }

  return [...bySlot.values()];
}

function mapEventTypeToStatus(t: string): DoseStatusSnapshot["status"] | undefined {
  switch (t) {
    case EventType.Scheduled:
      return "scheduled";
    case EventType.Taken:
      return "taken";
    case EventType.Missed:
      return "missed";
    case EventType.Refused:
      return "refused";
    case EventType.Late:
      return "late";
    case EventType.Vomited:
      return "vomited";
    default:
      return undefined;
  }
}

/** % of scheduled doses with a final `taken` or `late` status. Whole numbers. */
export function adherenceRate(snapshots: DoseStatusSnapshot[]): number {
  if (snapshots.length === 0) return 0;
  const accounted = snapshots.filter((s) => s.status !== "scheduled");
  if (accounted.length === 0) return 0;
  const successful = accounted.filter((s) => s.status === "taken" || s.status === "late").length;
  return Math.round((successful / accounted.length) * 100);
}
