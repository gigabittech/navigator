"use client";

import type { Report } from "@navigator/report";
import { isSupabaseConfigured } from "../config.js";

/** Thrown when the AI summary can't run because no backend is configured. */
export class NarrativeUnavailableError extends Error {}

export function isNarrativeAvailable(): boolean {
  return isSupabaseConfigured();
}

/**
 * Ask the Claude-backed Edge Function for a clinician-fluent summary of a
 * structured report. In local mode (no Supabase) this throws
 * NarrativeUnavailableError so the UI can show a calm "needs setup" state.
 */
export async function generateNarrative(report: Report): Promise<string> {
  if (!isSupabaseConfigured()) {
    throw new NarrativeUnavailableError(
      "The AI summary needs a backend connection. It's off in local mode.",
    );
  }

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const res = await fetch(`${base}/functions/v1/generate_narrative`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
    },
    body: JSON.stringify({ report }),
  });

  if (!res.ok) {
    throw new Error(`The summary service returned ${res.status}.`);
  }
  const data = (await res.json()) as { narrative?: string };
  if (!data.narrative) throw new Error("The summary came back empty.");
  return data.narrative;
}
