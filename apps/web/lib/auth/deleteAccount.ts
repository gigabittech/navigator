"use client";

import { isSupabaseConfigured } from "../config.js";
import { createBrowserClient } from "./supabase.js";

/**
 * Delete the user's account (HIPAA right to delete).
 *
 * When a backend is configured: calls the delete_account Edge Function, which
 * removes all server-side PHI (children + cascades + profile + auth user) while
 * preserving the audit log. On success, the caller clears local data and signs
 * out. In local-only mode there is no server account — the caller just clears
 * the on-device database.
 *
 * Returns true when the server deletion succeeded (or wasn't needed), false on
 * a server error so the UI can keep the local data rather than orphan it.
 */
export async function deleteServerAccount(): Promise<boolean> {
  if (!isSupabaseConfigured()) return true; // local-only: nothing on the server

  const supabase = createBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return true; // not signed in: nothing to delete server-side

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  try {
    const res = await fetch(`${base}/functions/v1/delete_account`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) return false;
    await supabase.auth.signOut();
    return true;
  } catch {
    return false;
  }
}
