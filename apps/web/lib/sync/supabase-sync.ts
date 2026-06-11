"use client";

/**
 * Two-way Supabase sync — the frontend↔backend data link.
 *
 * Local-first (CLAUDE.md rule #1): the UI only ever reads and writes the
 * on-device PGlite. This module moves data between that device database and
 * Supabase Postgres in the background, under the SIGNED-IN USER'S JWT, so
 * server RLS scopes every row (owner or collaborator via has_child_access).
 *
 *   PULL  (server → device): hydrates the local DB with every row the user is
 *         allowed to see. Insert-only for append-only tables; server-wins
 *         upsert for mutable tables. Makes a fresh device pick up the full
 *         care record after sign-in.
 *
 *   PUSH  (device → server): upserts locally-authored rows up. RLS enforces
 *         owner_id / logged_by = auth.uid(), so only rows whose ids align with
 *         the authenticated user are pushed (see onboarding — the local
 *         profile id IS the Supabase user id when signed in).
 *
 * This is deliberately independent of ElectricSQL: Electric remains the
 * streaming-read upgrade path (lib/sync/electric.ts), while this module gives
 * a working back-and-forth on plain Supabase today.
 *
 * Conflict semantics (v1, documented in the proposal):
 *   - log_events is append-only on both sides: push/pull never UPDATE, only
 *     insert-if-absent (the id travels with the row).
 *   - children / medications / appointments: pull is server-wins, push is
 *     last-writer-up. Fine for a single caregiver + occasional co-parent; the
 *     Electric upgrade brings real conflict resolution.
 *   - child_collaborators: pull-only. Granting access requires the server-side
 *     invite flow (a local insert can't create another user's profile under
 *     RLS — by design).
 */

import type { PGliteWithLive } from "@electric-sql/pglite/live";
import { createBrowserClient } from "../auth/supabase.js";
import { isSupabaseConfigured } from "../config.js";

export interface SyncStats {
  pulled: number;
  pushed: number;
}

/** Rows per upsert request — keeps payloads comfortably under limits. */
const CHUNK = 400;

function chunk<T>(rows: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += CHUNK) out.push(rows.slice(i, i + CHUNK));
  return out;
}

type Row = Record<string, unknown>;

/** JSON-typed columns that need an explicit ::jsonb cast on local insert. */
const JSONB_COLUMNS = new Set(["payload", "scheduled_times", "pinned_context", "body"]);

/**
 * Insert server rows into a local table. `mode` controls conflict handling:
 *  - "ignore": INSERT ... ON CONFLICT DO NOTHING (no target — tolerates ANY
 *    unique collision; required for log_events where both the id PK and the
 *    (child_id, sequence_num) constraint may fire).
 *  - "server-wins": ON CONFLICT (id) DO UPDATE — pull refreshes mutable rows.
 */
async function insertLocal(
  db: PGliteWithLive,
  table: string,
  columns: string[],
  rows: Row[],
  mode: "ignore" | "server-wins",
): Promise<number> {
  let written = 0;
  for (const row of rows) {
    const cols = columns.filter((c) => row[c] !== undefined);
    const names = cols.map((c) => `"${c}"`).join(", ");
    const params = cols.map((c, i) => (JSONB_COLUMNS.has(c) ? `$${i + 1}::jsonb` : `$${i + 1}`));
    const values = cols.map((c) => {
      const v = row[c];
      if (v === null) return null;
      return JSONB_COLUMNS.has(c) ? JSON.stringify(v) : v;
    });

    const conflict =
      mode === "ignore"
        ? "ON CONFLICT DO NOTHING"
        : `ON CONFLICT (id) DO UPDATE SET ${cols
            .filter((c) => c !== "id")
            .map((c) => `"${c}" = EXCLUDED."${c}"`)
            .join(", ")}`;

    try {
      const res = await db.query(
        `INSERT INTO ${table} (${names}) VALUES (${params.join(", ")}) ${conflict}`,
        values,
      );
      written += res.affectedRows ?? 0;
    } catch {
      // Per-row tolerance: a row that can't land locally (e.g. a collaborator
      // link whose profile isn't visible under RLS, or a sequence collision)
      // must not abort the whole hydrate. Skipped rows retry on the next sync.
    }
  }
  return written;
}

/**
 * PULL: hydrate the local DB from Supabase under the user's RLS. FK order:
 * profiles → children → collaborators → medications → appointments → events.
 */
export async function pullFromSupabase(db: PGliteWithLive): Promise<number> {
  const supabase = createBrowserClient();
  let pulled = 0;

  const tables: Array<{
    name: string;
    columns: string[];
    mode: "ignore" | "server-wins";
  }> = [
    { name: "profiles", columns: ["id", "email", "full_name", "role", "created_at", "updated_at"], mode: "ignore" },
    { name: "children", columns: ["id", "owner_id", "preferred_name", "date_of_birth", "diagnoses_notes", "pinned_context", "created_at", "updated_at"], mode: "server-wins" },
    { name: "child_collaborators", columns: ["id", "child_id", "collaborator_id", "role", "created_at"], mode: "ignore" },
    { name: "medications", columns: ["id", "child_id", "name", "dose_mg", "category", "scheduled_times", "active", "started_on", "stopped_on", "notes", "created_at", "updated_at"], mode: "server-wins" },
    { name: "appointments", columns: ["id", "child_id", "kind", "with", "scheduled_for", "prep_notes", "post_notes", "created_at", "updated_at"], mode: "server-wins" },
    { name: "log_events", columns: ["id", "child_id", "logged_by", "event_type", "payload", "occurred_at", "recorded_at", "client_id", "sequence_num"], mode: "ignore" },
  ];

  for (const t of tables) {
    const { data, error } = await supabase.from(t.name).select("*");
    if (error) throw new Error(`pull ${t.name}: ${error.message}`);
    if (data && data.length > 0) {
      pulled += await insertLocal(db, t.name, t.columns, data as Row[], t.mode);
    }
  }
  return pulled;
}

/**
 * PUSH: send locally-authored rows up under the user's RLS. Only rows whose
 * ownership matches auth.uid() can land (RLS enforces it; we pre-filter to
 * avoid noisy rejections from e.g. local-mode demo data).
 */
export async function pushToSupabase(db: PGliteWithLive, userId: string): Promise<number> {
  const supabase = createBrowserClient();
  let pushed = 0;

  const push = async (
    table: string,
    rows: Row[],
    opts: { onConflict: string; ignoreDuplicates: boolean },
  ) => {
    for (const part of chunk(rows)) {
      const { error } = await supabase.from(table).upsert(part, opts);
      if (error) throw new Error(`push ${table}: ${error.message}`);
      pushed += part.length;
    }
  };

  // 1. Own profile (insert-if-absent — the handle_new_user trigger usually
  //    created it already; RLS only permits id = auth.uid()).
  const profiles = await db.query<Row>(
    `SELECT id, email, full_name, role FROM profiles WHERE id = $1`,
    [userId],
  );
  await push("profiles", profiles.rows, { onConflict: "id", ignoreDuplicates: true });

  // 2. Children I own.
  const children = await db.query<Row>(
    `SELECT id, owner_id, preferred_name, date_of_birth, diagnoses_notes, pinned_context, created_at, updated_at
     FROM children WHERE owner_id = $1`,
    [userId],
  );
  await push("children", children.rows, { onConflict: "id", ignoreDuplicates: false });
  const childIds = children.rows.map((c) => c.id as string);
  if (childIds.length === 0) return pushed;

  const inChildren = `child_id IN (${childIds.map((_, i) => `$${i + 1}`).join(", ")})`;

  // 3. Medications + appointments for those children.
  const meds = await db.query<Row>(
    `SELECT id, child_id, name, dose_mg, category, scheduled_times, active, started_on, stopped_on, notes, created_at, updated_at
     FROM medications WHERE ${inChildren}`,
    childIds,
  );
  await push("medications", meds.rows, { onConflict: "id", ignoreDuplicates: false });

  const appts = await db.query<Row>(
    `SELECT id, child_id, kind, "with", scheduled_for, prep_notes, post_notes, created_at, updated_at
     FROM appointments WHERE ${inChildren}`,
    childIds,
  );
  await push("appointments", appts.rows, { onConflict: "id", ignoreDuplicates: false });

  // 4. Events I logged (append-only: insert-if-absent, never update).
  const events = await db.query<Row>(
    `SELECT id, child_id, logged_by, event_type, payload, occurred_at, recorded_at, client_id, sequence_num
     FROM log_events WHERE logged_by = $1`,
    [userId],
  );
  await push("log_events", events.rows, { onConflict: "id", ignoreDuplicates: true });

  return pushed;
}

/**
 * One full round trip: pull (server-wins hydrate) then push (send up anything
 * authored here). Returns counts; throws on hard failure so the caller can
 * surface the error phase. No-op when Supabase isn't configured or no session.
 */
export async function syncOnce(db: PGliteWithLive): Promise<SyncStats | null> {
  if (!isSupabaseConfigured()) return null;
  const {
    data: { session },
  } = await createBrowserClient().auth.getSession();
  if (!session) return null;

  const pulled = await pullFromSupabase(db);
  const pushed = await pushToSupabase(db, session.user.id);
  return { pulled, pushed };
}
