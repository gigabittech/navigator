/**
 * First-run seed for the on-device database. Idempotent: only runs when the
 * device has no child yet. Creates one parent, one child (Wren), two
 * medications, an upcoming appointment, and a realistic week of log_events so
 * /today, /timeline, and /report have honest content on first open.
 *
 * In local single-device mode this stands in for the real profile. Once
 * Supabase auth + sync land, the synced rows replace the seed.
 */

"use client";

import type { PGliteInterface } from "@electric-sql/pglite";
import { EventType } from "@navigator/schema/event-types";
import { slotIso } from "../time.js";
import { getClientId } from "./client.js";

export async function seedIfEmpty(db: PGliteInterface): Promise<void> {
  const existing = await db.query<{ count: number }>(
    "SELECT count(*)::int AS count FROM children",
  );
  if ((existing.rows[0]?.count ?? 0) > 0) return;

  const clientId = getClientId();

  const profileRes = await db.query<{ id: string }>(
    `INSERT INTO profiles (email, full_name, role)
     VALUES ($1, $2, 'parent')
     ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
     RETURNING id`,
    ["demo@navigator.local", "Demo Parent"],
  );
  const profileId = profileRes.rows[0]!.id;

  const childRes = await db.query<{ id: string }>(
    `INSERT INTO children (owner_id, preferred_name, diagnoses_notes)
     VALUES ($1, $2, $3) RETURNING id`,
    [profileId, "Wren", "ADHD-C; mild anxiety"],
  );
  const childId = childRes.rows[0]!.id;

  const meds: { id: string; name: string; dose: number; times: string[] }[] = [];
  const medSpecs = [
    { name: "Methylphenidate ER", dose: 10, category: "stimulant", times: ["07:00", "12:00"] },
    { name: "Guanfacine", dose: 1, category: "alpha_agonist", times: ["20:00"] },
  ];
  for (const m of medSpecs) {
    const r = await db.query<{ id: string }>(
      `INSERT INTO medications (child_id, name, dose_mg, category, scheduled_times)
       VALUES ($1, $2, $3, $4, $5::jsonb) RETURNING id`,
      [childId, m.name, m.dose, m.category, JSON.stringify(m.times)],
    );
    meds.push({ id: r.rows[0]!.id, name: m.name, dose: m.dose, times: m.times });
  }

  // Upcoming appointment for /prep.
  const apptDate = new Date();
  apptDate.setDate(apptDate.getDate() + 5);
  apptDate.setHours(14, 30, 0, 0);
  await db.query(
    `INSERT INTO appointments (child_id, kind, "with", scheduled_for, prep_notes)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      childId,
      "Psychiatry follow-up",
      "Dr. Alvarez",
      apptDate.toISOString(),
      "Review morning wear-off and noon dose timing.",
    ],
  );

  // --- A week of dose events -------------------------------------------------
  // Deterministic pattern so the demo and report are stable run-to-run.
  let seq = 1;
  const insertEvent = async (
    type: string,
    occurredAt: string,
    payload: Record<string, unknown>,
  ) => {
    await db.query(
      `INSERT INTO log_events (child_id, logged_by, event_type, payload, occurred_at, client_id, sequence_num)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)`,
      [childId, profileId, type, JSON.stringify(payload), occurredAt, clientId, seq++],
    );
  };

  // Pattern of outcomes per day-offset (0 = today). Keeps adherence < 100%.
  const outcomeByDay: Record<number, "taken" | "late" | "missed" | "refused"> = {
    7: "taken",
    6: "late",
    5: "taken",
    4: "missed",
    3: "taken",
    2: "refused",
    1: "taken",
  };

  for (let dayOffset = 7; dayOffset >= 1; dayOffset--) {
    const day = new Date();
    day.setDate(day.getDate() - dayOffset);
    const outcome = outcomeByDay[dayOffset] ?? "taken";

    for (const med of meds) {
      for (const t of med.times) {
        const scheduledFor = slotIso(day, t);
        // The evening slot is almost always taken regardless of the daytime pattern.
        const slotOutcome = t === "20:00" ? "taken" : outcome;

        if (slotOutcome === "taken") {
          const occurred = new Date(new Date(scheduledFor).getTime() + 4 * 60000);
          await insertEvent(EventType.Taken, occurred.toISOString(), {
            medication_id: med.id,
            scheduled_for: scheduledFor,
            dose_mg: med.dose,
            minutes_offset: 4,
          });
        } else if (slotOutcome === "late") {
          const occurred = new Date(new Date(scheduledFor).getTime() + 38 * 60000);
          await insertEvent(EventType.Late, occurred.toISOString(), {
            medication_id: med.id,
            scheduled_for: scheduledFor,
            dose_mg: med.dose,
            minutes_offset: 38,
          });
        } else if (slotOutcome === "missed") {
          await insertEvent(EventType.Missed, scheduledFor, {
            medication_id: med.id,
            scheduled_for: scheduledFor,
            reason: "Forgot in the school-run rush.",
          });
        } else {
          await insertEvent(EventType.Refused, scheduledFor, {
            medication_id: med.id,
            scheduled_for: scheduledFor,
            reason: "Said it made their stomach hurt.",
            parent_note: "Offered with food, still refused.",
          });
        }
      }
    }
  }

  // Today: morning dose already taken (slightly late); noon + evening left
  // scheduled so the user has something to tap.
  const today = new Date();
  const morningSlot = slotIso(today, "07:00");
  const morningTaken = new Date(new Date(morningSlot).getTime() + 9 * 60000);
  await insertEvent(EventType.Taken, morningTaken.toISOString(), {
    medication_id: meds[0]!.id,
    scheduled_for: morningSlot,
    dose_mg: meds[0]!.dose,
    minutes_offset: 9,
  });

  // A couple of behavioral observations + one voice note for timeline texture.
  const obs1 = new Date();
  obs1.setDate(obs1.getDate() - 2);
  obs1.setHours(16, 20, 0, 0);
  await insertEvent(EventType.BehaviorObserved, obs1.toISOString(), {
    tags: ["irritable", "wear-off"],
    note: "Big crash around 4pm after the noon dose wore off.",
    context: "home",
  });

  const obs2 = new Date();
  obs2.setDate(obs2.getDate() - 1);
  obs2.setHours(9, 10, 0, 0);
  await insertEvent(EventType.BehaviorObserved, obs2.toISOString(), {
    tags: ["focused", "calm"],
    note: "Good focused stretch through the morning.",
    context: "school",
  });

  const voiceAt = new Date();
  voiceAt.setHours(7, 30, 0, 0);
  await insertEvent(EventType.VoiceEntryTranscribed, voiceAt.toISOString(), {
    transcript: "Slept badly, woke up at five. Appetite low at breakfast.",
    duration_seconds: 12,
  });
}
