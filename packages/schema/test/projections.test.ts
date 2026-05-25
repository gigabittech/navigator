import { describe, expect, it } from "vitest";
import { EventType } from "../src/event-types.js";
import { adherenceRate, projectDoseStatus } from "../src/projections.js";
import type { LogEvent } from "../src/log-events.js";

const MED = "11111111-1111-1111-1111-111111111111";

function ev(id: string, eventType: string, payload: Record<string, unknown>): LogEvent {
  return { id, eventType, payload } as unknown as LogEvent;
}

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
});

describe("adherenceRate", () => {
  it("returns 0 with no snapshots", () => {
    expect(adherenceRate([])).toBe(0);
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
});
