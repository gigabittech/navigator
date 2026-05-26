import { describe, expect, it } from "vitest";
import { EventType } from "../src/event-types.js";
import { adherenceRate, projectDoseStatus } from "../src/projections.js";
import type { LogEvent } from "../src/log-events.js";

const MED = "11111111-1111-1111-1111-111111111111";
const MED2 = "22222222-2222-2222-2222-222222222222";

// ── Test helpers ─────────────────────────────────────────────────────────────

function ev(id: string, eventType: string, payload: Record<string, unknown>): LogEvent {
  return { id, eventType, payload } as unknown as LogEvent;
}

function doseEv(
  id: string,
  eventType: string,
  scheduledFor: string,
  medId: string = MED,
  extra: Record<string, unknown> = {},
): LogEvent {
  return ev(id, eventType, {
    medication_id: medId,
    scheduled_for: scheduledFor,
    dose_mg: 10,
    ...extra,
  });
}

// ── projectDoseStatus ─────────────────────────────────────────────────────────

describe("projectDoseStatus", () => {
  it("projects one snapshot per (medication, slot)", () => {
    const snaps = projectDoseStatus([
      ev("e1", EventType.Taken, {
        medication_id: MED,
        scheduled_for: "2026-01-01T07:00:00Z",
        minutes_offset: 4,
      }),
      ev("e2", EventType.Missed, { medication_id: MED, scheduled_for: "2026-01-01T12:00:00Z" }),
    ]);
    expect(snaps).toHaveLength(2);
    expect(snaps.map((s) => s.status).sort()).toEqual(["missed", "taken"]);
  });

  it("applies a correction last, overriding the original status", () => {
    const snaps = projectDoseStatus([
      ev("e1", EventType.Taken, { medication_id: MED, scheduled_for: "2026-01-01T07:00:00Z" }),
      ev("c1", EventType.Corrected, { corrects_event_id: "e1", new_status: "missed" }),
    ]);
    expect(snaps).toHaveLength(1);
    expect(snaps[0]!.status).toBe("missed");
    expect(snaps[0]!.corrected).toBe(true);
    expect(snaps[0]!.sourceEventId).toBe("c1");
  });

  // ── MedicationDoseTaken ───────────────────────────────────────────────────

  it("maps MedicationDoseTaken to status 'taken'", () => {
    const snaps = projectDoseStatus([
      doseEv("e1", EventType.Taken, "2026-01-01T07:00:00Z"),
    ]);
    expect(snaps).toHaveLength(1);
    expect(snaps[0]!.status).toBe("taken");
    expect(snaps[0]!.corrected).toBe(false);
    expect(snaps[0]!.sourceEventId).toBe("e1");
  });

  it("captures minutesOffset from MedicationDoseTaken payload", () => {
    const snaps = projectDoseStatus([
      doseEv("e1", EventType.Taken, "2026-01-01T07:00:00Z", MED, { minutes_offset: 12 }),
    ]);
    expect(snaps[0]!.minutesOffset).toBe(12);
  });

  // ── MedicationDoseMissed ──────────────────────────────────────────────────

  it("maps MedicationDoseMissed to status 'missed'", () => {
    const snaps = projectDoseStatus([
      ev("e1", EventType.Missed, {
        medication_id: MED,
        scheduled_for: "2026-01-01T12:00:00Z",
      }),
    ]);
    expect(snaps[0]!.status).toBe("missed");
  });

  // ── MedicationDoseRefused ─────────────────────────────────────────────────

  it("maps MedicationDoseRefused to status 'refused'", () => {
    const snaps = projectDoseStatus([
      ev("e1", EventType.Refused, {
        medication_id: MED,
        scheduled_for: "2026-01-01T08:00:00Z",
        reason: "wouldn't swallow it",
      }),
    ]);
    expect(snaps[0]!.status).toBe("refused");
  });

  // ── MedicationDoseLate ────────────────────────────────────────────────────

  it("maps MedicationDoseLate to status 'late'", () => {
    const snaps = projectDoseStatus([
      doseEv("e1", EventType.Late, "2026-01-01T07:00:00Z", MED, { minutes_offset: 45 }),
    ]);
    expect(snaps[0]!.status).toBe("late");
    expect(snaps[0]!.minutesOffset).toBe(45);
  });

  // ── MedicationDoseVomited ─────────────────────────────────────────────────

  it("maps MedicationDoseVomited to status 'vomited'", () => {
    const snaps = projectDoseStatus([
      doseEv("e1", EventType.Vomited, "2026-01-01T07:00:00Z"),
    ]);
    expect(snaps[0]!.status).toBe("vomited");
  });

  // ── MedicationDoseScheduled ───────────────────────────────────────────────

  it("maps MedicationDoseScheduled to status 'scheduled'", () => {
    const snaps = projectDoseStatus([
      doseEv("e1", EventType.Scheduled, "2026-01-02T07:00:00Z"),
    ]);
    expect(snaps[0]!.status).toBe("scheduled");
  });

  // ── Non-dose event types ──────────────────────────────────────────────────

  it("ignores events without medication_id or scheduled_for", () => {
    const snaps = projectDoseStatus([
      ev("e1", EventType.BehaviorObserved, { tags: ["focused"] }),
      ev("e2", EventType.MoodLogged, { rating: 4 }),
      ev("e3", EventType.EnergyLogged, { rating: 3 }),
      ev("e4", EventType.TriggerIdentified, { trigger: "loud noise" }),
      ev("e5", EventType.VoiceEntryTranscribed, { transcript: "test", duration_seconds: 10 }),
      ev("e6", EventType.IncidentLogged, { description: "pushed a classmate" }),
      ev("e7", EventType.TeacherNoteReceived, { note: "good day" }),
      ev("e8", EventType.IEPMeetingLogged, { summary: "goals reviewed" }),
      ev("e9", EventType.WearOffWindowObserved, { window_start: "2026-01-01T14:00:00Z" }),
      ev("e10", EventType.SideEffectObserved, { effect: "headache" }),
      ev("e11", EventType.SleepQualityLogged, { rating: 2 }),
      ev("e12", EventType.AppetiteLogged, { rating: 3 }),
      ev("e13", EventType.Started, { medication_id: MED, start_date: "2026-01-01" }),
      ev("e14", EventType.Stopped, { medication_id: MED, reason: "side effects" }),
      ev("e15", EventType.Adjusted, { medication_id: MED, new_dose_mg: 20 }),
    ]);
    expect(snaps).toHaveLength(0);
  });

  // ── Multiple medications ──────────────────────────────────────────────────

  it("tracks doses for multiple medications independently", () => {
    const slot = "2026-01-01T07:00:00Z";
    const snaps = projectDoseStatus([
      doseEv("e1", EventType.Taken, slot, MED),
      doseEv("e2", EventType.Missed, slot, MED2),
    ]);
    expect(snaps).toHaveLength(2);
    const m1 = snaps.find((s) => s.medicationId === MED);
    const m2 = snaps.find((s) => s.medicationId === MED2);
    expect(m1!.status).toBe("taken");
    expect(m2!.status).toBe("missed");
  });

  it("last event for the same slot wins (without correction)", () => {
    const slot = "2026-01-01T07:00:00Z";
    // User tapped Taken, then Missed (changed their mind before correction event)
    const snaps = projectDoseStatus([
      doseEv("e1", EventType.Taken, slot),
      doseEv("e2", EventType.Missed, slot),
    ]);
    expect(snaps).toHaveLength(1);
    expect(snaps[0]!.status).toBe("missed");
    expect(snaps[0]!.sourceEventId).toBe("e2");
  });

  // ── Correction semantics ──────────────────────────────────────────────────

  it("correction targeting an unknown event id is a no-op", () => {
    const snaps = projectDoseStatus([
      doseEv("e1", EventType.Taken, "2026-01-01T07:00:00Z"),
      ev("c1", EventType.Corrected, {
        corrects_event_id: "does-not-exist",
        new_status: "missed",
      }),
    ]);
    // The original Taken snapshot is unchanged; the orphan correction has no target.
    expect(snaps).toHaveLength(1);
    expect(snaps[0]!.status).toBe("taken");
    expect(snaps[0]!.corrected).toBe(false);
  });

  it("correction sets corrected=true on the target snapshot", () => {
    const snaps = projectDoseStatus([
      doseEv("e1", EventType.Taken, "2026-01-01T07:00:00Z"),
      ev("c1", EventType.Corrected, { corrects_event_id: "e1", new_status: "refused" }),
    ]);
    expect(snaps[0]!.status).toBe("refused");
    expect(snaps[0]!.corrected).toBe(true);
  });

  it("all correction new_status values are accepted", () => {
    const statuses: Array<"taken" | "missed" | "refused" | "late" | "vomited"> = [
      "taken",
      "missed",
      "refused",
      "late",
      "vomited",
    ];
    for (const newStatus of statuses) {
      const snaps = projectDoseStatus([
        doseEv("e1", EventType.Taken, "2026-01-01T07:00:00Z"),
        ev("c1", EventType.Corrected, { corrects_event_id: "e1", new_status: newStatus }),
      ]);
      expect(snaps[0]!.status).toBe(newStatus);
    }
  });

  it("returns empty array when given no events", () => {
    expect(projectDoseStatus([])).toEqual([]);
  });

  it("preserves medicationId and scheduledFor on snapshots", () => {
    const slot = "2026-01-03T08:00:00Z";
    const snaps = projectDoseStatus([doseEv("e1", EventType.Taken, slot)]);
    expect(snaps[0]!.medicationId).toBe(MED);
    expect(snaps[0]!.scheduledFor).toBe(slot);
  });
});

// ── adherenceRate ─────────────────────────────────────────────────────────────

describe("adherenceRate", () => {
  it("returns 0 with no snapshots", () => {
    expect(adherenceRate([])).toBe(0);
  });

  it("returns 0 when all doses are still scheduled (none accounted)", () => {
    const snaps = projectDoseStatus([
      doseEv("e1", EventType.Scheduled, "2026-01-01T07:00:00Z"),
      doseEv("e2", EventType.Scheduled, "2026-01-01T12:00:00Z"),
    ]);
    expect(adherenceRate(snaps)).toBe(0);
  });

  it("counts taken and late as successful", () => {
    const snaps = projectDoseStatus([
      ev("e1", EventType.Taken, { medication_id: MED, scheduled_for: "2026-01-01T07:00:00Z" }),
      ev("e2", EventType.Late, { medication_id: MED, scheduled_for: "2026-01-01T12:00:00Z" }),
      ev("e3", EventType.Missed, { medication_id: MED, scheduled_for: "2026-01-01T20:00:00Z" }),
    ]);
    // 2 of 3 accounted slots successful → 67%
    expect(adherenceRate(snaps)).toBe(67);
  });

  it("returns 100 when all accounted doses are taken", () => {
    const snaps = projectDoseStatus([
      doseEv("e1", EventType.Taken, "2026-01-01T07:00:00Z"),
      doseEv("e2", EventType.Taken, "2026-01-01T12:00:00Z"),
    ]);
    expect(adherenceRate(snaps)).toBe(100);
  });

  it("returns 0 when all accounted doses are missed", () => {
    const snaps = projectDoseStatus([
      ev("e1", EventType.Missed, { medication_id: MED, scheduled_for: "2026-01-01T07:00:00Z" }),
      ev("e2", EventType.Missed, { medication_id: MED, scheduled_for: "2026-01-01T12:00:00Z" }),
    ]);
    expect(adherenceRate(snaps)).toBe(0);
  });

  it("treats refused and vomited as unsuccessful", () => {
    const snaps = projectDoseStatus([
      doseEv("e1", EventType.Taken, "2026-01-01T07:00:00Z"),
      ev("e2", EventType.Refused, { medication_id: MED, scheduled_for: "2026-01-01T12:00:00Z" }),
      doseEv("e3", EventType.Vomited, "2026-01-01T18:00:00Z"),
    ]);
    // 1 of 3 successful → 33%
    expect(adherenceRate(snaps)).toBe(33);
  });

  it("rounds to the nearest whole number", () => {
    const snaps = projectDoseStatus([
      doseEv("e1", EventType.Taken, "2026-01-01T07:00:00Z"),
      doseEv("e2", EventType.Taken, "2026-01-01T08:00:00Z"),
      ev("e3", EventType.Missed, { medication_id: MED, scheduled_for: "2026-01-01T12:00:00Z" }),
    ]);
    // 2 / 3 = 66.666… → rounds to 67
    expect(adherenceRate(snaps)).toBe(67);
  });

  it("excludes scheduled slots from the denominator", () => {
    // 1 taken + 1 scheduled. Denominator = 1 (only the taken slot is accounted).
    const snaps = projectDoseStatus([
      doseEv("e1", EventType.Taken, "2026-01-01T07:00:00Z"),
      doseEv("e2", EventType.Scheduled, "2026-01-01T12:00:00Z"),
    ]);
    expect(adherenceRate(snaps)).toBe(100);
  });

  it("reflects corrected statuses in the rate", () => {
    // Original: taken + taken + taken = 100%
    // After correction of e1 to missed: taken + taken + missed = 67%
    const snaps = projectDoseStatus([
      doseEv("e1", EventType.Taken, "2026-01-01T07:00:00Z"),
      doseEv("e2", EventType.Taken, "2026-01-01T12:00:00Z"),
      doseEv("e3", EventType.Taken, "2026-01-01T18:00:00Z"),
      ev("c1", EventType.Corrected, { corrects_event_id: "e1", new_status: "missed" }),
    ]);
    expect(adherenceRate(snaps)).toBe(67);
  });
});
