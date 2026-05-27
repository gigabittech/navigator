import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/auth/supabase";
import { isSupabaseConfigured } from "@/lib/config";

/**
 * Magic-link callback. Supabase redirects here with a `code` to exchange for a
 * session. On success we land the user on Today. (The OTP code flow doesn't
 * need this route, but magic links do.)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/today";

  if (code && isSupabaseConfigured()) {
    const supabase = createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/sign-in`);
}
