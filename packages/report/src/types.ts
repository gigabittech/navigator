import type { LogEvent, Child, Medication } from "@navigator/schema";

export interface ReportInput {
  child: Pick<Child, "id" | "preferredName" | "dateOfBirth" | "diagnosesNotes">;
  medications: Medication[];
  events: LogEvent[];
  /** Inclusive window covered by the report. */
  rangeStart: Date;
  rangeEnd: Date;
}

/**
 * A headline figure a renderer can surface beside the section body, computed
 * from the section's own data — never scraped back out of the prose. `direction`
 * tells the renderer how to frame it: `positive` for an at-a-glance good signal
 * (e.g. adherence), `flag` for something worth a clinician's attention.
 */
export interface ReportSectionStat {
  /** Short display value, e.g. "92%", "3", "wear-off". */
  value: string;
  direction: "positive" | "flag";
}

export interface ReportSection {
  id: string;
  title: string;
  /** Plain-text body, paragraph-broken. Renderers wrap as appropriate. */
  body: string;
  /**
   * Optional headline figure derived from this section's data. Additive: older
   * renderers ignore it. When absent, a renderer should show no stat rather
   * than invent one.
   */
  stat?: ReportSectionStat;
  /** Optional structured data (tables, charts). Renderers may use or skip. */
  data?: Record<string, unknown>;
}

export interface Report {
  generatedAt: string;
  rangeStart: string;
  rangeEnd: string;
  child: {
    preferredName: string;
    diagnosesNotes: string | null;
  };
  /** Quick at-a-glance numbers, all integers or short strings. */
  highlights: {
    adherenceRate: number; // %
    daysCovered: number;
    eventsLogged: number;
    medicationsTracked: number;
  };
  sections: ReportSection[];
  /** Set by the Claude pipeline downstream; the generator leaves it blank. */
  narrative?: string;
}
