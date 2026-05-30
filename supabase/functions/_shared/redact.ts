// PII redaction for Edge Function logging — Deno port of
// apps/web/lib/log/redact.ts. Navigator must never log child names, dose
// values, observations, transcripts, or report contents.
//
// Rule of thumb: log shapes, statuses, and counts — never contents.

const SENSITIVE_KEYS = new Set([
  "preferred_name",
  "preferredName",
  "full_name",
  "fullName",
  "diagnoses_notes",
  "diagnosesNotes",
  "note",
  "parent_note",
  "transcript",
  "narrative",
  "report",
  "sections",
  "body",
  "reason",
  "email",
  "dose_mg",
  "doseMg",
  "payload",
  "tags",
]);

/** Replace a string with a length-preserving placeholder. */
export function redactString(value: string): string {
  if (value.length === 0) return value;
  return `[redacted:${value.length}]`;
}

/**
 * Deep-redact a value for safe logging. Sensitive keys are masked; ids,
 * statuses, event types, and counts are preserved so logs stay useful.
 */
export function redact<T>(value: T): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map((v) => redact(v));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key)) {
        out[key] = typeof val === "string" ? redactString(val) : "[redacted]";
      } else {
        out[key] = redact(val);
      }
    }
    return out;
  }
  return value;
}
