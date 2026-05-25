import { pgTable, uuid, text, numeric, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { children } from "./children.js";

export const medications = pgTable("medications", {
  id: uuid("id").primaryKey().defaultRandom(),
  childId: uuid("child_id")
    .notNull()
    .references(() => children.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  doseMg: numeric("dose_mg", { precision: 6, scale: 2 }).notNull(),
  /** "stimulant" | "ssri" | "antipsychotic" | "other" — free-form OK. */
  category: text("category"),
  /** Cron-like schedule, e.g. ["07:00", "12:00"]. */
  scheduledTimes: jsonb("scheduled_times").$type<string[]>().notNull().default([]),
  active: boolean("active").notNull().default(true),
  startedOn: timestamp("started_on", { withTimezone: true }),
  stoppedOn: timestamp("stopped_on", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Medication = typeof medications.$inferSelect;
