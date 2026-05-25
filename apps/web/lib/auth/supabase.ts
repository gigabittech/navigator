/**
 * Supabase clients.
 *
 *   - createBrowserClient()  — client components / hooks
 *   - createServerSupabase() — Route Handlers + Server Actions (reads cookies)
 *
 * Auth is optional. In local single-device mode none of this runs — the app
 * works without a backend. When NEXT_PUBLIC_SUPABASE_URL + anon key are set,
 * sign-in and (later) sync switch on.
 *
 * Never import the service-role client here. Service-role lives in Supabase
 * Edge Functions only.
 */

import {
  createBrowserClient as _createBrowserClient,
  createServerClient,
  type CookieOptions,
} from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

export function createBrowserClient() {
  return _createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

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
