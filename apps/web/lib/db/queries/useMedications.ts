"use client";

import { useLiveQuery } from "@electric-sql/pglite-react";
import { MEDICATION_COLUMNS } from "../sql.js";
import type { MedicationRow } from "../types.js";

/** Active medications, alphabetical. Reactive — re-renders on any change. */
export function useMedications(): MedicationRow[] {
  const res = useLiveQuery<MedicationRow>(
    `SELECT ${MEDICATION_COLUMNS} FROM medications WHERE active = true ORDER BY name`,
    [],
  );
  return res?.rows ?? [];
}
