"use client";

import type { PGliteInterface } from "@electric-sql/pglite";

export interface LogContext {
  childId: string;
  profileId: string;
}

/**
 * The active child + the profile doing the logging. Local single-device mode
 * has exactly one of each; this resolves them for every write.
 */
export async function getContext(db: PGliteInterface): Promise<LogContext> {
  const res = await db.query<LogContext>(
    `SELECT c.id AS "childId", c.owner_id AS "profileId"
     FROM children c ORDER BY c.created_at LIMIT 1`,
  );
  const row = res.rows[0];
  if (!row) throw new Error("No child on this device yet.");
  return row;
}
