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
 * status snapshots. Apply `DoseCorrected` events last so they override
 * whichever status came first.
 */
export function projectDoseStatus(events: LogEvent[]): DoseStatusSnapshot[] {
  const bySlot = new Map<string, DoseStatusSnapshot>();

  for (const event of events) {
    const payload = event.payload as Record<string, unknown>;
    const medId = payload["medication_id"] as string | undefined;
    const scheduledFor = payload["scheduled_for"] as string | undefined;

    if (event.eventType === EventType.Corrected) {
      const correction = payload as unknown as DoseCorrectedPayload;
      const target = [...bySlot.values()].find(
        (s) => s.sourceEventId === correction.corrects_event_id,
      );
      if (target) {
        target.status = correction.new_status;
        target.corrected = true;
        target.sourceEventId = event.id;
      }
      continue;
    }

    if (!medId || !scheduledFor) continue;
    const key = `${medId}|${scheduledFor}`;

    const status = mapEventTypeToStatus(event.eventType);
    if (!status) continue;

    bySlot.set(key, {
      medicationId: medId,
      scheduledFor,
      status,
      minutesOffset: payload["minutes_offset"] as number | undefined,
      sourceEventId: event.id,
      corrected: bySlot.get(key)?.corrected ?? false,
    });
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
