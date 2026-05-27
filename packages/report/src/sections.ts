import type { LogEvent, Medication } from "@navigator/schema";
import { EventType, type DoseStatusSnapshot } from "@navigator/schema";
import type { ReportSection } from "./types.js";

export function adherenceSection(
  snapshots: DoseStatusSnapshot[],
  medications: Medication[],
): ReportSection {
  const byMed = new Map<string, DoseStatusSnapshot[]>();
  for (const s of snapshots) {
    const arr = byMed.get(s.medicationId) ?? [];
    arr.push(s);
    byMed.set(s.medicationId, arr);
  }

  const rows = medications.map((m) => {
    const list = byMed.get(m.id) ?? [];
    const taken = list.filter((s) => s.status === "taken").length;
    const total = list.length;
    return {
      name: m.name,
      doseMg: m.doseMg,
      taken,
      total,
      rate: total ? Math.round((taken / total) * 100) : 0,
    };
  });

  const body = rows.length
    ? rows
        .map((r) => `${r.name} ${r.doseMg} mg — ${r.taken} of ${r.total} taken (${r.rate}%).`)
        .join("\n")
    : "No medications tracked in this window.";

  return {
    id: "adherence",
    title: "Medication adherence",
    body,
    data: { rows },
  };
}

export function timelineHighlightsSection(events: LogEvent[]): ReportSection {
  const missed = events.filter((e) => e.eventType === EventType.Missed).length;
  const refused = events.filter((e) => e.eventType === EventType.Refused).length;
  const corrected = events.filter((e) => e.eventType === EventType.Corrected).length;
  const voice = events.filter((e) => e.eventType === EventType.VoiceEntryTranscribed).length;

  const body = [
    `${events.length} events logged.`,
    missed ? `${missed} missed doses.` : "",
    refused ? `${refused} refused doses.` : "",
    corrected ? `${corrected} corrections applied to past entries.` : "",
    voice ? `${voice} voice notes captured.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    id: "timeline_highlights",
    title: "Timeline highlights",
    body,
    data: { missed, refused, corrected, voice },
  };
}

export function behaviorTagsSection(events: LogEvent[]): ReportSection {
  const tagCounts = new Map<string, number>();
  for (const e of events) {
    if (e.eventType !== EventType.BehaviorObserved) continue;
    const payload = e.payload as { tags?: string[] };
    for (const tag of payload.tags ?? []) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  const sorted = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  const body = sorted.length
    ? `Most-observed tags: ${sorted.map(([t, n]) => `${t} (${n})`).join(", ")}.`
    : "No behavioral observations in this window.";

  return {
    id: "behavior_tags",
    title: "Behavioral patterns",
    body,
    data: { tags: sorted },
  };
}
