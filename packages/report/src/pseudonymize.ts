/**
 * Pseudonymize a report for the AI narrative path.
 *
 * The clinical-grade report shown on-device and in the PDF legitimately carries
 * the child's name and the parent's own notes. The AI narrative path does NOT:
 * per the compliance framework (HIPAA minimum-necessary, "pseudonymized, not
 * de-identified"), the payload that leaves the server boundary to Claude must be
 * stripped to the minimum necessary — an age RANGE, a diagnosis CATEGORY (a
 * controlled value, never the parent's free text), and the structured sections.
 * The child's name, date of birth, and free-text diagnosis notes are dropped.
 *
 * The UUID childId is carried separately (for the server-side access check) and
 * is never part of the prompt content.
 */

import type { Report } from "./types.js";

/** Controlled diagnosis categories — the only values that may reach the AI. */
export type DiagnosisCategory =
  | "adhd"
  | "mood"
  | "anxiety"
  | "autism_spectrum"
  | "other"
  | "unspecified";

/** Coarse age bands — never an exact age or DOB. */
export type AgeRange =
  | "under 4"
  | "4–7"
  | "8–10"
  | "11–13"
  | "14–17"
  | "18+"
  | "unspecified";

/**
 * The minimum-necessary report shape sent to the AI. No name, no DOB, no
 * free-text notes — only a coarse age band, a controlled diagnosis category,
 * and the (already PII-free) structured sections + highlights.
 */
export interface PseudonymizedReport {
  rangeStart: string;
  rangeEnd: string;
  child: {
    ageRange: AgeRange;
    diagnosisCategory: DiagnosisCategory;
  };
  highlights: Report["highlights"];
  sections: Array<{ title: string; body: string }>;
}

/** Map a date-of-birth (or ISO date string) to a coarse age band. */
export function toAgeRange(
  dateOfBirth: string | null | undefined,
  now: Date,
): AgeRange {
  if (!dateOfBirth) return "unspecified";
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return "unspecified";
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  if (age < 4) return "under 4";
  if (age <= 7) return "4–7";
  if (age <= 10) return "8–10";
  if (age <= 13) return "11–13";
  if (age <= 17) return "14–17";
  return "18+";
}

/**
 * Classify free-text diagnosis notes into a controlled category by keyword.
 * The parent's free text is NEVER returned — only one of the fixed categories,
 * defaulting to "unspecified" when nothing matches. This is the guard that keeps
 * arbitrary free text from reaching the AI payload.
 */
export function toDiagnosisCategory(
  notes: string | null | undefined,
): DiagnosisCategory {
  if (!notes) return "unspecified";
  const t = notes.toLowerCase();
  if (/\badhd\b|attention|hyperactiv/.test(t)) return "adhd";
  if (/bipolar|mood|depress|dmdd/.test(t)) return "mood";
  if (/anxiety|anxious|ocd|panic/.test(t)) return "anxiety";
  if (/autism|asd|spectrum|asperger/.test(t)) return "autism_spectrum";
  return "other";
}

/**
 * Produce the minimum-necessary report for the AI path. `child.preferredName`,
 * `child.dateOfBirth`, and `child.diagnosesNotes` are intentionally not read
 * into the output — they cannot leak through this transform.
 */
export function toPseudonymizedReport(
  report: Report,
  source: { dateOfBirth?: string | null; diagnosesNotes?: string | null },
  now: Date,
): PseudonymizedReport {
  return {
    rangeStart: report.rangeStart,
    rangeEnd: report.rangeEnd,
    child: {
      ageRange: toAgeRange(source.dateOfBirth, now),
      diagnosisCategory: toDiagnosisCategory(source.diagnosesNotes),
    },
    highlights: report.highlights,
    // Section bodies are derived from counts/tags/percentages — already free of
    // identifiers — so they pass through. Only title + body are sent.
    sections: report.sections.map((s) => ({ title: s.title, body: s.body })),
  };
}
