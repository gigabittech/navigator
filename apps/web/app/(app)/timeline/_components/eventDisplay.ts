import { EventType } from "@navigator/schema/event-types";
import type { PillProps } from "@navigator/design-system/components";
import type { EventRow } from "@/lib/db/types";

export interface EventDisplay {
  title: string;
  detail?: string;
  tone: PillProps["tone"];
  /** Short status word shown as a pill, when one applies. */
  status?: string;
}

function num(payload: Record<string, unknown>, key: string): number | undefined {
  const v = payload[key];
  return typeof v === "number" ? v : undefined;
}

function str(payload: Record<string, unknown>, key: string): string | undefined {
  const v = payload[key];
  return typeof v === "string" ? v : undefined;
}

/**
 * Render a single event for the timeline, in Navigator's voice. `medName`
 * resolves a medication id to its display name.
 */
export function describeEvent(e: EventRow, medName: (id: string) => string): EventDisplay {
  const p = e.payload;
  const med = () => medName((p["medication_id"] as string) ?? "");
  const offset = num(p, "minutes_offset");

  switch (e.eventType) {
    case EventType.Taken: {
      const detail =
        offset && offset > 0
          ? `${offset}m late`
          : offset && offset < 0
            ? `${-offset}m early`
            : "On schedule";
      return { title: med(), status: "Taken", tone: "success", detail };
    }
    case EventType.Late:
      return { title: med(), status: "Late", tone: "warning", detail: offset ? `${offset}m late` : undefined };
    case EventType.Missed:
      return { title: med(), status: "Missed", tone: "danger", detail: str(p, "reason") };
    case EventType.Refused:
      return {
        title: med(),
        status: "Refused",
        tone: "danger",
        detail: str(p, "reason") ?? str(p, "parent_note"),
      };
    case EventType.Vomited:
      return { title: med(), status: "Brought back up", tone: "danger" };
    case EventType.Corrected:
      return {
        title: "Correction",
        status: str(p, "new_status"),
        tone: "neutral",
        detail: str(p, "reason"),
      };
    case EventType.BehaviorObserved: {
      const tags = Array.isArray(p["tags"]) ? (p["tags"] as string[]) : [];
      return {
        title: tags.length ? tags.join(" · ") : "Observation",
        tone: "info",
        detail: str(p, "note"),
      };
    }
    case EventType.VoiceEntryTranscribed:
      return { title: "Voice note", tone: "accent", detail: str(p, "transcript") };
    default:
      return { title: e.eventType, tone: "neutral" };
  }
}
