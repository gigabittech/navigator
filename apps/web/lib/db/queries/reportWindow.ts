"use client";

import type { PGliteInterface } from "@electric-sql/pglite";
import { APPOINTMENT_COLUMNS, CHILD_COLUMNS, EVENT_COLUMNS, MEDICATION_COLUMNS } from "../sql.js";
import type { AppointmentRow, ChildRow, EventRow, MedicationRow } from "../types.js";

export interface ReportWindow {
  child: ChildRow;
  medications: MedicationRow[];
  events: EventRow[];
}

/**
 * One-shot read of everything the report generator needs for a date window.
 * Not a live hook — the report is generated on demand from a frozen snapshot.
 */
export async function loadReportWindow(
  db: PGliteInterface,
  childId: string,
  start: Date,
  end: Date,
): Promise<ReportWindow> {
  const childRes = await db.query<ChildRow>(
    `SELECT ${CHILD_COLUMNS} FROM children WHERE id = $1`,
    [childId],
  );
  const child = childRes.rows[0];
  if (!child) throw new Error("No child on this device.");

  const meds = await db.query<MedicationRow>(
    `SELECT ${MEDICATION_COLUMNS} FROM medications WHERE child_id = $1 ORDER BY name`,
    [childId],
  );

  const events = await db.query<EventRow>(
    `SELECT ${EVENT_COLUMNS} FROM log_events
     WHERE child_id = $1 AND occurred_at >= $2 AND occurred_at <= $3
     ORDER BY occurred_at ASC`,
    [childId, start.toISOString(), end.toISOString()],
  );

  return { child, medications: meds.rows, events: events.rows };
}

/** Recent appointments for prep context (most recent first). */
export async function loadRecentAppointments(
  db: PGliteInterface,
  childId: string,
): Promise<AppointmentRow[]> {
  const res = await db.query<AppointmentRow>(
    `SELECT ${APPOINTMENT_COLUMNS} FROM appointments WHERE child_id = $1 ORDER BY scheduled_for DESC LIMIT 10`,
    [childId],
  );
  return res.rows;
}
