import { describe, expect, it } from "vitest";
import { EventType } from "@navigator/schema";
import { generateReport } from "../src/generate.js";

const baseEvent = {
  loggedBy: "00000000-0000-0000-0000-000000000001",
  recordedAt: new Date("2026-01-01T08:00:00Z"),
  clientId: "test-device",
  sequenceNum: 1n,
};

describe("generateReport", () => {
  it("returns zero adherence when there are no events", () => {
    const report = generateReport({
      child: { id: "c1", preferredName: "Wren", dateOfBirth: null, diagnosesNotes: null },
      medications: [],
      events: [],
      rangeStart: new Date("2026-01-01"),
      rangeEnd: new Date("2026-03-31"),
    });

    expect(report.highlights.adherenceRate).toBe(0);
    expect(report.highlights.eventsLogged).toBe(0);
    expect(report.sections).toHaveLength(3);

    // With no data, sections derive no stat rather than inventing one.
    const adherence = report.sections.find((s) => s.id === "adherence");
    expect(adherence?.stat).toBeUndefined();
    const behavior = report.sections.find((s) => s.id === "behavior_tags");
    expect(behavior?.stat).toBeUndefined();
  });

  it("counts a single taken dose as 100% adherence", () => {
    const report = generateReport({
      child: { id: "c1", preferredName: "Wren", dateOfBirth: null, diagnosesNotes: null },
      medications: [
        {
          id: "m1",
          childId: "c1",
          name: "Methylphenidate",
          doseMg: "10" as unknown as never,
          category: "stimulant",
          scheduledTimes: ["07:00"],
          active: true,
          startedOn: null,
          stoppedOn: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      events: [
        {
          ...baseEvent,
          id: "e1",
          childId: "c1",
          eventType: EventType.Taken,
          payload: { medication_id: "m1", scheduled_for: "2026-01-01T07:00:00Z", dose_mg: 10 },
          occurredAt: new Date("2026-01-01T07:05:00Z"),
        } as never,
      ],
      rangeStart: new Date("2026-01-01"),
      rangeEnd: new Date("2026-01-02"),
    });

    expect(report.highlights.adherenceRate).toBe(100);
    expect(report.highlights.eventsLogged).toBe(1);

    // Adherence section exposes a typed, data-derived stat — not scraped prose.
    const adherence = report.sections.find((s) => s.id === "adherence");
    expect(adherence?.stat).toEqual({ value: "100%", direction: "positive" });

    // A single taken dose with nothing flagged surfaces the event count.
    const timeline = report.sections.find((s) => s.id === "timeline_highlights");
    expect(timeline?.stat).toEqual({ value: "1", direction: "positive" });
  });
});
