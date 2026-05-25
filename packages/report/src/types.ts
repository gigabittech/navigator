import type { LogEvent, Child, Medication } from "@navigator/schema";

export interface ReportInput {
  child: Pick<Child, "id" | "preferredName" | "dateOfBirth" | "diagnosesNotes">;
  medications: Medication[];
  events: LogEvent[];
  /** Inclusive window covered by the report. */
  rangeStart: Date;
  rangeEnd: Date;
}

export interface ReportSection {
  id: string;
  title: string;
  /** Plain-text body, paragraph-broken. Renderers wrap as appropriate. */
  body: string;
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
