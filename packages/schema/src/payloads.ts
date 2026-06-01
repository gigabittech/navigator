/**
 * Zod payload schemas for log_events. Every mutation validates its payload
 * here before writing, so a malformed event never reaches the append-only
 * store (where it could not be fixed in place).
 *
 * Event types without a specific schema fall back to a permissive object
 * shape — they are still recorded, just not strictly validated yet.
 */

import { z } from "zod";
import { EventType, type EventTypeName } from "./event-types.js";

const isoString = z.string().min(1);

export const doseOutcomeSchema = z.object({
  medication_id: z.string().uuid(),
  scheduled_for: isoString,
  dose_mg: z.number().nonnegative(),
  minutes_offset: z.number().optional(),
});

export const doseMissedSchema = z.object({
  medication_id: z.string().uuid(),
  scheduled_for: isoString,
  reason: z.string().optional(),
});

export const doseRefusedSchema = z.object({
  medication_id: z.string().uuid(),
  scheduled_for: isoString,
  reason: z.string().optional(),
  parent_note: z.string().optional(),
});

export const doseCorrectedSchema = z.object({
  corrects_event_id: z.string().uuid(),
  new_status: z.enum(["taken", "missed", "refused", "late", "vomited"]),
  reason: z.string().optional(),
});

export const behaviorObservedSchema = z.object({
  tags: z.array(z.string()).min(1),
  note: z.string().optional(),
  context: z.enum(["home", "school", "other"]).optional(),
});

export const voiceEntrySchema = z.object({
  transcript: z.string().min(1),
  audio_blob_path: z.string().optional(),
  whisper_model: z.string().optional(),
  duration_seconds: z.number().nonnegative(),
});

const fallbackSchema = z.record(z.unknown());

const schemaByType: Partial<Record<EventTypeName, z.ZodTypeAny>> = {
  [EventType.Taken]: doseOutcomeSchema,
  [EventType.Late]: doseOutcomeSchema,
  [EventType.Vomited]: doseOutcomeSchema,
  [EventType.Missed]: doseMissedSchema,
  [EventType.Refused]: doseRefusedSchema,
  [EventType.Corrected]: doseCorrectedSchema,
  [EventType.BehaviorObserved]: behaviorObservedSchema,
  [EventType.VoiceEntryTranscribed]: voiceEntrySchema,
};

/**
 * Validate (and normalize) an event payload for a given event type. Throws a
 * ZodError if the payload is malformed. Returns the parsed payload object.
 */
export function validateEventPayload(
  eventType: string,
  data: unknown,
): Record<string, unknown> {
  const schema = schemaByType[eventType as EventTypeName] ?? fallbackSchema;
  return schema.parse(data) as Record<string, unknown>;
}
