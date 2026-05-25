import { pgTable, uuid, text, timestamp, jsonb, date } from "drizzle-orm/pg-core";
import { children } from "./children.js";
import { profiles } from "./profiles.js";

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  childId: uuid("child_id")
    .notNull()
    .references(() => children.id, { onDelete: "cascade" }),
  generatedBy: uuid("generated_by")
    .notNull()
    .references(() => profiles.id, { onDelete: "restrict" }),
  /** Window covered by the report. */
  rangeStart: date("range_start").notNull(),
  rangeEnd: date("range_end").notNull(),
  /** Structured report — see packages/report for the shape. */
  body: jsonb("body").notNull(),
  /** Optional Claude-generated narrative summary. */
  narrative: text("narrative"),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Report = typeof reports.$inferSelect;
