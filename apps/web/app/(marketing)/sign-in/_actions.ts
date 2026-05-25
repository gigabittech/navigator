"use server";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/auth/supabase";
import { isSupabaseConfigured } from "@/lib/config";

export interface AuthResult {
  ok: boolean;
  message: string;
  /** When ok, advance the form to the code-entry stage. */
  stage?: "code";
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Send a passwordless 6-digit code (and magic link) to the email. */
export async function requestCode(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  if (!EMAIL_RE.test(email)) {
    return { ok: false, message: "Enter a valid email address." };
  }
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: "Sign-in isn't set up yet. The app runs in local mode without an account.",
    };
  }

  const supabase = createServerSupabase();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) {
    return { ok: false, message: "Couldn't send the code. Try again in a moment." };
  }
  return { ok: true, stage: "code", message: "Check your email for a 6-digit code." };
}

/** Verify the code and start a session, then land on Today. */
export async function verifyCode(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const token = String(formData.get("token") ?? "").trim();
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Sign-in isn't set up yet." };
  }
  if (token.length < 6) {
    return { ok: false, message: "Enter the 6-digit code from your email." };
  }

  const supabase = createServerSupabase();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) {
    return { ok: false, message: "That code didn't match. Check it and try again." };
  }
  redirect("/today");
}
