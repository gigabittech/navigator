"use client";

import { useLiveQuery } from "@electric-sql/pglite-react";
import { APPOINTMENT_COLUMNS } from "../sql.js";
import type { AppointmentRow } from "../types.js";

/**
 * The soonest upcoming appointment, for the prep view.
 *
 * Pass `childId` (from `useChild`) to scope reads to one child — this uses the
 * (child_id, scheduled_for) index and prevents data mixing once there is more
 * than one child. When omitted, falls back to all rows (single-child local
 * mode).
 */
export function useNextAppointment(childId?: string): AppointmentRow | undefined {
  const res = useLiveQuery<AppointmentRow>(
    childId
      ? `SELECT ${APPOINTMENT_COLUMNS} FROM appointments
         WHERE child_id = $1 AND scheduled_for >= now()
         ORDER BY scheduled_for ASC LIMIT 1`
      : `SELECT ${APPOINTMENT_COLUMNS} FROM appointments
     WHERE scheduled_for >= now() ORDER BY scheduled_for ASC LIMIT 1`,
    childId ? [childId] : [],
  );
  return res?.rows[0];
}
