"use server";

import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { createServerSupabase } from "@/lib/auth/supabase-server";
import { isSupabaseConfigured } from "@/lib/config";

export interface AuthResult {
  ok: boolean;
  message: string;
  /** When ok, advance the form to the code-entry stage. */
  stage?: "code";
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Send a passwordless 6-digit code to the email.
 *
 * Preferred path: mint the code with the Supabase admin API and deliver it
 * through Resend ourselves — Supabase's built-in mailer is capped at a couple
 * of emails per hour, which is unusable for real sign-ins. This is the
 * Supabase-documented "custom email" pattern (generateLink + your own sender).
 * Falls back to Supabase's mailer when Resend isn't configured (local dev).
 */
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

  const resendKey = process.env.RESEND_API_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (resendKey && serviceKey) {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
      auth: { persistSession: false },
    });
    // Creates the user on first sign-in (the handle_new_user trigger then
    // creates their profile row) — sign-up and sign-in are the same door.
    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    const code = data?.properties?.email_otp;
    if (error || !code) {
      return { ok: false, message: "Couldn't send the code. Try again in a moment." };
    }

    try {
      const resend = new Resend(resendKey);
      const { error: sendError } = await resend.emails.send({
        from:
          process.env.WAITLIST_FROM ??
          process.env.RESEND_FROM ??
          "Navigator <onboarding@resend.dev>",
        to: email,
        subject: "Your Navigator sign-in code",
        // Email clients can't resolve CSS custom properties, so the design
        // tokens are inlined as literals here — the one place raw hex is the
        // correct tool. Values mirror --fg-1 / --fg-3 from tokens.css.
        /* eslint-disable no-restricted-syntax */
        html: [
          `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:420px;margin:0 auto;padding:24px 0;color:#0F172A">`,
          `<p style="font-size:15px;margin:0 0 16px">Here is your sign-in code:</p>`,
          `<p style="font-size:34px;font-weight:700;letter-spacing:8px;margin:0 0 16px">${code}</p>`,
          `<p style="font-size:13px;color:#64748B;margin:0">It expires in an hour. If you didn&rsquo;t request it, you can ignore this email.</p>`,
          `</div>`,
        ].join(""),
        /* eslint-enable no-restricted-syntax */
        text: `Your Navigator sign-in code: ${code}\nIt expires in an hour. If you didn't request it, you can ignore this email.`,
      });
      if (sendError) {
        console.error("signin_email_send_failed", sendError.name);
        return { ok: false, message: "Couldn't send the code. Try again in a moment." };
      }
    } catch {
      return { ok: false, message: "Couldn't send the code. Try again in a moment." };
    }
    return { ok: true, stage: "code", message: "Check your email for a 6-digit code." };
  }

  // Fallback: Supabase's own mailer (fine for local development volumes).
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
  // "email" covers codes from signInWithOtp; "magiclink" covers codes minted
  // via generateLink (the Resend delivery path). Try both — only one matches.
  let { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) {
    ({ error } = await supabase.auth.verifyOtp({ email, token, type: "magiclink" }));
  }
  if (error) {
    return { ok: false, message: "That code didn't match. Check it and try again." };
  }
  redirect("/today");
}
