import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { isSupabaseConfigured } from "@/lib/config";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

const APP_PREFIXES = ["/today", "/timeline", "/report", "/prep", "/settings", "/patterns", "/onboarding"];

const isProd = process.env.NODE_ENV === "production";

/**
 * Build a per-request Content-Security-Policy using a fresh nonce.
 *
 * Next.js App Router injects inline bootstrap/hydration scripts whose content
 * changes per render, so they can't be allow-listed by static hash. The correct
 * pattern is a per-request nonce: we mint one here, hand it to Next (via the
 * `x-nonce` request header — Next reads it and stamps every script it emits),
 * and pair it with `'strict-dynamic'` so those nonce'd scripts can load their
 * own chunks. This keeps script-src strict (no `'unsafe-inline'`).
 *
 * `'wasm-unsafe-eval'` is required for PGlite's WASM. Dev adds `'unsafe-eval'`
 * for Next's HMR runtime.
 */
// SHA-256 of the exact inline theme-init script in app/layout.tsx
// (lib/theme.ts THEME_INIT_SCRIPT). It's static, so it's allow-listed by hash —
// the root layout stays static (no headers() read), while Next's per-render
// scripts are covered by the nonce + 'strict-dynamic'. If the theme script's
// bytes change, recompute: sha256(script) | base64.
const THEME_SCRIPT_HASH = "'sha256-YLkpIKaf9HdRDBp9sI3/HfyUwMOgvFL7f5VO/kOiz+k='";

function buildCsp(nonce: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    THEME_SCRIPT_HASH,
    "'strict-dynamic'",
    "'wasm-unsafe-eval'",
    isProd ? null : "'unsafe-eval'",
  ]
    .filter(Boolean)
    .join(" ");
  const connectSrc = ["'self'", supabaseUrl || null, isProd ? null : "ws:", isProd ? null : "http://localhost:*"]
    .filter(Boolean)
    .join(" ");
  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "manifest-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    ...(isProd ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

/**
 * Middleware does two jobs on every request:
 *  1. Sets a per-request nonce + CSP (so Next's inline scripts are allowed
 *     without weakening the policy).
 *  2. Auth-gates the `/(app)` segment — when Supabase is configured, an
 *     unauthenticated request to an app route is redirected to /sign-in. Local
 *     single-device mode is a no-op (the app is usable without an account).
 */
export async function middleware(request: NextRequest) {
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const csp = buildCsp(nonce);

  // Pass the nonce into the render via a request header Next reads, and forward
  // the same nonce/CSP to the browser on the response.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const withCsp = (res: NextResponse) => {
    res.headers.set("Content-Security-Policy", csp);
    return res;
  };

  const { pathname } = request.nextUrl;
  const isAppRoute = APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // Non-app routes (and local mode) just pass through — but still carry the CSP.
  if (!isAppRoute || !isSupabaseConfigured()) {
    return withCsp(NextResponse.next({ request: { headers: requestHeaders } }));
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet: CookieToSet[]) => {
          for (const { name, value, options } of toSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", pathname);
    return withCsp(NextResponse.redirect(url));
  }

  return withCsp(response);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.).*)"],
};
