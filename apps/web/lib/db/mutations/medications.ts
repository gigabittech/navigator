"use client";

import type { PGliteInterface } from "@electric-sql/pglite";
import { getContext } from "./context.js";

export interface AddMedicationInput {
  name: string;
  doseMg: number;
  category?: string;
  scheduledTimes: string[];
}

/** Add a medication (a mutable setup record — edited in place, not appended). */
export async function addMedication(
  db: PGliteInterface,
  input: AddMedicationInput,
): Promise<string> {
  const { childId } = await getContext(db);
  const res = await db.query<{ id: string }>(
    `INSERT INTO medications (child_id, name, dose_mg, category, scheduled_times, started_on)
     VALUES ($1, $2, $3, $4, $5::jsonb, now())
     RETURNING id`,
    [
      childId,
      input.name,
      input.doseMg,
      input.category ?? null,
      JSON.stringify(input.scheduledTimes),
    ],
  );
  return res.rows[0]!.id;
}

/** Mark a medication stopped — it leaves the active schedule but history stays. */
export async function stopMedication(db: PGliteInterface, id: string): Promise<void> {
  await db.query(
    `UPDATE medications SET active = false, stopped_on = now() WHERE id = $1`,
    [id],
  );
}

/** Wipe and re-seed the on-device database (demo reset). */
export async function resetLocalData(db: PGliteInterface): Promise<void> {
  await db.exec(
    `TRUNCATE log_events, reports, appointments, medications, child_collaborators, children, profiles CASCADE;`,
  );
}
