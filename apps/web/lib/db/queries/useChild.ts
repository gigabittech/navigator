"use client";

import { useLiveQuery } from "@electric-sql/pglite-react";
import { CHILD_COLUMNS } from "../sql.js";
import type { ChildRow } from "../types.js";

/** The active child. Local single-device mode has exactly one. */
export function useChild(): ChildRow | undefined {
  const res = useLiveQuery<ChildRow>(
    `SELECT ${CHILD_COLUMNS} FROM children ORDER BY created_at LIMIT 1`,
    [],
  );
  return res?.rows[0];
}

/**
 * The active child plus whether the query has resolved yet. `loaded` is false
 * only while the first query is in flight; once true, a `child` of `undefined`
 * means there genuinely is no child (e.g. a signed-in user who skipped setup) —
 * not "still loading". Callers that must distinguish those states (the first-run
 * guard) use this; everything else uses useChild().
 */
export function useChildState(): { child: ChildRow | undefined; loaded: boolean } {
  const res = useLiveQuery<ChildRow>(
    `SELECT ${CHILD_COLUMNS} FROM children ORDER BY created_at LIMIT 1`,
    [],
  );
  return { child: res?.rows[0], loaded: res !== undefined };
}
