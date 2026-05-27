import { adherenceRate, projectDoseStatus } from "@navigator/schema";
import { adherenceSection, behaviorTagsSection, timelineHighlightsSection } from "./sections.js";
import type { Report, ReportInput } from "./types.js";

/**
 * Generate a structured 90-day report from a child's event window.
 * Pure — no I/O, no clock side effects (caller passes the range).
 */
export function generateReport(input: ReportInput): Report {
  const { child, medications, events, rangeStart, rangeEnd } = input;

  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  );

  const snapshots = projectDoseStatus(sortedEvents);
  const adherence = adherenceRate(snapshots);

  const daysCovered = Math.max(
    1,
    Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)),
  );

  return {
    generatedAt: new Date().toISOString(),
    rangeStart: rangeStart.toISOString(),
    rangeEnd: rangeEnd.toISOString(),
    child: {
      preferredName: child.preferredName,
      diagnosesNotes: child.diagnosesNotes ?? null,
    },
    highlights: {
      adherenceRate: adherence,
      daysCovered,
      eventsLogged: sortedEvents.length,
      medicationsTracked: medications.filter((m) => m.active).length,
    },
    sections: [
      adherenceSection(snapshots, medications),
      timelineHighlightsSection(sortedEvents),
      behaviorTagsSection(sortedEvents),
    ],
  };
}
