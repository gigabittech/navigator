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

/** Postgres unique_violation. Raised when two writers claim the same
 * (child_id, sequence_num) — see the UNIQUE constraint in 0001_local.sql /
 * server migration 0005. */
const UNIQUE_VIOLATION = "23505";

/** How many times to recompute sequence_num and retry on a collision. */
const MAX_SEQ_RETRIES = 5;

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === UNIQUE_VIOLATION
  );
}

/**
 * The single write path into log_events. Validates the payload, stamps the
 * device id + a per-child monotonic sequence, and INSERTs. Never UPDATEs or
 * DELETEs — the table forbids it. Returns the new event id.
 *
 * sequence_num is assigned with a `max()+1` subquery, which is not atomic
 * against a concurrent insert for the same child. The UNIQUE(child_id,
 * sequence_num) constraint turns a collision into a loud unique-violation
 * rather than a silent duplicate; we catch that and retry, so the counter
 * recomputes against the now-committed row.
 */
export async function insertEvent(db: PGliteInterface, event: NewEvent): Promise<string> {
  const payload = validateEventPayload(event.eventType, event.payload);
  const occurredAt = (event.occurredAt ?? new Date()).toISOString();
  const params = [
    event.childId,
    event.loggedBy,
    event.eventType,
    JSON.stringify(payload),
    occurredAt,
    getClientId(),
  ];

  for (let attempt = 0; ; attempt++) {
    try {
      const res = await db.query<{ id: string }>(
        `INSERT INTO log_events
           (child_id, logged_by, event_type, payload, occurred_at, client_id, sequence_num)
         VALUES
           ($1, $2, $3, $4::jsonb, $5, $6,
            (SELECT coalesce(max(sequence_num), 0) + 1 FROM log_events WHERE child_id = $1))
         RETURNING id`,
        params,
      );
      return res.rows[0]!.id;
    } catch (err) {
      if (isUniqueViolation(err) && attempt < MAX_SEQ_RETRIES) continue;
      throw err;
    }
  }
}
