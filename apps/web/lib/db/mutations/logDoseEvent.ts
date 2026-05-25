"use client";

import type { PGliteInterface } from "@electric-sql/pglite";
import { EventType } from "@navigator/schema/event-types";
import { getContext } from "./context.js";
import { insertEvent } from "./insert.js";

export type DoseOutcome = "taken" | "late" | "missed" | "refused" | "vomited";

export interface LogDoseInput {
  medicationId: string;
  /** ISO timestamp of the scheduled slot this dose belongs to. */
  scheduledFor: string;
  doseMg: number;
  outcome: DoseOutcome;
  reason?: string;
  parentNote?: string;
  occurredAt?: Date;
}

const outcomeToType: Record<DoseOutcome, string> = {
  taken: EventType.Taken,
  late: EventType.Late,
  missed: EventType.Missed,
  refused: EventType.Refused,
  vomited: EventType.Vomited,
};

/** Log a fresh dose outcome for a scheduled slot. */
export async function logDoseEvent(db: PGliteInterface, input: LogDoseInput): Promise<string> {
  const { childId, profileId } = await getContext(db);
  const occurredAt = input.occurredAt ?? new Date();
  const eventType = outcomeToType[input.outcome];

  let payload: Record<string, unknown>;
  if (input.outcome === "missed") {
    payload = {
      medication_id: input.medicationId,
      scheduled_for: input.scheduledFor,
      reason: input.reason,
    };
  } else if (input.outcome === "refused") {
    payload = {
      medication_id: input.medicationId,
      scheduled_for: input.scheduledFor,
      reason: input.reason,
      parent_note: input.parentNote,
    };
  } else {
    const minutesOffset = Math.round(
      (occurredAt.getTime() - new Date(input.scheduledFor).getTime()) / 60000,
    );
    payload = {
      medication_id: input.medicationId,
      scheduled_for: input.scheduledFor,
      dose_mg: input.doseMg,
      minutes_offset: minutesOffset,
    };
  }

  return insertEvent(db, { childId, loggedBy: profileId, eventType, payload, occurredAt });
}
