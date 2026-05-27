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
 */
export async function correctDoseEvent(
  db: PGliteInterface,
  input: CorrectDoseInput,
): Promise<string> {
  const { childId, profileId } = await getContext(db);
  return insertEvent(db, {
    childId,
    loggedBy: profileId,
    eventType: EventType.Corrected,
    payload: {
      corrects_event_id: input.correctsEventId,
      new_status: input.newStatus,
      reason: input.reason,
    },
  });
}
