import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { isSupabaseConfigured } from "@/lib/config";
import { PREVIEW_COOKIE, isPreviewGateEnabled, previewCookieValue } from "@/lib/auth/preview";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

const APP_PREFIXES = ["/today", "/timeline", "/report", "/prep", "/settings", "/patterns", "/onboarding"];

/**
 * Middleware does two jobs on every request:
 *  1. Private-preview curtain — until launch, the whole site requires the
 *     shared preview password (cookie checked here).
 *  2. Auth gate for the `/(app)` segment — when Supabase is configured, an
 *     unauthenticated request to an app route is redirected to /sign-in.
 *
 * NOTE — the Content-Security-Policy deliberately does NOT live here. A
 * per-request nonce CSP breaks statically-prerendered pages on Vercel: the
 * CDN serves cached HTML whose script tags carry no nonce, while the
 * middleware mints a fresh nonce per request — with 'strict-dynamic' the
 * browser then blocks every chunk and nothing hydrates (this took the live
 * sign-in page down). The CSP is a static header in next.config.mjs instead,
 * compatible with CDN-cached static pages.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Private-preview curtain. Exempt the gate page itself and the auth
  // callback (magic-link emails must keep working on un-gated devices);
  // static assets never reach middleware (see config.matcher). Unset
  // PREVIEW_PASSWORD and this block is inert.
  if (isPreviewGateEnabled()) {
    const exempt = pathname === "/preview-access" || pathname.startsWith("/auth/");
    if (!exempt) {
      const granted = request.cookies.get(PREVIEW_COOKIE)?.value;
      if (granted !== (await previewCookieValue())) {
        const url = request.nextUrl.clone();
        url.pathname = "/preview-access";
        url.search = "";
        if (pathname !== "/") url.searchParams.set("from", pathname);
        return NextResponse.redirect(url);
      }
    }
  }

  const isAppRoute = APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // Non-app routes (and local mode) pass through.
  if (!isAppRoute || !isSupabaseConfigured()) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
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
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.).*)"],
};
