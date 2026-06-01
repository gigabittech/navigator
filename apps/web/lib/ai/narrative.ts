"use client";

import type { Report } from "@navigator/report";
import { isSupabaseConfigured } from "../config.js";
import { createBrowserClient } from "../auth/supabase.js";

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
export async function generateNarrative(report: Report, childId: string): Promise<string> {
  if (!isSupabaseConfigured()) {
    throw new NarrativeUnavailableError(
      "The AI summary needs a backend connection. It's off in local mode.",
    );
  }

  // The Edge Function authorizes the caller against the child, so it needs the
  // signed-in user's access token (not the anon key) and the child id.
  const {
    data: { session },
  } = await createBrowserClient().auth.getSession();
  if (!session) {
    throw new NarrativeUnavailableError(
      "The AI summary needs you to be signed in. It's off in local mode.",
    );
  }

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const res = await fetch(`${base}/functions/v1/generate_narrative`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ report, childId }),
  });

  if (!res.ok) {
    throw new Error(`The summary service returned ${res.status}.`);
  }
  const data = (await res.json()) as { narrative?: string };
  if (!data.narrative) throw new Error("The summary came back empty.");
  return data.narrative;
}
