/**
 * Row shapes as PGlite returns them (column aliases applied in the query SQL
 * so results arrive camelCased). These are intentionally local to the app —
 * the canonical column definitions live in @navigator/schema; these mirror
 * what comes back over the wire from the on-device Postgres.
 */

export interface EventRow {
  id: string;
  childId: string;
  loggedBy: string;
  eventType: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
  recordedAt: Date;
  clientId: string | null;
  sequenceNum: number | null;
}

export interface MedicationRow {
  id: string;
  childId: string;
  name: string;
  /** Postgres NUMERIC comes back as a string — format at the edge. */
  doseMg: string;
  category: string | null;
  scheduledTimes: string[];
  active: boolean;
  startedOn: Date | null;
  stoppedOn: Date | null;
  notes: string | null;
}

export interface ChildRow {
  id: string;
  ownerId: string;
  preferredName: string;
  dateOfBirth: string | null;
  diagnosesNotes: string | null;
  pinnedContext: Record<string, unknown> | null;
}

export interface AppointmentRow {
  id: string;
  childId: string;
  kind: string;
  with: string | null;
  scheduledFor: Date;
  prepNotes: string | null;
  postNotes: string | null;
}

/** A medication slot for "today", with its resolved status overlaid. */
export interface DoseSlot {
  medicationId: string;
  medicationName: string;
  doseMg: string;
  /** ISO timestamp of the scheduled wall-clock slot today. */
  scheduledFor: string;
  /** The "HH:MM" the slot is scheduled for. */
  scheduledTime: string;
  status: "scheduled" | "taken" | "missed" | "refused" | "late" | "vomited";
  minutesOffset?: number;
  /** The log_event id that determined a non-scheduled status (for "undo"). */
  sourceEventId?: string;
  corrected: boolean;
}
