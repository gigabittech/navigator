import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { isSupabaseConfigured } from "@/lib/config";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

const APP_PREFIXES = ["/today", "/timeline", "/report", "/prep", "/settings", "/patterns", "/onboarding"];

function createSecurityHeaders(request: NextRequest, nonce: string) {
  const isProd = process.env.NODE_ENV === "production";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const connectSrc = [
    "'self'",
    supabaseUrl || null,
    isProd ? null : "ws:",
    isProd ? null : "http://localhost:*",
  ]
    .filter(Boolean)
    .join(" ");

  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'wasm-unsafe-eval'",
    isProd ? null : "'unsafe-eval'",
  ]
    .filter(Boolean)
    .join(" ");

  const contentSecurityPolicy = [
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
  ]
    .filter(Boolean)
    .join("; ");

  return {
    requestHeaders: new Headers(request.headers),
    responseHeaders: {
      "Content-Security-Policy": contentSecurityPolicy,
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      ...(isProd
        ? {
            "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
          }
        : {}),
    },
  };
}

function applySecurityHeaders(response: NextResponse, headers: Record<string, string>) {
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}

/**
 * Auth gate for the `/(app)` segment. Marketing routes pass through untouched.
 *
 * In local single-device mode (no Supabase configured) the gate is a no-op —
 * the app is fully usable without an account. When Supabase is configured, an
 * unauthenticated request to an app route is redirected to /sign-in.
 */
export async function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const { requestHeaders, responseHeaders } = createSecurityHeaders(request, nonce);
  requestHeaders.set("x-nonce", nonce);

  const { pathname } = request.nextUrl;
  const isAppRoute = APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!isAppRoute) {
    return applySecurityHeaders(
      NextResponse.next({ request: { headers: requestHeaders } }),
      responseHeaders,
    );
  }

  // Local mode: nothing to gate.
  if (!isSupabaseConfigured()) {
    return applySecurityHeaders(
      NextResponse.next({ request: { headers: requestHeaders } }),
      responseHeaders,
    );
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
    return applySecurityHeaders(NextResponse.redirect(url), responseHeaders);
  }

  return applySecurityHeaders(response, responseHeaders);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.).*)"],
};
