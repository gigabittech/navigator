"use client";

import type { PGliteInterface } from "@electric-sql/pglite";
import { EventType } from "@navigator/schema/event-types";
import { getContext } from "./context.js";
import { insertEvent } from "./insert.js";

export interface LogVoiceInput {
  transcript: string;
  durationSeconds: number;
  audioPath?: string;
  whisperModel?: string;
  occurredAt?: Date;
}

/** Record a transcribed voice note as an event. */
export async function logVoiceEntry(
  db: PGliteInterface,
  input: LogVoiceInput,
): Promise<string> {
  const { childId, profileId } = await getContext(db);
  return insertEvent(db, {
    childId,
    loggedBy: profileId,
    eventType: EventType.VoiceEntryTranscribed,
    payload: {
      transcript: input.transcript,
      duration_seconds: input.durationSeconds,
      audio_blob_path: input.audioPath,
      whisper_model: input.whisperModel,
    },
    occurredAt: input.occurredAt,
  });
}
