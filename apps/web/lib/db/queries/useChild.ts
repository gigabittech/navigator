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
