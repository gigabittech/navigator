"use client";

import { useMemo } from "react";
import { useLiveQuery } from "@electric-sql/pglite-react";
import { projectDoseStatus, type LogEvent } from "@navigator/schema";
import { EVENT_COLUMNS, MEDICATION_COLUMNS } from "../sql.js";
import type { DoseSlot, EventRow, MedicationRow } from "../types.js";
import { slotIso, startOfDay } from "../../time.js";

interface TodayDoses {
  slots: DoseSlot[];
  loading: boolean;
}

/**
 * Today's medication slots with their resolved status. Slots are derived from
 * each active medication's `scheduled_times`; status is overlaid by projecting
 * today's log_events. Un-logged slots show as "scheduled" (tap to log).
 */
export function useTodayDoses(): TodayDoses {
  const meds = useLiveQuery<MedicationRow>(
    `SELECT ${MEDICATION_COLUMNS} FROM medications WHERE active = true ORDER BY name`,
    [],
  );

  // Stable for the component's lifetime so the live subscription isn't churned.
  const startIso = useMemo(() => startOfDay().toISOString(), []);
  const events = useLiveQuery<EventRow>(
    `SELECT ${EVENT_COLUMNS} FROM log_events WHERE occurred_at >= $1 ORDER BY occurred_at ASC`,
    [startIso],
  );

  const slots = useMemo<DoseSlot[]>(() => {
    if (!meds || !events) return [];

    const snapshots = projectDoseStatus(events.rows as unknown as LogEvent[]);
    const byKey = new Map(snapshots.map((s) => [`${s.medicationId}|${s.scheduledFor}`, s]));
    const today = new Date();

    const result: DoseSlot[] = [];
    for (const med of meds.rows) {
      for (const time of med.scheduledTimes) {
        const scheduledFor = slotIso(today, time);
        const snap = byKey.get(`${med.id}|${scheduledFor}`);
        result.push({
          medicationId: med.id,
          medicationName: med.name,
          doseMg: med.doseMg,
          scheduledFor,
          scheduledTime: time,
          status: snap?.status ?? "scheduled",
          minutesOffset: snap?.minutesOffset,
          sourceEventId: snap?.sourceEventId,
          corrected: snap?.corrected ?? false,
        });
      }
    }
    result.sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
    return result;
  }, [meds, events]);

  return { slots, loading: !meds || !events };
}
