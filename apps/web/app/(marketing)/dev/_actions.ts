"use server";

import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/auth/supabase-server";

/**
 * Dev backdoor: single-click sign-in for development and demos.
 *
 * The marketing site only exposes "Join the waitlist" — there is no public way
 * into the authenticated app. This Server Action mints a real Supabase session
 * for a fixed dev identity WITHOUT the OTP email round-trip, so the team can
 * reach the wired-up backend (today / report / sync / AI). The resulting session
 * is a normal authenticated session: middleware, RLS, and the Edge Functions all
 * trust it with no special-casing.
 *
 * FAIL-CLOSED. It does nothing unless DEV_LOGIN_ENABLED === "true" and the posted
 * secret matches DEV_LOGIN_SECRET. In real production those env vars are unset,
 * so this action returns an error and /dev 404s — the door doesn't exist.
 *
 * All three vars are SERVER-ONLY (never NEXT_PUBLIC).
 */

/** Constant-time string compare so the secret check can't be timed. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Server Action for the /dev form. Returns void (redirects on every path) so it
 * satisfies React's <form action> contract: success → /today, any failure →
 * /dev?error=<code> (the page renders a calm message). Failure codes are
 * deliberately coarse so a wrong secret can't be distinguished from "disabled".
 *
 * A "use server" module may only export async functions, so the enabled-flag
 * check is inlined here and also read directly in page.tsx (it's a one-liner).
 */
export async function devLogin(formData: FormData): Promise<void> {
  if (process.env.DEV_LOGIN_ENABLED !== "true") redirect("/dev?error=denied");

  const secret = process.env.DEV_LOGIN_SECRET ?? "";
  const provided = String(formData.get("secret") ?? "");
  if (!secret || !safeEqual(secret, provided)) redirect("/dev?error=denied");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const devEmail = process.env.DEV_LOGIN_EMAIL;
  if (!url || !serviceKey || !devEmail) redirect("/dev?error=config");

  // 1. Service-role: generate a magic-link token for the dev user. This
  //    auto-creates the user (and, via the handle_new_user trigger, its profile)
  //    if absent — self-bootstrapping on a fresh project.
  const admin = createClient(url!, serviceKey!, { auth: { persistSession: false } });
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: devEmail!,
  });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) redirect("/dev?error=session");

  // 2. Cookie-bound client: verify the token to set the session cookie on this
  //    response — no inbox, no redirect dance. One server round-trip.
  const supabase = createServerSupabase();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: tokenHash!,
    type: "magiclink",
  });
  if (verifyError) redirect("/dev?error=session");

  redirect("/today");
}
