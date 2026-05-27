"use client";

import { useMemo } from "react";
import { useLiveQuery } from "@electric-sql/pglite-react";
import { EVENT_COLUMNS } from "../sql.js";
import type { EventRow } from "../types.js";

export interface WearOffPattern {
  detected: boolean;
  dayCount: number;
  description: string;
}

const WEAR_OFF_TAGS = ["irritable", "wear-off", "meltdown", "anxious"];
const WEAR_OFF_HOURS_START = 14; // 2 pm
const WEAR_OFF_HOURS_END = 17;   // 5 pm
const MIN_DAYS = 3;
const LOOK_BACK_DAYS = 7;

/**
 * Returns a pattern summary if 3+ distinct calendar days in the last 7 days
 * had a BehaviorObserved event with irritability/wear-off tags occurring
 * between 14:00 and 17:00.
 */
export function useWearOffPattern(): WearOffPattern {
  const since = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - LOOK_BACK_DAYS);
    return d.toISOString();
  }, []);

  const res = useLiveQuery<EventRow>(
    `SELECT ${EVENT_COLUMNS} FROM log_events
     WHERE event_type = 'BehaviorObserved'
       AND occurred_at >= $1
     ORDER BY occurred_at DESC`,
    [since],
  );

  return useMemo((): WearOffPattern => {
    const events = res?.rows ?? [];
    const matchingDays = new Set<string>();

    for (const ev of events) {
      const d = new Date(ev.occurredAt);
      const hour = d.getHours();
      if (hour < WEAR_OFF_HOURS_START || hour >= WEAR_OFF_HOURS_END) continue;

      const tags = Array.isArray(ev.payload["tags"])
        ? (ev.payload["tags"] as string[])
        : [];
      const hasWearOffTag = tags.some((t) => WEAR_OFF_TAGS.includes(t));
      if (!hasWearOffTag) continue;

      // Use local date string as the day key
      const dayKey = d.toLocaleDateString("en-CA"); // YYYY-MM-DD
      matchingDays.add(dayKey);
    }

    const dayCount = matchingDays.size;

    if (dayCount < MIN_DAYS) {
      return { detected: false, dayCount, description: "" };
    }

    return {
      detected: true,
      dayCount,
      description: `Irritability returning ~3 h after morning dose for ${dayCount} days. Worth raising at the next visit.`,
    };
  }, [res]);
}
