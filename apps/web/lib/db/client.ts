/**
 * Local SQLite-equivalent client — PGlite (WASM Postgres) persisted to the
 * browser's IndexedDB. This is the device-side database the whole app reads
 * and writes; there is no network on the critical path.
 *
 * Sync to Supabase Postgres (ElectricSQL read-shapes + writes-through-API)
 * layers on top of this later — see lib/sync. Nothing here changes when it does.
 */

"use client";

import { PGlite } from "@electric-sql/pglite";
import { live, type PGliteWithLive } from "@electric-sql/pglite/live";
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
  const db = await PGlite.create({
    dataDir: "idb://navigator",
    extensions: { live },
  });
  // Idempotent: every statement is IF NOT EXISTS / CREATE OR REPLACE.
  await db.exec(localSchema);

  // Resolve the auth identity (if any) so seed data is stamped with the real
  // user's Supabase ID rather than the hardcoded demo values.
  let seedUserId: string | undefined;
  let seedUserEmail: string | undefined;
  if (isSupabaseConfigured()) {
    try {
      const {
        data: { session },
      } = await createBrowserClient().auth.getSession();
      if (session?.user) {
        seedUserId = session.user.id;
        seedUserEmail = session.user.email ?? undefined;
      }
    } catch {
      // If auth lookup fails (e.g. network down at first run), fall through
      // to demo values — the seed guard prevents a second run anyway.
    }
  }

  await seedIfEmpty(db, seedUserId, seedUserEmail);
  return db;
}
