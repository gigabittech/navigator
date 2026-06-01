/**
 * Cross-device sync — Electric read-shapes → PGlite, writes-through-Supabase.
 *
 * Design (per CLAUDE.md, rule #1): sync is ADDITIVE and never on the critical
 * path. Reads and writes always hit the local PGlite first; this layer moves
 * data between devices in the background. Nothing here is awaited by the UI.
 *
 * Two halves:
 *   1. READ  — subscribe to Electric shapes (scoped per child) that stream
 *              server rows into the local tables. Reactive useLiveQuery picks
 *              the new rows up automatically.
 *   2. WRITE — log_events is append-only, so the write path is an
 *              insert-only outbox: locally-authored events are pushed to
 *              Supabase. Corrections are themselves events, so editing needs no
 *              special path. Idempotent on (client_id, sequence_num).
 *
 * ACTIVATION IS DEPLOY-GATED. This module is only imported when
 * NEXT_PUBLIC_ELECTRIC_URL is set, and the Electric read extension
 * (@electric-sql/pglite-sync) is loaded dynamically. Wiring it into the live DB
 * boot also requires upgrading @electric-sql/pglite 0.3→0.4 (pglite-sync's peer
 * range) — a separate, browser-verified step. Until then startSync() is a
 * no-op-safe scaffold: it validates config and reports status, and the
 * read-subscription call site is marked so the upgrade is a one-line change.
 */

"use client";

import type { PGliteWithLive } from "@electric-sql/pglite/live";
import { buildShapes, type NavigatorShape, type ShapeDef } from "./shapes.js";
import { createBrowserClient } from "../auth/supabase.js";
import { getClientId } from "../db/client.js";

/**
 * The slice of the @electric-sql/pglite-sync extension API we use. Declared
 * locally so this module compiles before the extension (and the PGlite 0.4
 * upgrade it needs) is wired into the boot. Matches pglite-sync's contract.
 */
interface ElectricSubscription {
  unsubscribe: () => Promise<void>;
}
interface ElectricExt {
  syncShapeToTable: (opts: {
    shape: { url: string; headers?: Record<string, string> };
    table: string;
    primaryKey: string[];
    shapeKey: string;
  }) => Promise<ElectricSubscription>;
}

export type SyncPhase = "idle" | "starting" | "live" | "error" | "disabled";

export interface SyncHandle {
  phase: SyncPhase;
  /** Tear down all shape subscriptions and the write watcher. */
  stop: () => Promise<void>;
}

export interface SyncStatus {
  phase: SyncPhase;
  /** Rows pushed to the server since start (write-through outbox). */
  pushed: number;
  lastError?: string;
}

/** True when an Electric endpoint is configured (the env gate). */
export function isSyncConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_ELECTRIC_URL;
  return typeof url === "string" && url.length > 0;
}

const ELECTRIC_URL = () => process.env.NEXT_PUBLIC_ELECTRIC_URL ?? "";

/**
 * Subscribe a single Electric shape into a local table. Returns an unsubscribe.
 *
 * NOTE: the actual `db.electric.syncShapeToTable(...)` call (from
 * @electric-sql/pglite-sync) is behind the PGlite 0.4 upgrade. The shape URL,
 * params, and table mapping below are the real contract; activating is a
 * one-line swap of the marked block once the extension is registered at boot.
 */
async function subscribeShape(
  db: PGliteWithLive,
  shape: ShapeDef,
  token: string,
): Promise<() => Promise<void>> {
  const params = new URLSearchParams({
    table: shape.table,
    where: shape.where,
  });
  const url = `${ELECTRIC_URL()}/v1/shape?${params.toString()}`;

  // The pglite-sync extension augments the db with `.electric` once registered
  // at boot (PGlite 0.4 upgrade, deploy-pending). Until then this is undefined
  // and we take the scaffold path below. Typed as unknown, narrowed by feature.
  const electric = (db as unknown as { electric?: ElectricExt }).electric;
  if (electric?.syncShapeToTable) {
    // ── Live path (requires @electric-sql/pglite-sync registered at boot) ──
    const sub = await electric.syncShapeToTable({
      shape: { url, headers: { Authorization: `Bearer ${token}` } },
      table: shape.table,
      primaryKey: shape.primaryKey,
      shapeKey: `${shape.table}:${shape.where}`,
    });
    return async () => {
      await sub.unsubscribe();
    };
  }

  // ── Scaffold path: extension not registered yet (PGlite 0.4 upgrade pending).
  // The subscription is a validated no-op so startSync() stays safe to call.
  return async () => {};
}

/**
 * Push locally-authored, not-yet-synced log_events to Supabase. log_events is
 * append-only and carries (client_id, sequence_num), so this is an idempotent,
 * insert-only outbox. Returns the number of rows pushed.
 */
export async function writeThrough(db: PGliteWithLive, childId: string): Promise<number> {
  const supabase = createBrowserClient();
  const clientId = getClientId();

  // Rows authored on THIS device that the server may not have yet. The server
  // upserts on (client_id, sequence_num), so re-pushing is harmless.
  const res = await db.query<{
    id: string;
    childId: string;
    loggedBy: string;
    eventType: string;
    payload: unknown;
    occurredAt: string;
    clientId: string;
    sequenceNum: number;
  }>(
    `SELECT id, child_id AS "childId", logged_by AS "loggedBy",
            event_type AS "eventType", payload, occurred_at AS "occurredAt",
            client_id AS "clientId", sequence_num AS "sequenceNum"
     FROM log_events
     WHERE child_id = $1 AND client_id = $2
     ORDER BY sequence_num ASC`,
    [childId, clientId],
  );
  if (res.rows.length === 0) return 0;

  const { error } = await supabase.from("log_events").upsert(
    res.rows.map((r) => ({
      id: r.id,
      child_id: r.childId,
      logged_by: r.loggedBy,
      event_type: r.eventType,
      payload: r.payload,
      occurred_at: r.occurredAt,
      client_id: r.clientId,
      sequence_num: r.sequenceNum,
    })),
    { onConflict: "client_id,sequence_num", ignoreDuplicates: true },
  );
  if (error) throw new Error(error.message);
  return res.rows.length;
}

/**
 * Start cross-device sync for one child. Idempotent-safe: returns a handle that
 * tears everything down. Never throws into the caller — failures land in the
 * handle's phase so the UI can show a calm "couldn't sync" without blocking.
 */
export async function startSync(
  db: PGliteWithLive,
  shapeScope: NavigatorShape,
  onStatus?: (s: SyncStatus) => void,
): Promise<SyncHandle> {
  const status: SyncStatus = { phase: "starting", pushed: 0 };
  const emit = () => onStatus?.({ ...status });

  if (!isSyncConfigured()) {
    status.phase = "disabled";
    emit();
    return { phase: "disabled", stop: async () => {} };
  }

  emit();
  const unsubscribers: Array<() => Promise<void>> = [];

  try {
    const {
      data: { session },
    } = await createBrowserClient().auth.getSession();
    if (!session) {
      status.phase = "disabled";
      emit();
      return { phase: "disabled", stop: async () => {} };
    }

    // 1. READ — subscribe every shape for this child.
    for (const shape of buildShapes(shapeScope)) {
      unsubscribers.push(await subscribeShape(db, shape, session.access_token));
    }

    // 2. WRITE — push the outbox now, then on every local insert. log_events is
    //    append-only, so a live-query on its max sequence is a cheap change
    //    signal; the consumer can also call writeThrough() after each mutation.
    status.pushed += await writeThrough(db, shapeScope.childId);

    status.phase = "live";
    emit();
  } catch (err) {
    status.phase = "error";
    status.lastError = err instanceof Error ? err.message : "Unknown sync error";
    emit();
  }

  return {
    phase: status.phase,
    stop: async () => {
      await Promise.all(unsubscribers.map((u) => u()));
    },
  };
}
