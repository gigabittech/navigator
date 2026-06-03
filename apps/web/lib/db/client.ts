/**
 * Local SQLite-equivalent client — PGlite (WASM Postgres) persisted to the
 * browser's IndexedDB. This is the device-side database the whole app reads
 * and writes; there is no network on the critical path.
 *
 * Sync to Supabase Postgres (ElectricSQL read-shapes + writes-through-API)
 * layers on top of this later — see lib/sync. Nothing here changes when it does.
 */

"use client";

import type { PGliteWithLive } from "@electric-sql/pglite/live";
// Raw schema string — see next.config.mjs (asset/source) + types/sql.d.ts.
import localSchema from "../../../../db/client-migrations/0001_local.sql";
import { seedIfEmpty } from "./seed.js";
import { isSupabaseConfigured } from "../config.js";
import { createBrowserClient } from "../auth/supabase.js";

/** A stable per-device id stamped onto every write for later de-duplication. */
const CLIENT_ID_KEY = "navigator.client_id";

export function getClientId(): string {
  if (typeof window === "undefined") return "server";
  let id = window.localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

let dbPromise: Promise<PGliteWithLive> | null = null;

export function getDb(): Promise<PGliteWithLive> {
  if (typeof window === "undefined") {
    throw new Error("getDb() must be called in the browser");
  }
  if (!dbPromise) {
    dbPromise = initDb();
  }
  return dbPromise;
}

async function initDb(): Promise<PGliteWithLive> {
  // Dynamic import keeps PGlite's WASM glue (~390 KB of JS) out of the route's
  // First Load JS. It only loads once the DB actually boots, after hydration —
  // there's no network on the critical path, and nothing renders against the
  // DB until getDb() resolves anyway. The WASM binary itself is already an
  // async asset (next.config sets asyncWebAssembly).
  const [{ PGlite }, { live }] = await Promise.all([
    import("@electric-sql/pglite"),
    import("@electric-sql/pglite/live"),
  ]);

  const db = await PGlite.create({
    dataDir: "idb://navigator",
    extensions: { live },
  });
  // Idempotent: every statement is IF NOT EXISTS / CREATE OR REPLACE.
  await db.exec(localSchema);

  // Decide whether to load the demo dataset (one child "Wren", a co-parent, a
  // week of events). This is for LOCAL / DEMO mode only — it makes the product
  // explorable with no setup. A REAL signed-in user must NOT get a fabricated
  // child: they start empty so the FirstRunGuard routes them to onboarding.
  //
  // Boundary: a demo run is one with no authenticated Supabase session.
  let signedInUser: { id: string; email?: string } | undefined;
  if (isSupabaseConfigured()) {
    try {
      const {
        data: { session },
      } = await createBrowserClient().auth.getSession();
      if (session?.user) {
        signedInUser = { id: session.user.id, email: session.user.email ?? undefined };
      }
    } catch {
      // Auth lookup failed (e.g. offline at first run). Treat as not-signed-in;
      // the seed guard still prevents a duplicate run if a session appears later.
    }
  }

  // Real user → no demo seed (empty DB → onboarding). Otherwise seed the demo.
  if (!signedInUser) {
    await seedIfEmpty(db);
  }
  return db;
}
