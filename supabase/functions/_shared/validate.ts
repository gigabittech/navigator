// Shared request validation for Edge Functions.
//
// The compliance framework requires validation on every API boundary. Each
// function parses its request body/form against a Zod schema and rejects
// anything malformed with a generic 400 — no internal detail leaks, and no
// unvalidated input reaches the AI calls or the database.

import { z } from "https://esm.sh/zod@3.23.8";

/** generate_narrative — a pseudonymized report + the child UUID. */
export const narrativeRequestSchema = z.object({
  childId: z.string().uuid(),
  report: z.object({
    rangeStart: z.string().min(1),
    rangeEnd: z.string().min(1),
    child: z
      .object({
        // Pseudonymized only: an age range + a controlled category. Names/DOB
        // must never appear — reject the request if they somehow do.
        ageRange: z.string().max(20),
        diagnosisCategory: z.string().max(40),
      })
      .strict(),
    highlights: z.record(z.unknown()).optional(),
    sections: z
      .array(z.object({ title: z.string(), body: z.string() }))
      .max(50),
  }),
});

/** transcribe_voice — multipart form: childId + an audio file. */
export const transcribeFieldsSchema = z.object({
  childId: z.string().uuid(),
});

export type NarrativeRequest = z.infer<typeof narrativeRequestSchema>;

/**
 * Parse a value against a schema. Returns { ok, data } or { ok:false } — the
 * caller turns a failure into a generic 400 without echoing Zod detail.
 */
export function parse<T>(
  schema: z.ZodType<T>,
  value: unknown,
): { ok: true; data: T } | { ok: false } {
  const r = schema.safeParse(value);
  return r.success ? { ok: true, data: r.data } : { ok: false };
}
