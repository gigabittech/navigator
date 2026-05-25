"use client";

import { useLiveQuery } from "@electric-sql/pglite-react";
import { APPOINTMENT_COLUMNS } from "../sql.js";
import type { AppointmentRow } from "../types.js";

/** The soonest upcoming appointment, for the prep view. */
export function useNextAppointment(): AppointmentRow | undefined {
  const res = useLiveQuery<AppointmentRow>(
    `SELECT ${APPOINTMENT_COLUMNS} FROM appointments
     WHERE scheduled_for >= now() ORDER BY scheduled_for ASC LIMIT 1`,
    [],
  );
  return res?.rows[0];
}
