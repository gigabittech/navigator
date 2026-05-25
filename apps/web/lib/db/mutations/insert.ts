"use client";

import type { PGliteInterface } from "@electric-sql/pglite";
import { validateEventPayload } from "@navigator/schema";
import { getClientId } from "../client.js";

export interface NewEvent {
  childId: string;
  loggedBy: string;
  eventType: string;
  payload: Record<string, unknown>;
  /** When it happened in the real world. Defaults to now. */
  occurredAt?: Date;
}

/**
 * The single write path into log_events. Validates the payload, stamps the
 * device id + a per-child monotonic sequence, and INSERTs. Never UPDATEs or
 * DELETEs — the table forbids it. Returns the new event id.
 */
export async function insertEvent(db: PGliteInterface, event: NewEvent): Promise<string> {
  const payload = validateEventPayload(event.eventType, event.payload);
  const occurredAt = (event.occurredAt ?? new Date()).toISOString();

  const res = await db.query<{ id: string }>(
    `INSERT INTO log_events
       (child_id, logged_by, event_type, payload, occurred_at, client_id, sequence_num)
     VALUES
       ($1, $2, $3, $4::jsonb, $5, $6,
        (SELECT coalesce(max(sequence_num), 0) + 1 FROM log_events WHERE child_id = $1))
     RETURNING id`,
    [
      event.childId,
      event.loggedBy,
      event.eventType,
      JSON.stringify(payload),
      occurredAt,
      getClientId(),
    ],
  );
  return res.rows[0]!.id;
}
