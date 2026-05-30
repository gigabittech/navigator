/**
 * Server-only Supabase client backed by the request cookie store.
 *
 *   - createServerSupabase() — Route Handlers + Server Actions
 *
 * This module imports next/headers and must only be used from server code
 * (Route Handlers, Server Actions, Server Components). Never import it from a
 * "use client" module — that pulls next/headers into the client bundle and
 * fails the build. Client code uses ./supabase (createBrowserClient) instead.
 *
 * Never import the service-role client here. Service-role lives in Supabase
 * Edge Functions only.
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/** Server-side Supabase client backed by the request cookie store. */
export function createServerSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet: CookieToSet[]) => {
          try {
            for (const { name, value, options } of toSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // setAll is called from Server Components where mutation is a no-op;
            // session refresh in middleware covers that case.
          }
        },
      },
    },
  );
}
