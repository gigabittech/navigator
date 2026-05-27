import { pgTable, uuid, text, date, timestamp, jsonb } from "drizzle-orm/pg-core";
import { profiles } from "./profiles.js";

export const children = pgTable("children", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "restrict" }),
  preferredName: text("preferred_name").notNull(),
  /** Optional — never required at signup. Used for age-relative dosing. */
  dateOfBirth: date("date_of_birth"),
  /** Free-form diagnoses the parent has typed in (we do not auto-classify). */
  diagnosesNotes: text("diagnoses_notes"),
  /** Pinned context the AI report should always include. */
  pinnedContext: jsonb("pinned_context"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const childCollaborators = pgTable("child_collaborators", {
  id: uuid("id").primaryKey().defaultRandom(),
  childId: uuid("child_id")
    .notNull()
    .references(() => children.id, { onDelete: "cascade" }),
  collaboratorId: uuid("collaborator_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  /** "co_parent" | "clinician_view". */
  role: text("role").notNull().default("co_parent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Child = typeof children.$inferSelect;
export type ChildCollaborator = typeof childCollaborators.$inferSelect;
