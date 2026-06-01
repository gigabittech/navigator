"use client";

import { isSupabaseConfigured } from "../config.js";
import { createBrowserClient } from "../auth/supabase.js";

/** Thrown when voice transcription can't run because no backend is configured. */
export class TranscribeUnavailableError extends Error {}

export function isTranscribeAvailable(): boolean {
  return isSupabaseConfigured();
}

/**
 * Send recorded audio to the Whisper-backed Edge Function and return the
 * transcript. The Edge Function authorizes the caller against `childId`, so it
 * needs the signed-in user's access token (not the anon key) and the child id.
 * In local mode (no Supabase) this throws so the UI can show a calm
 * "needs setup" state.
 */
export async function transcribeAudio(audio: Blob, childId: string): Promise<string> {
  if (!isSupabaseConfigured()) {
    throw new TranscribeUnavailableError(
      "Voice notes need a backend connection. They're off in local mode.",
    );
  }

  const {
    data: { session },
  } = await createBrowserClient().auth.getSession();
  if (!session) {
    throw new TranscribeUnavailableError(
      "Voice notes need you to be signed in. They're off in local mode.",
    );
  }

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const form = new FormData();
  form.append("file", audio, "audio.webm");
  form.append("childId", childId);

  const res = await fetch(`${base}/functions/v1/transcribe_voice`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: form,
  });

  if (!res.ok) throw new Error(`Transcription returned ${res.status}.`);
  const data = (await res.json()) as { transcript?: string };
  return data.transcript ?? "";
}
