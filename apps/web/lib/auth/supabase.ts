/**
 * Client-safe Supabase browser client.
 *
 *   - createBrowserClient() — client components / hooks
 *
 * This module is import-safe from "use client" code: it must NOT pull in
 * next/headers or any server-only API. The server client (which reads the
 * request cookie store) lives in ./supabase-server so a client bundle never
 * transitively imports next/headers.
 *
 * Auth is optional. In local single-device mode none of this runs — the app
 * works without a backend. When NEXT_PUBLIC_SUPABASE_URL + anon key are set,
 * sign-in and (later) sync switch on.
 *
 * Never import the service-role client here. Service-role lives in Supabase
 * Edge Functions only.
 */

import { createBrowserClient as _createBrowserClient } from "@supabase/ssr";

export function createBrowserClient() {
  return _createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
