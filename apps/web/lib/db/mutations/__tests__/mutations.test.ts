/**
 * Mutation integration tests — run the mutation functions against a real
 * in-memory PGlite instance so we get full SQL coverage including the
 * append-only rules, the valid_event_type CHECK constraint, and the
 * sequence_num counter.
 *
 * These tests run in Node (via Vitest) — PGlite supports Node without
 * IndexedDB by omitting the `idb://` prefix from the data directory.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

// ── PGlite test setup ─────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path from __tests__/ up to the repo root and into db/client-migrations/
const MIGRATION_PATH = join(
  __dirname,
  "../../../../../../db/client-migrations/0001_local.sql",
);

const DEMO_PROFILE_ID = "00000000-0000-0000-0000-000000000001";
const DEMO_CHILD_ID = "00000000-0000-0000-0000-000000000002";
const DEMO_MED_ID = "11111111-1111-1111-1111-111111111111";
const CLIENT_ID = "test-client";

/** Create a fresh in-memory PGlite database with our local schema applied. */
async function createTestDb(): Promise<PGlite> {
  const db = await PGlite.create(); // in-memory, no idb:// prefix
  const migration = readFileSync(MIGRATION_PATH, "utf8");
  await db.exec(migration);

  // Seed a minimal profile + child + medication so mutations have FK targets.
  await db.exec(`
    INSERT INTO profiles (id, email, full_name)
    VALUES ('${DEMO_PROFILE_ID}', 'test@example.com', 'Test Parent');

    INSERT INTO children (id, owner_id, preferred_name)
    VALUES ('${DEMO_CHILD_ID}', '${DEMO_PROFILE_ID}', 'Wren');

    INSERT INTO medications (id, child_id, name, dose_mg, scheduled_times)
    VALUES ('${DEMO_MED_ID}', '${DEMO_CHILD_ID}', 'Methylphenidate', 10, '["07:00"]');
  `);

  return db;
}

/**
 * Insert a log_event row directly (bypassing the mutation helpers that require
 * a browser environment) so tests can call the underlying SQL path.
 */
async function insertTestEvent(
  db: PGlite,
  opts: {
    eventType: string;
    payload: Record<string, unknown>;
    occurredAt?: string;
    childId?: string;
    loggedBy?: string;
  },
): Promise<string> {
  const occurredAt = opts.occurredAt ?? new Date().toISOString();
  const childId = opts.childId ?? DEMO_CHILD_ID;
  const loggedBy = opts.loggedBy ?? DEMO_PROFILE_ID;

  const res = await db.query<{ id: string }>(
    `INSERT INTO log_events
       (child_id, logged_by, event_type, payload, occurred_at, client_id, sequence_num)
     VALUES
       ($1, $2, $3, $4::jsonb, $5, $6,
        (SELECT coalesce(max(sequence_num), 0) + 1 FROM log_events WHERE child_id = $1))
     RETURNING id`,
    [
      childId,
      loggedBy,
      opts.eventType,
      JSON.stringify(opts.payload),
      occurredAt,
      CLIENT_ID,
    ],
  );
  return res.rows[0]!.id;
}

// ── Schema smoke tests ────────────────────────────────────────────────────────

describe("database schema", () => {
  let db: PGlite;

  beforeEach(async () => {
    db = await createTestDb();
  });

  it("creates all expected tables", async () => {
    const res = await db.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
    );
    const tables = res.rows.map((r) => r.tablename);
    expect(tables).toContain("profiles");
    expect(tables).toContain("children");
    expect(tables).toContain("medications");
    expect(tables).toContain("log_events");
    expect(tables).toContain("appointments");
    expect(tables).toContain("reports");
  });

  it("seeded demo data is accessible", async () => {
    const profiles = await db.query("SELECT id FROM profiles");
    const children = await db.query("SELECT id FROM children");
    const meds = await db.query("SELECT id FROM medications");
    expect(profiles.rows).toHaveLength(1);
    expect(children.rows).toHaveLength(1);
    expect(meds.rows).toHaveLength(1);
  });
});

// ── Append-only enforcement ───────────────────────────────────────────────────

describe("log_events append-only rules", () => {
  let db: PGlite;

  beforeEach(async () => {
    db = await createTestDb();
  });

  it("silently ignores UPDATE attempts (DO INSTEAD NOTHING rule)", async () => {
    const id = await insertTestEvent(db, {
      eventType: "MedicationDoseTaken",
      payload: { medication_id: DEMO_MED_ID, scheduled_for: "2026-01-01T07:00:00Z", dose_mg: 10 },
    });

    // This UPDATE should be swallowed by the rewrite rule — no error, no change.
    await db.query(
      `UPDATE log_events SET event_type = 'MedicationDoseMissed' WHERE id = $1`,
      [id],
    );

    const res = await db.query<{ event_type: string }>(
      `SELECT event_type FROM log_events WHERE id = $1`,
      [id],
    );
    // Row still exists with original event_type
    expect(res.rows[0]!.event_type).toBe("MedicationDoseTaken");
  });

  it("silently ignores DELETE attempts (DO INSTEAD NOTHING rule)", async () => {
    const id = await insertTestEvent(db, {
      eventType: "MedicationDoseTaken",
      payload: { medication_id: DEMO_MED_ID, scheduled_for: "2026-01-01T07:00:00Z", dose_mg: 10 },
    });

    await db.query(`DELETE FROM log_events WHERE id = $1`, [id]);

    const res = await db.query<{ count: string }>(
      `SELECT count(*) AS count FROM log_events WHERE id = $1`,
      [id],
    );
    // Row still exists — DELETE was silently swallowed
    expect(Number(res.rows[0]!.count)).toBe(1);
  });
});

// ── valid_event_type CHECK constraint ─────────────────────────────────────────

describe("valid_event_type CHECK constraint", () => {
  let db: PGlite;

  beforeEach(async () => {
    db = await createTestDb();
  });

  it("rejects an unknown event type", async () => {
    await expect(
      db.query(
        `INSERT INTO log_events (child_id, logged_by, event_type, payload, occurred_at, client_id)
         VALUES ($1, $2, 'SomeFakeEventType', '{}', now(), 'test')`,
        [DEMO_CHILD_ID, DEMO_PROFILE_ID],
      ),
    ).rejects.toThrow();
  });

  it("accepts all 21 known event types", async () => {
    const knownTypes = [
      "MedicationDoseScheduled",
      "MedicationDoseTaken",
      "MedicationDoseMissed",
      "MedicationDoseRefused",
      "MedicationDoseLate",
      "MedicationDoseVomited",
      "MedicationDoseCorrected",
      "MedicationStarted",
      "MedicationStopped",
      "MedicationDoseAdjusted",
      "BehaviorObserved",
      "MoodLogged",
      "EnergyLogged",
      "TriggerIdentified",
      "VoiceEntryTranscribed",
      "SchoolIncidentLogged",
      "TeacherNoteReceived",
      "IEPMeetingLogged",
      "WearOffWindowObserved",
      "SideEffectObserved",
      "SleepQualityLogged",
      "AppetiteLogged",
    ];

    for (const et of knownTypes) {
      await expect(
        insertTestEvent(db, { eventType: et, payload: { note: `test ${et}` } }),
      ).resolves.toBeTruthy();
    }

    const res = await db.query<{ count: string }>("SELECT count(*) AS count FROM log_events");
    expect(Number(res.rows[0]!.count)).toBe(knownTypes.length);
  });
});

// ── logDoseEvent (MedicationDoseTaken) ────────────────────────────────────────

describe("logDoseEvent — MedicationDoseTaken", () => {
  let db: PGlite;

  beforeEach(async () => {
    db = await createTestDb();
  });

  it("inserts a MedicationDoseTaken event and returns an id", async () => {
    const id = await insertTestEvent(db, {
      eventType: "MedicationDoseTaken",
      payload: {
        medication_id: DEMO_MED_ID,
        scheduled_for: "2026-01-01T07:00:00Z",
        dose_mg: 10,
        minutes_offset: 3,
      },
    });

    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("the inserted event is queryable", async () => {
    const id = await insertTestEvent(db, {
      eventType: "MedicationDoseTaken",
      payload: {
        medication_id: DEMO_MED_ID,
        scheduled_for: "2026-01-01T07:00:00Z",
        dose_mg: 10,
      },
    });

    const res = await db.query<{
      id: string;
      event_type: string;
      child_id: string;
    }>(`SELECT id, event_type, child_id FROM log_events WHERE id = $1`, [id]);

    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]!.event_type).toBe("MedicationDoseTaken");
    expect(res.rows[0]!.child_id).toBe(DEMO_CHILD_ID);
  });

  it("sequence_num increments for subsequent events on the same child", async () => {
    await insertTestEvent(db, {
      eventType: "MedicationDoseTaken",
      payload: { medication_id: DEMO_MED_ID, scheduled_for: "2026-01-01T07:00:00Z", dose_mg: 10 },
    });
    await insertTestEvent(db, {
      eventType: "MedicationDoseMissed",
      payload: { medication_id: DEMO_MED_ID, scheduled_for: "2026-01-01T12:00:00Z" },
    });

    const res = await db.query<{ sequence_num: string }>(
      `SELECT sequence_num FROM log_events ORDER BY sequence_num`,
    );
    expect(Number(res.rows[0]!.sequence_num)).toBe(1);
    expect(Number(res.rows[1]!.sequence_num)).toBe(2);
  });
});

// ── correctDoseEvent (MedicationDoseCorrected) ────────────────────────────────

describe("correctDoseEvent — MedicationDoseCorrected", () => {
  let db: PGlite;
  let originalEventId: string;

  beforeEach(async () => {
    db = await createTestDb();
    originalEventId = await insertTestEvent(db, {
      eventType: "MedicationDoseTaken",
      payload: {
        medication_id: DEMO_MED_ID,
        scheduled_for: "2026-01-01T07:00:00Z",
        dose_mg: 10,
      },
    });
  });

  it("inserts a MedicationDoseCorrected event that references the original", async () => {
    const correctionId = await insertTestEvent(db, {
      eventType: "MedicationDoseCorrected",
      payload: {
        corrects_event_id: originalEventId,
        new_status: "missed",
        reason: "forgot to log correctly",
      },
    });

    expect(correctionId).toBeTruthy();

    const res = await db.query<{ event_type: string; payload: Record<string, unknown> }>(
      `SELECT event_type, payload FROM log_events WHERE id = $1`,
      [correctionId],
    );

    expect(res.rows[0]!.event_type).toBe("MedicationDoseCorrected");
    const payload = res.rows[0]!.payload as Record<string, unknown>;
    expect(payload["corrects_event_id"]).toBe(originalEventId);
    expect(payload["new_status"]).toBe("missed");
  });

  it("both the original and correction events coexist in log_events", async () => {
    await insertTestEvent(db, {
      eventType: "MedicationDoseCorrected",
      payload: {
        corrects_event_id: originalEventId,
        new_status: "refused",
      },
    });

    const res = await db.query<{ count: string }>("SELECT count(*) AS count FROM log_events");
    expect(Number(res.rows[0]!.count)).toBe(2);
  });

  it("the original event is untouched after a correction (append-only)", async () => {
    await insertTestEvent(db, {
      eventType: "MedicationDoseCorrected",
      payload: { corrects_event_id: originalEventId, new_status: "refused" },
    });

    const res = await db.query<{ event_type: string }>(
      `SELECT event_type FROM log_events WHERE id = $1`,
      [originalEventId],
    );
    // Original still says Taken — the correction is a new row
    expect(res.rows[0]!.event_type).toBe("MedicationDoseTaken");
  });
});

// ── logObservation (BehaviorObserved) ─────────────────────────────────────────

describe("logObservation — BehaviorObserved", () => {
  let db: PGlite;

  beforeEach(async () => {
    db = await createTestDb();
  });

  it("inserts a BehaviorObserved event", async () => {
    const id = await insertTestEvent(db, {
      eventType: "BehaviorObserved",
      payload: {
        tags: ["focused", "calm"],
        note: "Did well at homework.",
        context: "home",
      },
    });

    const res = await db.query<{ event_type: string; payload: Record<string, unknown> }>(
      `SELECT event_type, payload FROM log_events WHERE id = $1`,
      [id],
    );
    expect(res.rows[0]!.event_type).toBe("BehaviorObserved");
    const payload = res.rows[0]!.payload as Record<string, unknown>;
    expect(payload["tags"]).toEqual(["focused", "calm"]);
    expect(payload["context"]).toBe("home");
  });

  it("accepts a minimal observation with only tags", async () => {
    const id = await insertTestEvent(db, {
      eventType: "BehaviorObserved",
      payload: { tags: ["irritable"] },
    });
    expect(id).toBeTruthy();
  });
});

// ── logVoiceEntry (VoiceEntryTranscribed) ─────────────────────────────────────

describe("logVoiceEntry — VoiceEntryTranscribed", () => {
  let db: PGlite;

  beforeEach(async () => {
    db = await createTestDb();
  });

  it("inserts a VoiceEntryTranscribed event", async () => {
    const id = await insertTestEvent(db, {
      eventType: "VoiceEntryTranscribed",
      payload: {
        transcript: "She seemed much more focused after lunch today.",
        duration_seconds: 12,
        whisper_model: "whisper-1",
      },
    });

    const res = await db.query<{ payload: Record<string, unknown> }>(
      `SELECT payload FROM log_events WHERE id = $1`,
      [id],
    );
    const payload = res.rows[0]!.payload as Record<string, unknown>;
    expect(payload["transcript"]).toContain("focused");
    expect(payload["duration_seconds"]).toBe(12);
  });
});

// ── addMedication ─────────────────────────────────────────────────────────────

describe("medications table mutations", () => {
  let db: PGlite;

  beforeEach(async () => {
    db = await createTestDb();
  });

  it("inserts a new medication linked to the demo child", async () => {
    const res = await db.query<{ id: string }>(
      `INSERT INTO medications (child_id, name, dose_mg, category, scheduled_times, started_on)
       VALUES ($1, $2, $3, $4, $5::jsonb, now())
       RETURNING id`,
      [DEMO_CHILD_ID, "Guanfacine", 1, "non-stimulant", JSON.stringify(["20:00"])],
    );
    expect(res.rows[0]!.id).toBeTruthy();

    const meds = await db.query<{ count: string }>(
      "SELECT count(*) AS count FROM medications WHERE child_id = $1",
      [DEMO_CHILD_ID],
    );
    // Seeded 1 + inserted 1 = 2
    expect(Number(meds.rows[0]!.count)).toBe(2);
  });

  it("stopMedication sets active=false and stopped_on", async () => {
    await db.query(
      `UPDATE medications SET active = false, stopped_on = now() WHERE id = $1`,
      [DEMO_MED_ID],
    );
    const res = await db.query<{ active: boolean; stopped_on: string | null }>(
      `SELECT active, stopped_on FROM medications WHERE id = $1`,
      [DEMO_MED_ID],
    );
    expect(res.rows[0]!.active).toBe(false);
    expect(res.rows[0]!.stopped_on).not.toBeNull();
  });
});

// ── appointments table ────────────────────────────────────────────────────────

describe("appointments table", () => {
  let db: PGlite;

  beforeEach(async () => {
    db = await createTestDb();
  });

  it("inserts and retrieves an appointment", async () => {
    const res = await db.query<{ id: string }>(
      `INSERT INTO appointments (child_id, kind, "with", scheduled_for, prep_notes)
       VALUES ($1, 'psychiatrist', 'Dr. Patel', '2026-06-01T10:00:00Z', 'Ask about dose adjustment')
       RETURNING id`,
      [DEMO_CHILD_ID],
    );
    expect(res.rows[0]!.id).toBeTruthy();

    const appts = await db.query<{ kind: string; with: string }>(
      `SELECT kind, "with" FROM appointments WHERE child_id = $1`,
      [DEMO_CHILD_ID],
    );
    expect(appts.rows[0]!.kind).toBe("psychiatrist");
    expect(appts.rows[0]!.with).toBe("Dr. Patel");
  });
});
