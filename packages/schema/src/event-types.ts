/**
 * All event types that may appear in the `log_events` table.
 *
 * Adding a new event type is a three-step change:
 *   1. Add the constant below.
 *   2. Extend the SQL `CHECK` constraint in a new migration.
 *   3. Handle the new type in `projections.ts`.
 *
 * Removing or renaming a type is a breaking schema change — never do this
 * to live data. Emit a corrective event instead.
 */

export const MedicationEventType = {
  Scheduled: "MedicationDoseScheduled",
  Taken: "MedicationDoseTaken",
  Missed: "MedicationDoseMissed",
  Refused: "MedicationDoseRefused",
  Late: "MedicationDoseLate",
  Vomited: "MedicationDoseVomited",
  Corrected: "MedicationDoseCorrected",
  Started: "MedicationStarted",
  Stopped: "MedicationStopped",
  Adjusted: "MedicationDoseAdjusted",
} as const;

export const BehaviorEventType = {
  BehaviorObserved: "BehaviorObserved",
  MoodLogged: "MoodLogged",
  EnergyLogged: "EnergyLogged",
  TriggerIdentified: "TriggerIdentified",
  VoiceEntryTranscribed: "VoiceEntryTranscribed",
} as const;

export const SchoolEventType = {
  IncidentLogged: "SchoolIncidentLogged",
  TeacherNoteReceived: "TeacherNoteReceived",
  IEPMeetingLogged: "IEPMeetingLogged",
} as const;

export const ObservationEventType = {
  WearOffWindowObserved: "WearOffWindowObserved",
  SideEffectObserved: "SideEffectObserved",
  SleepQualityLogged: "SleepQualityLogged",
  AppetiteLogged: "AppetiteLogged",
} as const;

export const EventType = {
  ...MedicationEventType,
  ...BehaviorEventType,
  ...SchoolEventType,
  ...ObservationEventType,
} as const;

export type EventTypeName = (typeof EventType)[keyof typeof EventType];

export const ALL_EVENT_TYPES = Object.values(EventType) as EventTypeName[];

// ---- Payload shapes -------------------------------------------------------
// Each event type has a typed payload. The DB stores them as JSONB; we
// validate on write with Zod (TODO — add zod schemas alongside).

export interface DoseTakenPayload {
  medication_id: string;
  scheduled_for: string; // ISO timestamp
  dose_mg: number;
  /** Minutes late from `scheduled_for`. Negative = early. */
  minutes_offset?: number;
}

export interface DoseMissedPayload {
  medication_id: string;
  scheduled_for: string;
  reason?: string;
}

export interface DoseRefusedPayload {
  medication_id: string;
  scheduled_for: string;
  reason?: string;
  parent_note?: string;
}

export interface DoseCorrectedPayload {
  /** The original log_event.id being corrected. */
  corrects_event_id: string;
  /** The new status the parent meant to record. */
  new_status: "taken" | "missed" | "refused" | "late" | "vomited";
  reason?: string;
}

export interface BehaviorObservedPayload {
  /** Short tag list — mood/trigger/behavior chips selected. */
  tags: string[];
  note?: string;
  /** Where the parent was when logging — for context, not surveillance. */
  context?: "home" | "school" | "other";
}

export interface VoiceEntryPayload {
  transcript: string;
  audio_blob_path?: string;
  whisper_model?: string;
  duration_seconds: number;
}

/** Discriminated union — extend as you add event types. */
export type EventPayload =
  | { type: typeof EventType.Taken; data: DoseTakenPayload }
  | { type: typeof EventType.Missed; data: DoseMissedPayload }
  | { type: typeof EventType.Refused; data: DoseRefusedPayload }
  | { type: typeof EventType.Corrected; data: DoseCorrectedPayload }
  | { type: typeof EventType.BehaviorObserved; data: BehaviorObservedPayload }
  | { type: typeof EventType.VoiceEntryTranscribed; data: VoiceEntryPayload };
