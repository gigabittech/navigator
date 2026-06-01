import { describe, expect, it } from "vitest";
import { EventType } from "../src/event-types.js";
import { validateEventPayload } from "../src/payloads.js";

const MED = "11111111-1111-1111-1111-111111111111";

describe("validateEventPayload", () => {
  it("accepts a well-formed dose-taken payload", () => {
    const out = validateEventPayload(EventType.Taken, {
      medication_id: MED,
      scheduled_for: "2026-01-01T07:00:00Z",
      dose_mg: 10,
      minutes_offset: 4,
    });
    expect(out["medication_id"]).toBe(MED);
  });

  it("rejects a dose payload missing required fields", () => {
    expect(() => validateEventPayload(EventType.Taken, { dose_mg: 10 })).toThrow();
  });

  it("requires at least one tag for an observation", () => {
    expect(() => validateEventPayload(EventType.BehaviorObserved, { tags: [] })).toThrow();
    expect(validateEventPayload(EventType.BehaviorObserved, { tags: ["focused"] })).toBeTruthy();
  });

  it("passes unknown event types through the permissive fallback", () => {
    const out = validateEventPayload("SomeFutureEvent", { whatever: 1 });
    expect(out["whatever"]).toBe(1);
  });
});
