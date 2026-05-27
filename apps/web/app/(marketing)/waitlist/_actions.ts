"use server";

import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { redactEmail } from "@/lib/log/redact";

export interface WaitlistResult {
  ok: boolean;
  message: string;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PLACEHOLDERS = new Set([
  "",
  "eyJ...",
  "re_...",
  "re_xxxxxxxx",
  "your-service-role-key",
  "your-anon-key",
  "Navigator <hello@yourdomain.com>",
]);

interface WaitlistRuntimeConfig {
  supabaseUrl: string | null;
  serviceRoleKey: string | null;
  resendApiKey: string | null;
  sender: string | null;
  canPersist: boolean;
  canSendEmail: boolean;
  missingInProduction: string[];
}

function isProductionRuntime() {
  return process.env.NODE_ENV === "production";
}

function isRealEnv(value: string | undefined | null): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length === 0 || PLACEHOLDERS.has(trimmed)) return false;
  if (trimmed.includes("your-project") || trimmed.includes("placeholder")) return false;
  if (trimmed.includes("127.0.0.1") || trimmed.includes("localhost")) return false;
  return true;
}

function getWaitlistRuntimeConfig(): WaitlistRuntimeConfig {
  const supabaseUrl = isRealEnv(process.env.NEXT_PUBLIC_SUPABASE_URL)
    ? process.env.NEXT_PUBLIC_SUPABASE_URL
    : null;
  const serviceRoleKey = isRealEnv(process.env.SUPABASE_SERVICE_ROLE_KEY)
    ? process.env.SUPABASE_SERVICE_ROLE_KEY
    : null;
  const resendApiKey = isRealEnv(process.env.RESEND_API_KEY) ? process.env.RESEND_API_KEY : null;

  const rawSender = process.env.WAITLIST_FROM ?? process.env.RESEND_FROM;
  const sender =
    isRealEnv(rawSender) && rawSender !== "Navigator <onboarding@resend.dev>" ? rawSender : null;

  const missingInProduction: string[] = [];
  if (!supabaseUrl) missingInProduction.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceRoleKey) missingInProduction.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!resendApiKey) missingInProduction.push("RESEND_API_KEY");
  if (!sender) missingInProduction.push("WAITLIST_FROM|RESEND_FROM");

  return {
    supabaseUrl,
    serviceRoleKey,
    resendApiKey,
    sender,
    canPersist: Boolean(supabaseUrl && serviceRoleKey),
    canSendEmail: Boolean(resendApiKey && sender),
    missingInProduction,
  };
}

/**
 * Returns a Supabase admin client that bypasses RLS.
 * Returns null when Supabase isn't configured (local dev mode).
 * The service role key MUST NOT appear in NEXT_PUBLIC_* vars.
 */
function getSupabaseAdmin(config: WaitlistRuntimeConfig) {
  if (!config.canPersist) {
    return null;
  }
  return createClient(config.supabaseUrl!, config.serviceRoleKey!, {
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
  const runtime = getWaitlistRuntimeConfig();

  if (!EMAIL_RE.test(email)) {
    return { ok: false, message: "Enter a valid email address." };
  }

  if (isProductionRuntime() && runtime.missingInProduction.length > 0) {
    console.error("[waitlist] missing required production config:", runtime.missingInProduction);
    return {
      ok: false,
      message: "Waitlist signup is temporarily unavailable. Please try again shortly.",
    };
  }

  // ── 1. Persist to database ───────────────────────────────────────────────
  const supabase = getSupabaseAdmin(runtime);
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
        console.error("[waitlist] db insert failed:", {
          code: error.code,
          message: error.message,
          email: redactEmail(email),
          source: source || "homepage",
        });
        return {
          ok: false,
          message: "We couldn't save your spot right now. Please try again in a moment.",
        };
      }
    } catch (error) {
      console.error("[waitlist] unexpected db error:", {
        email: redactEmail(email),
        source: source || "homepage",
        error: error instanceof Error ? error.message : "unknown",
      });
      return {
        ok: false,
        message: "We couldn't save your spot right now. Please try again in a moment.",
      };
    }
  } else if (isProductionRuntime()) {
    return {
      ok: false,
      message: "Waitlist signup is temporarily unavailable. Please try again shortly.",
    };
  }

  // ── 2. Send confirmation email via Resend ────────────────────────────────
  if (runtime.canSendEmail) {
    try {
      const resend = new Resend(runtime.resendApiKey!);
      const { error } = await resend.emails.send({
        from: runtime.sender!,
        to: email,
        subject: "You're on the Navigator waitlist",
        html: `<p>You're on the list. We'll send one note when it's your turn — nothing else.</p>${
          context ? `<p style="color:#64748B">You told us: ${escapeHtml(context)}</p>` : ""
        }`,
      });
      if (error) {
        console.error("[waitlist] email send failed:", {
          code: error.name,
          message: error.message,
          email: redactEmail(email),
        });
        return {
          ok: true,
          message:
            "You're on the list, but we couldn't send the confirmation email yet. We'll still keep your spot.",
        };
      }
    } catch (error) {
      console.error("[waitlist] unexpected email error:", {
        email: redactEmail(email),
        error: error instanceof Error ? error.message : "unknown",
      });
      return {
        ok: true,
        message:
          "You're on the list, but we couldn't send the confirmation email yet. We'll still keep your spot.",
      };
    }
  } else if (isProductionRuntime()) {
    return {
      ok: true,
      message:
        "You're on the list, but confirmation email isn't configured yet. We'll still keep your spot.",
    };
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
