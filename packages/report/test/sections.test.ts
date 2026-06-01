import { describe, expect, it } from "vitest";
import { EventType, type DoseStatusSnapshot, type LogEvent, type Medication } from "@navigator/schema";
import { adherenceSection, behaviorTagsSection, timelineHighlightsSection } from "../src/sections.js";

/**
 * Direct unit tests for each report section generator.
 *
 * Fixtures are fully literal — every timestamp is an explicit ISO string and
 * no value is read from the current clock — so these assertions are
 * deterministic across machines and runs.
 */

// ---- Fixture builders -----------------------------------------------------

function makeMedication(over: Partial<Medication> & Pick<Medication, "id" | "name">): Medication {
  return {
    childId: "00000000-0000-0000-0000-0000000000c1",
    category: "stimulant",
    doseMg: "10",
    scheduledTimes: ["07:00"],
    active: true,
    startedOn: null,
    stoppedOn: null,
    notes: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...over,
  } as unknown as Medication;
}

function makeSnapshot(
  medicationId: string,
  status: DoseStatusSnapshot["status"],
  scheduledFor: string,
  sourceEventId: string,
): DoseStatusSnapshot {
  return {
    medicationId,
    scheduledFor,
    status,
    sourceEventId,
    corrected: false,
  };
}

function makeEvent(
  id: string,
  eventType: (typeof EventType)[keyof typeof EventType],
  occurredAt: string,
  payload: Record<string, unknown> = {},
): LogEvent {
  return {
    id,
    childId: "00000000-0000-0000-0000-0000000000c1",
    eventType,
    payload,
    occurredAt: new Date(occurredAt),
    recordedAt: new Date(occurredAt),
    loggedBy: "00000000-0000-0000-0000-000000000001",
    clientId: "test-device",
    sequenceNum: 1n,
  } as unknown as LogEvent;
}

// A small voice/tone guard reused across sections. The product voice forbids
// exclamation marks; headings are sentence case (first letter upper, no
// Title Case run of capitalised words).
function expectVoiceCompliant(section: { title: string; body: string }): void {
  expect(section.title).not.toContain("!");
  expect(section.body).not.toContain("!");
  // Sentence-case heading: starts uppercase, and isn't Title Cased.
  expect(section.title[0]).toBe(section.title[0]?.toUpperCase());
  const words = section.title.split(" ");
  const capitalisedWords = words.filter((w) => /^[A-Z]/.test(w));
  expect(capitalisedWords.length).toBeLessThanOrEqual(1);
}

// ---- adherenceSection -----------------------------------------------------

describe("adherenceSection", () => {
  it("handles the empty case with no medications and no stat", () => {
    const section = adherenceSection([], []);

    expect(section.id).toBe("adherence");
    expect(section.body).toBe("No medications tracked in this window.");
    expect(section.stat).toBeUndefined();
    expect(section.data).toEqual({ rows: [] });
    expectVoiceCompliant(section);
  });

  it("reports no stat when medications exist but no doses were snapshotted", () => {
    const meds = [makeMedication({ id: "m1", name: "Methylphenidate" })];
    const section = adherenceSection([], meds);

    // A tracked med with zero doses still yields a row, but no overall stat
    // because there are no doses to compute a rate from.
    expect(section.stat).toBeUndefined();
    expect(section.body).toContain("Methylphenidate 10 mg — 0 of 0 taken (0%).");
  });

  it("surfaces a positive stat at or above the 80% threshold", () => {
    const meds = [makeMedication({ id: "m1", name: "Methylphenidate" })];
    const snapshots: DoseStatusSnapshot[] = [
      makeSnapshot("m1", "taken", "2026-01-01T07:00:00Z", "e1"),
      makeSnapshot("m1", "taken", "2026-01-02T07:00:00Z", "e2"),
      makeSnapshot("m1", "taken", "2026-01-03T07:00:00Z", "e3"),
      makeSnapshot("m1", "taken", "2026-01-04T07:00:00Z", "e4"),
      makeSnapshot("m1", "missed", "2026-01-05T07:00:00Z", "e5"),
    ];

    const section = adherenceSection(snapshots, meds);

    // 4 of 5 taken = 80% — exactly the boundary, treated as positive.
    expect(section.stat).toEqual({ value: "80%", direction: "positive" });
    expect(section.body).toContain("Methylphenidate 10 mg — 4 of 5 taken (80%).");
    expect((section.data?.rows as unknown[]).length).toBe(1);
    expectVoiceCompliant(section);
  });

  it("flags a stat below the 80% threshold", () => {
    const meds = [makeMedication({ id: "m1", name: "Guanfacine" })];
    const snapshots: DoseStatusSnapshot[] = [
      makeSnapshot("m1", "taken", "2026-01-01T07:00:00Z", "e1"),
      makeSnapshot("m1", "taken", "2026-01-02T07:00:00Z", "e2"),
      makeSnapshot("m1", "missed", "2026-01-03T07:00:00Z", "e3"),
      makeSnapshot("m1", "missed", "2026-01-04T07:00:00Z", "e4"),
    ];

    const section = adherenceSection(snapshots, meds);

    // 2 of 4 taken = 50% — below threshold, flagged for attention.
    expect(section.stat).toEqual({ value: "50%", direction: "flag" });
    expectVoiceCompliant(section);
  });

  it("aggregates across multiple medications for the overall rate", () => {
    const meds = [
      makeMedication({ id: "m1", name: "Methylphenidate" }),
      makeMedication({ id: "m2", name: "Guanfacine", doseMg: "1" }),
    ];
    const snapshots: DoseStatusSnapshot[] = [
      makeSnapshot("m1", "taken", "2026-01-01T07:00:00Z", "e1"),
      makeSnapshot("m1", "taken", "2026-01-02T07:00:00Z", "e2"),
      makeSnapshot("m2", "taken", "2026-01-01T20:00:00Z", "e3"),
      makeSnapshot("m2", "missed", "2026-01-02T20:00:00Z", "e4"),
    ];

    const section = adherenceSection(snapshots, meds);

    // 3 of 4 overall = 75% — flagged.
    expect(section.stat).toEqual({ value: "75%", direction: "flag" });
    expect(section.body).toContain("Methylphenidate 10 mg — 2 of 2 taken (100%).");
    expect(section.body).toContain("Guanfacine 1 mg — 1 of 2 taken (50%).");
  });
});

// ---- timelineHighlightsSection --------------------------------------------

describe("timelineHighlightsSection", () => {
  it("handles the empty case", () => {
    const section = timelineHighlightsSection([]);

    expect(section.id).toBe("timeline_highlights");
    expect(section.body).toBe("0 events logged.");
    // Nothing flagged, zero events — surfaces the (zero) count as positive.
    expect(section.stat).toEqual({ value: "0", direction: "positive" });
    expectVoiceCompliant(section);
  });

  it("surfaces a positive event count when nothing is flagged", () => {
    const events = [
      makeEvent("e1", EventType.Taken, "2026-01-01T07:05:00Z"),
      makeEvent("e2", EventType.VoiceEntryTranscribed, "2026-01-01T09:00:00Z"),
      makeEvent("e3", EventType.Corrected, "2026-01-01T10:00:00Z"),
    ];

    const section = timelineHighlightsSection(events);

    // No missed/refused doses -> positive, value is the total event count.
    expect(section.stat).toEqual({ value: "3", direction: "positive" });
    expect(section.body).toContain("3 events logged.");
    expect(section.body).toContain("1 corrections applied to past entries.");
    expect(section.body).toContain("1 voice notes captured.");
    expectVoiceCompliant(section);
  });

  it("flags the count of missed and refused doses when present", () => {
    const events = [
      makeEvent("e1", EventType.Taken, "2026-01-01T07:05:00Z"),
      makeEvent("e2", EventType.Missed, "2026-01-02T07:05:00Z"),
      makeEvent("e3", EventType.Missed, "2026-01-03T07:05:00Z"),
      makeEvent("e4", EventType.Refused, "2026-01-04T07:05:00Z"),
    ];

    const section = timelineHighlightsSection(events);

    // 2 missed + 1 refused = 3 flagged.
    expect(section.stat).toEqual({ value: "3", direction: "flag" });
    expect(section.body).toContain("2 missed doses.");
    expect(section.body).toContain("1 refused doses.");
    expectVoiceCompliant(section);
  });
});

// ---- behaviorTagsSection --------------------------------------------------

describe("behaviorTagsSection", () => {
  it("handles the empty case with no stat", () => {
    const section = behaviorTagsSection([]);

    expect(section.id).toBe("behavior_tags");
    expect(section.body).toBe("No behavioral observations in this window.");
    expect(section.stat).toBeUndefined();
    expect(section.data).toEqual({ tags: [] });
    expectVoiceCompliant(section);
  });

  it("ignores non-behavior events", () => {
    const events = [
      makeEvent("e1", EventType.Taken, "2026-01-01T07:05:00Z"),
      makeEvent("e2", EventType.Missed, "2026-01-02T07:05:00Z"),
    ];

    const section = behaviorTagsSection(events);

    expect(section.body).toBe("No behavioral observations in this window.");
    expect(section.stat).toBeUndefined();
  });

  it("ranks tags and flags the most-observed one", () => {
    const events = [
      makeEvent("e1", EventType.BehaviorObserved, "2026-01-01T15:00:00Z", {
        tags: ["hyperfocus", "irritability"],
      }),
      makeEvent("e2", EventType.BehaviorObserved, "2026-01-02T15:00:00Z", {
        tags: ["irritability"],
      }),
      makeEvent("e3", EventType.BehaviorObserved, "2026-01-03T15:00:00Z", {
        tags: ["irritability", "hyperfocus"],
      }),
    ];

    const section = behaviorTagsSection(events);

    // irritability seen 3x, hyperfocus 2x — top tag is flagged.
    expect(section.stat).toEqual({ value: "irritability · 3", direction: "flag" });
    expect(section.body).toContain("irritability (3)");
    expect(section.body).toContain("hyperfocus (2)");
    expect((section.data?.tags as unknown[]).length).toBe(2);
    expectVoiceCompliant(section);
  });

  it("tolerates behavior events with a missing tags payload", () => {
    const events = [makeEvent("e1", EventType.BehaviorObserved, "2026-01-01T15:00:00Z", {})];

    const section = behaviorTagsSection(events);

    expect(section.body).toBe("No behavioral observations in this window.");
    expect(section.stat).toBeUndefined();
  });
});
