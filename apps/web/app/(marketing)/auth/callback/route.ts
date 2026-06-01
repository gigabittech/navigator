import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/auth/supabase-server";
import { isSupabaseConfigured } from "@/lib/config";

/**
 * Validate the post-login redirect target. To prevent open redirects we only
 * accept same-origin *relative* paths: a single leading slash, no scheme, no
 * protocol-relative `//host`, no backslash tricks. Anything else falls back to
 * the default landing page.
 */
function safeNext(raw: string | null): string {
  const fallback = "/today";
  if (!raw) return fallback;
  // Must be a relative path rooted at "/", but not "//" or "/\" (which
  // browsers can treat as protocol-relative → another origin).
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  // Reject any embedded scheme or control characters.
  if (/[\x00-\x1f]/.test(raw) || raw.includes("\\")) return fallback;
  return raw;
}

/**
 * Magic-link callback. Supabase redirects here with a `code` to exchange for a
 * session. On success we land the user on Today. (The OTP code flow doesn't
 * need this route, but magic links do.)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code && isSupabaseConfigured()) {
    const supabase = createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/sign-in`);
}
