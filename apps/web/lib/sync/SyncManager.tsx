"use client";

/**
 * Starts cross-device sync for the active child when Electric is configured and
 * the user is signed in, and feeds the sync store so the SyncDot reflects it.
 *
 * Mounted inside the DbProvider (it needs the live PGlite handle). A no-op when
 * sync is unconfigured (local-only mode) — so the MVP path is untouched.
 */

import { useEffect } from "react";
import { usePGlite } from "@electric-sql/pglite-react";
import type { PGliteWithLive } from "@electric-sql/pglite/live";
import { useChild } from "@/lib/db/queries/useChild";
import { isSyncConfigured, startSync, type SyncHandle } from "./electric.js";
import { setSyncPhase } from "./store.js";

export function SyncManager() {
  const db = usePGlite() as unknown as PGliteWithLive;
  const child = useChild();
  const childId = child?.id;

  useEffect(() => {
    if (!isSyncConfigured() || !childId || !db) return;

    let handle: SyncHandle | null = null;
    let cancelled = false;

    setSyncPhase("starting");
    startSync(db, { childId }, (status) => setSyncPhase(status.phase))
      .then((h) => {
        if (cancelled) {
          void h.stop();
          return;
        }
        handle = h;
      })
      .catch(() => setSyncPhase("error"));

    return () => {
      cancelled = true;
      setSyncPhase("idle");
      void handle?.stop();
    };
  }, [db, childId]);

  return null;
}
