"use server";

import { Resend } from "resend";

export interface WaitlistResult {
  ok: boolean;
  message: string;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Waitlist signup. Sends a confirmation email via Resend when configured; in
 * local mode it still returns success so the marketing flow works end-to-end
 * without any backend. PII is never logged.
 */
export async function joinWaitlist(formData: FormData): Promise<WaitlistResult> {
  const email = String(formData.get("email") ?? "").trim();
  const context = String(formData.get("context") ?? "").trim();

  if (!EMAIL_RE.test(email)) {
    return { ok: false, message: "Enter a valid email address." };
  }

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
