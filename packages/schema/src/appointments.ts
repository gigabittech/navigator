import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { children } from "./children.js";

export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().defaultRandom(),
  childId: uuid("child_id")
    .notNull()
    .references(() => children.id, { onDelete: "cascade" }),
  /** "psychiatrist" | "therapist" | "iep" | "pediatrician" — free text OK. */
  kind: text("kind").notNull(),
  with: text("with"),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
  /** Pre-visit checklist items (markdown-ish bullets). */
  prepNotes: text("prep_notes"),
  /** Parent's own notes from the appointment. */
  postNotes: text("post_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Appointment = typeof appointments.$inferSelect;
