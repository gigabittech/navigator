/**
 * Browser-only Supabase client.
 *
 * Keep server helpers in a separate module so client components can import this
 * file without pulling `next/headers` into the browser bundle.
 */

import { createBrowserClient as _createBrowserClient } from "@supabase/ssr";

export function createBrowserClient() {
  return _createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
