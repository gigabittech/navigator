/**
 * Migration smoke test — CLAUDE.md requires that the schema migrations have an
 * up (and ideally re-apply) smoke test. This boots an in-memory PGlite (the
 * same WASM Postgres that runs on-device) and applies the canonical local
 * schema string `db/client-migrations/0001_local.sql`, then asserts the
 * structural guarantees the rest of the system relies on:
 *
 *   • every expected table exists
 *   • the append-only triggers on `log_events` RAISE on UPDATE and DELETE
 *   • the UNIQUE(child_id, sequence_num) constraint rejects a duplicate
 *   • the valid_event_type CHECK rejects an unknown type and accepts every
 *     known type from `@navigator/schema`
 *   • re-applying the schema (IF NOT EXISTS) is idempotent — no error
 *
 * Runs in Node via Vitest. PGlite works in Node by omitting the `idb://`
 * prefix from the data directory, so each test gets a throwaway in-memory DB.
 * All timestamps are passed as literal ISO strings so the test is fully
 * deterministic and never reads the wall clock.
 */

import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { ALL_EVENT_TYPES } from "../src/event-types.js";

// ── Migration loading ─────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path from packages/schema/test/ up to the repo root, into db/client-migrations/.
// This is the canonical CLIENT schema — the on-device mirror of the server
// migrations — and is the same file the mutation integration tests apply.
const MIGRATION_PATH = join(
  __dirname,
  "../../../db/client-migrations/0001_local.sql",
);

// Every table the schema is expected to create on-device. The server adds one
// more — `waitlist_entries` (db/migrations/0003_waitlist.sql) — but that table
// is server-only (service-role access, no device shape) and intentionally
// absent from the local schema, so it is asserted separately below.
const EXPECTED_LOCAL_TABLES = [
  "profiles",
  "children",
  "child_collaborators",
  "medications",
  "log_events",
  "appointments",
  "reports",
] as const;

const DEMO_PROFILE_ID = "00000000-0000-0000-0000-000000000001";
const DEMO_CHILD_ID = "00000000-0000-0000-0000-000000000002";
const ISO = "2026-01-01T07:00:00.000Z";

let migrationSql: string;

beforeAll(() => {
  migrationSql = readFileSync(MIGRATION_PATH, "utf8");
});

/** Boot a fresh in-memory PGlite with the local schema applied + minimal seed. */
async function createMigratedDb(): Promise<PGlite> {
  const db = await PGlite.create(); // in-memory, no idb:// prefix
  await db.exec(migrationSql);

  // Seed a profile + child so log_events has valid FK targets.
  await db.exec(`
    INSERT INTO profiles (id, email, full_name)
    VALUES ('${DEMO_PROFILE_ID}', 'smoke@example.com', 'Smoke Test Parent');

    INSERT INTO children (id, owner_id, preferred_name)
    VALUES ('${DEMO_CHILD_ID}', '${DEMO_PROFILE_ID}', 'Wren');
  `);

  return db;
}

/** Insert a log_event with an explicit sequence_num (deterministic, no max()+1). */
async function insertEvent(
  db: PGlite,
  eventType: string,
  sequenceNum: number | null,
): Promise<string> {
  const res = await db.query<{ id: string }>(
    `INSERT INTO log_events
       (child_id, logged_by, event_type, payload, occurred_at, client_id, sequence_num)
     VALUES ($1, $2, $3, '{}'::jsonb, $4, 'smoke-client', $5)
     RETURNING id`,
    [DEMO_CHILD_ID, DEMO_PROFILE_ID, eventType, ISO, sequenceNum],
  );
  return res.rows[0]!.id;
}

// ── Migration applies cleanly + creates the schema ────────────────────────────

describe("migration: up + structure", () => {
  let db: PGlite;

  beforeEach(async () => {
    db = await createMigratedDb();
  });

  it("applies the local schema without error", async () => {
    // createMigratedDb() already ran db.exec(migrationSql); a clean boot here
    // confirms the migration is valid PGlite SQL.
    const res = await db.query<{ ok: number }>("SELECT 1 AS ok");
    expect(res.rows[0]!.ok).toBe(1);
  });

  it("creates every expected local table", async () => {
    const res = await db.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
    );
    const tables = res.rows.map((r) => r.tablename);
    for (const expected of EXPECTED_LOCAL_TABLES) {
      expect(tables).toContain(expected);
    }
  });

  it("does NOT create the server-only waitlist_entries table on-device", async () => {
    // waitlist_entries lives only in the server migrations (0003); the local
    // schema deliberately omits it. This guards against accidental drift.
    const res = await db.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'waitlist_entries'`,
    );
    expect(res.rows).toHaveLength(0);
  });

  it("creates the append-only triggers on log_events", async () => {
    const res = await db.query<{ tgname: string }>(
      `SELECT tgname FROM pg_trigger
       WHERE tgrelid = 'log_events'::regclass AND NOT tgisinternal
       ORDER BY tgname`,
    );
    const triggers = res.rows.map((r) => r.tgname);
    expect(triggers).toContain("log_events_no_update");
    expect(triggers).toContain("log_events_no_delete");
  });
});

// ── Append-only enforcement (Wave 1 triggers RAISE on UPDATE/DELETE) ──────────

describe("migration: log_events append-only triggers fire", () => {
  let db: PGlite;
  let eventId: string;

  beforeEach(async () => {
    db = await createMigratedDb();
    eventId = await insertEvent(db, "MedicationDoseTaken", 1);
  });

  it("RAISEs on UPDATE", async () => {
    await expect(
      db.query(`UPDATE log_events SET event_type = 'MedicationDoseMissed' WHERE id = $1`, [
        eventId,
      ]),
    ).rejects.toThrow(/append-only/);

    // The row is unchanged — the write was rejected, not silently dropped.
    const res = await db.query<{ event_type: string }>(
      `SELECT event_type FROM log_events WHERE id = $1`,
      [eventId],
    );
    expect(res.rows[0]!.event_type).toBe("MedicationDoseTaken");
  });

  it("RAISEs on DELETE", async () => {
    await expect(
      db.query(`DELETE FROM log_events WHERE id = $1`, [eventId]),
    ).rejects.toThrow(/append-only/);

    const res = await db.query<{ count: string }>(
      `SELECT count(*) AS count FROM log_events WHERE id = $1`,
      [eventId],
    );
    expect(Number(res.rows[0]!.count)).toBe(1);
  });
});

// ── UNIQUE(child_id, sequence_num) constraint ─────────────────────────────────

describe("migration: log_events_child_seq_unique constraint", () => {
  let db: PGlite;

  beforeEach(async () => {
    db = await createMigratedDb();
  });

  it("rejects a duplicate (child_id, sequence_num)", async () => {
    await insertEvent(db, "MedicationDoseTaken", 1);

    // Same child + same sequence_num collides — fails loudly so the writer
    // retries rather than silently duplicating a sequence.
    await expect(insertEvent(db, "MedicationDoseMissed", 1)).rejects.toThrow();
  });

  it("allows distinct sequence_num values for the same child", async () => {
    await insertEvent(db, "MedicationDoseTaken", 1);
    await insertEvent(db, "MedicationDoseMissed", 2);

    const res = await db.query<{ count: string }>(
      `SELECT count(*) AS count FROM log_events WHERE child_id = $1`,
      [DEMO_CHILD_ID],
    );
    expect(Number(res.rows[0]!.count)).toBe(2);
  });

  it("allows multiple NULL sequence_num rows (NULLs are distinct under UNIQUE)", async () => {
    await insertEvent(db, "MedicationDoseTaken", null);
    await insertEvent(db, "MedicationDoseMissed", null);

    const res = await db.query<{ count: string }>(
      `SELECT count(*) AS count FROM log_events WHERE sequence_num IS NULL`,
    );
    expect(Number(res.rows[0]!.count)).toBe(2);
  });
});

// ── valid_event_type CHECK constraint ─────────────────────────────────────────

describe("migration: valid_event_type CHECK constraint", () => {
  let db: PGlite;

  beforeEach(async () => {
    db = await createMigratedDb();
  });

  it("rejects an unknown event type", async () => {
    await expect(insertEvent(db, "SomeFakeEventType", 1)).rejects.toThrow();
  });

  it("accepts every known event type from @navigator/schema", async () => {
    // Drives the assertion off the single source of truth so the migration's
    // CHECK list and the TS enum can't silently drift apart.
    expect(ALL_EVENT_TYPES.length).toBeGreaterThan(0);

    let seq = 1;
    for (const et of ALL_EVENT_TYPES) {
      await expect(insertEvent(db, et, seq)).resolves.toBeTruthy();
      seq += 1;
    }

    const res = await db.query<{ count: string }>(
      `SELECT count(*) AS count FROM log_events`,
    );
    expect(Number(res.rows[0]!.count)).toBe(ALL_EVENT_TYPES.length);
  });
});

// ── Idempotency: re-applying the IF NOT EXISTS schema does not error ──────────

describe("migration: re-apply idempotency", () => {
  it("re-running the schema on an already-migrated DB does not error", async () => {
    const db = await createMigratedDb();

    // The migration uses CREATE TABLE/INDEX IF NOT EXISTS, CREATE OR REPLACE
    // FUNCTION, and DROP TRIGGER IF EXISTS before CREATE TRIGGER, so a second
    // application must be a no-op rather than a failure.
    await expect(db.exec(migrationSql)).resolves.toBeDefined();

    // Schema is still intact after the re-apply.
    const res = await db.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'log_events'`,
    );
    expect(res.rows).toHaveLength(1);

    // And the append-only trigger still fires after the re-apply.
    const id = await insertEvent(db, "MedicationDoseTaken", 1);
    await expect(
      db.query(`DELETE FROM log_events WHERE id = $1`, [id]),
    ).rejects.toThrow(/append-only/);
  });
});
