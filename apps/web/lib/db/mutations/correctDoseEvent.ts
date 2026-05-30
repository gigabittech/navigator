"use client";

import type { PGliteInterface } from "@electric-sql/pglite";
import { EventType } from "@navigator/schema/event-types";
import { getContext } from "./context.js";
import { insertEvent } from "./insert.js";

export interface CorrectDoseInput {
  /** The log_event id whose status this corrects. */
  correctsEventId: string;
  newStatus: "taken" | "missed" | "refused" | "late" | "vomited";
  reason?: string;
}

/**
 * "Edit" a past dose. log_events is append-only, so we never touch the
 * original — we record a MedicationDoseCorrected event that the projection
 * applies last to override the earlier status.
 *
 * The correction is stamped with the *original* event's `occurred_at` so it
 * sorts to the same point on the timeline rather than to now(). Ordering of
 * who-wins is resolved by the projection (latest correction wins), so the
 * occurred_at here is purely about stable timeline placement.
 */
export async function correctDoseEvent(
  db: PGliteInterface,
  input: CorrectDoseInput,
): Promise<string> {
  const { childId, profileId } = await getContext(db);

  // Anchor the correction to the original event's occurred_at so it doesn't
  // jump to now() and reorder the timeline. Falls back to now() (insertEvent's
  // default) if the original can't be found on this device.
  const origRes = await db.query<{ occurred_at: string }>(
    `SELECT occurred_at FROM log_events WHERE id = $1`,
    [input.correctsEventId],
  );
  const original = origRes.rows[0];

  return insertEvent(db, {
    childId,
    loggedBy: profileId,
    eventType: EventType.Corrected,
    occurredAt: original ? new Date(original.occurred_at) : undefined,
    payload: {
      corrects_event_id: input.correctsEventId,
      new_status: input.newStatus,
      reason: input.reason,
    },
  });
}
