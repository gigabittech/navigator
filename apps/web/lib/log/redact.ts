/**
 * PII redaction. Navigator must never send child names, dose values, or
 * observations to analytics or error reporting. Run any value through these
 * helpers before it leaves the device boundary.
 *
 * The rule of thumb: log shapes and counts, never contents.
 */

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
 * Deep-redact an object for safe logging. Sensitive keys are masked; ids,
 * timestamps, event types, and counts are preserved so logs stay useful.
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

/** Mask an email to its domain — "a***@example.com". */
export function redactEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain || !local) return "[redacted]";
  return `${local.slice(0, 1)}***@${domain}`;
}
