"use client";

/**
 * Runs the frontend↔backend data link whenever Supabase is configured and the
 * user is signed in, and feeds the sync store so the SyncDot reflects it.
 *
 * Boot:      one full round trip (pull server → device, then push device →
 *            server). A fresh device hydrates the whole care record here.
 * Steady:    a periodic push (and re-sync when the browser comes back online)
 *            so locally-logged events land on the server within a minute.
 * Electric:  when NEXT_PUBLIC_ELECTRIC_URL is also set, the streaming
 *            read-shape path (startSync) layers on top — see electric.ts.
 *
 * Mounted inside the DbProvider (needs the live PGlite handle). A no-op in
 * local-only mode — the MVP critical path is untouched (CLAUDE.md rule #1).
 */

import { useEffect } from "react";
import { usePGlite } from "@electric-sql/pglite-react";
import type { PGliteWithLive } from "@electric-sql/pglite/live";
import { isSupabaseConfigured } from "@/lib/config";
import { createBrowserClient } from "@/lib/auth/supabase";
import { isSyncConfigured, startSync, type SyncHandle } from "./electric.js";
import { syncOnce, pushToSupabase } from "./supabase-sync.js";
import { setSyncPhase } from "./store.js";

/** Steady-state push cadence. Local writes reach the server within this. */
const PUSH_INTERVAL_MS = 30_000;

export function SyncManager() {
  const db = usePGlite() as unknown as PGliteWithLive;

  useEffect(() => {
    if (!db || !isSupabaseConfigured()) return;

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    let electricHandle: SyncHandle | null = null;
    let onlineListener: (() => void) | null = null;

    // Set synchronously so the FirstRunGuard holds until the boot pull lands
    // (a fresh device must not be routed to onboarding while its data is
    // still on its way down).
    setSyncPhase("starting");

    const settle = async () => {
      try {
        const stats = await syncOnce(db);
        if (cancelled) return;
        if (stats === null) {
          // Not signed in — nothing to link (e.g. middleware races sign-out).
          setSyncPhase("disabled");
          return;
        }
        setSyncPhase("live");

        // Steady-state: keep pushing what's authored here.
        const {
          data: { session },
        } = await createBrowserClient().auth.getSession();
        const userId = session?.user.id;
        if (!userId || cancelled) return;

        const pushQuietly = () => {
          pushToSupabase(db, userId).catch((err) => {
            // Transient (offline, server hiccup): data is safe locally; the
            // next tick retries. The dot only alarms on boot-sync failure.
            // The message is infrastructural (table + Postgres error) — no PII.
            console.error("sync_push_failed", err instanceof Error ? err.message : err);
          });
        };
        timer = setInterval(pushQuietly, PUSH_INTERVAL_MS);
        onlineListener = pushQuietly;
        window.addEventListener("online", pushQuietly);

        // Optional streaming upgrade when an Electric service is configured.
        if (isSyncConfigured()) {
          const child = await db.query<{ id: string }>(
            `SELECT id FROM children ORDER BY created_at LIMIT 1`,
          );
          const childId = child.rows[0]?.id;
          if (childId && !cancelled) {
            electricHandle = await startSync(db, { childId });
          }
        }
      } catch (err) {
        // Infrastructural error string only (table name + Postgres code) — no PII.
        console.error("sync_boot_failed", err instanceof Error ? err.message : err);
        if (!cancelled) setSyncPhase("error");
      }
    };

    void settle();

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      if (onlineListener) window.removeEventListener("online", onlineListener);
      setSyncPhase("idle");
      void electricHandle?.stop();
    };
  }, [db]);

  return null;
}
