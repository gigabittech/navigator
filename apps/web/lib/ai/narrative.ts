"use client";

import { type Report, toPseudonymizedReport } from "@navigator/report";
import { isSupabaseConfigured } from "../config.js";
import { createBrowserClient } from "../auth/supabase.js";

/** Thrown when the AI summary can't run because no backend is configured. */
export class NarrativeUnavailableError extends Error {}

export function isNarrativeAvailable(): boolean {
  return isSupabaseConfigured();
}

/** The child identifiers needed to authorize and pseudonymize the request. */
export interface NarrativeChild {
  /** UUID — for the server-side access check only, never in the prompt. */
  id: string;
  dateOfBirth: string | null;
  diagnosesNotes: string | null;
}

/**
 * Ask the Claude-backed Edge Function for a clinician-fluent summary of a
 * structured report. In local mode (no Supabase) this throws
 * NarrativeUnavailableError so the UI can show a calm "needs setup" state.
 *
 * Compliance: the report is PSEUDONYMIZED before it leaves the device — the
 * child's name, date of birth, and free-text diagnosis notes are dropped and
 * replaced with an age range + a controlled diagnosis category (HIPAA
 * minimum-necessary). Only the UUID childId is sent, for the access check.
 */
export async function generateNarrative(report: Report, child: NarrativeChild): Promise<string> {
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

  const pseudo = toPseudonymizedReport(
    report,
    { dateOfBirth: child.dateOfBirth, diagnosesNotes: child.diagnosesNotes },
    new Date(),
  );

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const res = await fetch(`${base}/functions/v1/generate_narrative`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ report: pseudo, childId: child.id }),
  });

  if (!res.ok) {
    throw new Error(`The summary service returned ${res.status}.`);
  }
  const data = (await res.json()) as { narrative?: string };
  if (!data.narrative) throw new Error("The summary came back empty.");
  return data.narrative;
}
