"use client";

import { useLiveQuery } from "@electric-sql/pglite-react";
import { EVENT_COLUMNS } from "../sql.js";
import type { EventRow } from "../types.js";

/** Reverse-chronological event stream for the timeline. */
export function useTimeline(limit = 200): EventRow[] {
  const res = useLiveQuery<EventRow>(
    `SELECT ${EVENT_COLUMNS} FROM log_events ORDER BY occurred_at DESC LIMIT $1`,
    [limit],
  );
  return res?.rows ?? [];
}
