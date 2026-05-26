"use server";

import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

export interface WaitlistResult {
  ok: boolean;
  message: string;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Returns a Supabase admin client that bypasses RLS.
 * Returns null when Supabase isn't configured (local dev mode).
 * The service role key MUST NOT appear in NEXT_PUBLIC_* vars.
 */
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || url.includes("placeholder") || url.includes("your-project")) {
    return null;
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

/**
 * Waitlist signup. Persists the email to `waitlist_entries` (if Supabase is
 * configured) then sends a confirmation email via Resend.
 *
 * In local mode (no Supabase, no Resend) the action still returns success so
 * the marketing flow works end-to-end without any backend services.
 *
 * PII is never logged.
 */
export async function joinWaitlist(formData: FormData): Promise<WaitlistResult> {
  const email = String(formData.get("email") ?? "").trim();
  const context = String(formData.get("context") ?? "").trim();
  const source = String(formData.get("source") ?? "homepage").trim();

  if (!EMAIL_RE.test(email)) {
    return { ok: false, message: "Enter a valid email address." };
  }

  // ── 1. Persist to database ───────────────────────────────────────────────
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { error } = await supabase
        .from("waitlist_entries")
        .insert({ email, source: source || "homepage" });

      if (error) {
        // code 23505 = unique_violation — email already registered
        if (error.code === "23505") {
          return {
            ok: true,
            message: "You're already on the list. We'll email you when it's your turn.",
          };
        }
        // Any other DB error — still allow the flow to continue so we can send
        // the confirmation email. Log to stderr without PII.
        console.error("[waitlist] db insert failed:", error.code, error.message);
      }
    } catch {
      // Network or unexpected error — don't block the user.
      console.error("[waitlist] unexpected db error");
    }
  }

  // ── 2. Send confirmation email via Resend ────────────────────────────────
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    try {
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from: process.env.WAITLIST_FROM ?? "Navigator <onboarding@resend.dev>",
        to: email,
        subject: "You're on the Navigator waitlist",
        html: `<p>You're on the list. We'll send one note when it's your turn — nothing else.</p>${
          context ? `<p style="color:#64748B">You told us: ${escapeHtml(context)}</p>` : ""
        }`,
      });
    } catch {
      // Don't fail the signup if email delivery hiccups — they're still counted.
    }
  }

  return {
    ok: true,
    message: "You're on the list. We'll email you when it's your turn.",
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
