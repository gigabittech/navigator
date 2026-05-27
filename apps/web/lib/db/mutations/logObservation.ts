"use client";

import type { PGliteInterface } from "@electric-sql/pglite";
import { EventType } from "@navigator/schema/event-types";
import { getContext } from "./context.js";
import { insertEvent } from "./insert.js";

export interface LogObservationInput {
  tags: string[];
  note?: string;
  context?: "home" | "school" | "other";
  occurredAt?: Date;
}

/** Log a behavioral observation (mood / trigger / behavior chips + note). */
export async function logObservation(
  db: PGliteInterface,
  input: LogObservationInput,
): Promise<string> {
  const { childId, profileId } = await getContext(db);
  return insertEvent(db, {
    childId,
    loggedBy: profileId,
    eventType: EventType.BehaviorObserved,
    payload: { tags: input.tags, note: input.note, context: input.context },
    occurredAt: input.occurredAt,
  });
}
