"use client";

import { useLiveQuery } from "@electric-sql/pglite-react";
import { EVENT_COLUMNS } from "../sql.js";
import type { EventRow } from "../types.js";

/**
 * Reverse-chronological event stream for the timeline.
 *
 * Pass `childId` (from `useChild`) to scope reads to one child — this uses the
 * (child_id, occurred_at DESC) index and prevents data mixing once there is
 * more than one child. When omitted, falls back to all rows (single-child
 * local mode).
 */
export function useTimeline(limit = 200, childId?: string): EventRow[] {
  const res = useLiveQuery<EventRow>(
    childId
      ? `SELECT ${EVENT_COLUMNS} FROM log_events WHERE child_id = $1 ORDER BY occurred_at DESC LIMIT $2`
      : `SELECT ${EVENT_COLUMNS} FROM log_events ORDER BY occurred_at DESC LIMIT $1`,
    childId ? [childId, limit] : [limit],
  );
  return res?.rows ?? [];
}
