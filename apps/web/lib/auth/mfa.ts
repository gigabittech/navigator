"use client";

import { isSupabaseConfigured } from "../config.js";
import { createBrowserClient } from "./supabase.js";

/**
 * Optional TOTP two-factor auth, on top of the passwordless flow.
 *
 * Wraps Supabase Auth's built-in MFA (auth.mfa.*). This is a scaffold: the API
 * calls are real, but TOTP must be enabled in the Supabase project's Auth
 * settings for enrollment to succeed. Gated on isSupabaseConfigured() so the
 * Settings UI shows a calm "not available in local mode" state otherwise.
 */

export interface EnrollResult {
  factorId: string;
  /** otpauth:// URI to render as a QR code in an authenticator app. */
  qrCodeUri: string;
  secret: string;
}

/** True when MFA can be offered (a backend is configured). */
export function isMfaConfigured(): boolean {
  return isSupabaseConfigured();
}

/** Begin TOTP enrollment — returns a QR/secret to show the user. */
export async function enrollTotp(): Promise<EnrollResult> {
  const supabase = createBrowserClient();
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
  if (error || !data) throw new Error(error?.message ?? "Couldn't start setup.");
  return {
    factorId: data.id,
    qrCodeUri: data.totp.uri,
    secret: data.totp.secret,
  };
}

/** Verify the 6-digit code to activate the factor. */
export async function verifyTotp(factorId: string, code: string): Promise<void> {
  const supabase = createBrowserClient();
  const challenge = await supabase.auth.mfa.challenge({ factorId });
  if (challenge.error || !challenge.data) {
    throw new Error(challenge.error?.message ?? "Couldn't verify that code.");
  }
  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.data.id,
    code,
  });
  if (error) throw new Error("That code didn't match. Try again.");
}

/** Whether the user currently has an active (verified) TOTP factor. */
export async function hasActiveTotp(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const supabase = createBrowserClient();
  const { data } = await supabase.auth.mfa.listFactors();
  return (data?.totp ?? []).some((f) => f.status === "verified");
}

/** Remove a TOTP factor. */
export async function unenrollTotp(factorId: string): Promise<void> {
  const supabase = createBrowserClient();
  await supabase.auth.mfa.unenroll({ factorId });
}
