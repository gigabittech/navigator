import { describe, expect, it } from "vitest";
import {
  toAgeRange,
  toDiagnosisCategory,
  toPseudonymizedReport,
} from "../src/pseudonymize.js";
import type { Report } from "../src/types.js";

const NOW = new Date("2026-06-01T00:00:00Z");

function makeReport(overrides: Partial<Report> = {}): Report {
  return {
    generatedAt: NOW.toISOString(),
    rangeStart: "2026-03-01",
    rangeEnd: "2026-06-01",
    child: { preferredName: "Wren Aanderson", diagnosesNotes: "ADHD-C; mild anxiety" },
    highlights: { adherenceRate: 92, daysCovered: 90, eventsLogged: 120, medicationsTracked: 2 },
    sections: [
      { id: "adherence", title: "Medication adherence", body: "Methylphenidate ER 10 mg — 80 of 90 taken (89%)." },
    ],
    ...overrides,
  };
}

describe("toAgeRange", () => {
  it("maps a DOB to a coarse band, never an exact age", () => {
    expect(toAgeRange("2017-05-01", NOW)).toBe("8–10"); // turned 9
    expect(toAgeRange("2009-01-01", NOW)).toBe("14–17");
    expect(toAgeRange("2023-01-01", NOW)).toBe("under 4");
  });
  it("returns unspecified for missing/invalid input", () => {
    expect(toAgeRange(null, NOW)).toBe("unspecified");
    expect(toAgeRange("not-a-date", NOW)).toBe("unspecified");
  });
});

describe("toDiagnosisCategory", () => {
  it("classifies free text into a controlled category", () => {
    expect(toDiagnosisCategory("ADHD-C; mild anxiety")).toBe("adhd");
    expect(toDiagnosisCategory("Bipolar II, DMDD")).toBe("mood");
    expect(toDiagnosisCategory("generalized anxiety, OCD")).toBe("anxiety");
    expect(toDiagnosisCategory("autism spectrum disorder")).toBe("autism_spectrum");
    expect(toDiagnosisCategory("rare metabolic thing")).toBe("other");
  });
  it("returns unspecified for empty notes", () => {
    expect(toDiagnosisCategory(null)).toBe("unspecified");
    expect(toDiagnosisCategory("")).toBe("unspecified");
  });
});

describe("toPseudonymizedReport — no PHI leaks", () => {
  const report = makeReport();
  const pseudo = toPseudonymizedReport(
    report,
    { dateOfBirth: "2017-05-01", diagnosesNotes: "ADHD-C; mild anxiety" },
    NOW,
  );

  it("carries only an age range + controlled diagnosis category", () => {
    expect(pseudo.child).toEqual({ ageRange: "8–10", diagnosisCategory: "adhd" });
  });

  it("never includes the child's name, DOB, or free-text notes anywhere", () => {
    const serialized = JSON.stringify(pseudo);
    expect(serialized).not.toContain("Wren");
    expect(serialized).not.toContain("Aanderson");
    expect(serialized).not.toContain("2017-05-01");
    expect(serialized).not.toContain("mild anxiety"); // the raw free text
    // No 'preferredName' / 'dateOfBirth' / 'diagnosesNotes' keys survive.
    expect(serialized).not.toContain("preferredName");
    expect(serialized).not.toContain("dateOfBirth");
    expect(serialized).not.toContain("diagnosesNotes");
  });

  it("preserves the PII-free structured sections + highlights", () => {
    expect(pseudo.highlights).toEqual(report.highlights);
    expect(pseudo.sections).toEqual([
      { title: "Medication adherence", body: report.sections[0]!.body },
    ]);
  });
});
