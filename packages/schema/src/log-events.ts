import { pgTable, uuid, text, timestamp, jsonb, bigint, index } from "drizzle-orm/pg-core";
import { children } from "./children.js";
import { profiles } from "./profiles.js";

/**
 * APPEND-ONLY event stream. The DB enforces no UPDATE / no DELETE with
 * rewrite rules (see 0001_init.sql). To correct a past event, emit a
 * `MedicationDoseCorrected` referencing the original event id.
 *
 * Projections in `./projections.ts` derive the current state from this
 * stream — the UI never reads raw events except for the timeline.
 */
export const logEvents = pgTable(
  "log_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    childId: uuid("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    loggedBy: uuid("logged_by")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull(),
    /** When the event happened in the real world. */
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    /** When the event was written to the DB. */
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
    /** Device identifier for de-duplication across syncs. */
    clientId: text("client_id"),
    /** Monotonic sequence within a child for ordering. */
    sequenceNum: bigint("sequence_num", { mode: "bigint" }),
  },
  (t) => ({
    byChildTime: index("log_events_child_occurred_idx").on(t.childId, t.occurredAt),
    byChildSeq: index("log_events_child_seq_idx").on(t.childId, t.sequenceNum),
    byType: index("log_events_type_idx").on(t.eventType),
  }),
);

export type LogEvent = typeof logEvents.$inferSelect;
export type NewLogEvent = typeof logEvents.$inferInsert;
