// Shared authentication + authorization for Edge Functions.
//
// verify_jwt (Supabase's gateway) confirms the caller holds *a* valid token,
// but it does NOT confirm the caller is allowed to act on the child referenced
// by the payload. These helpers close that gap: resolve the authenticated user
// from their access token, then check child access under RLS.
//
// All errors are returned generically to the caller (no internal detail); use
// `redact()` patterns before logging anything derived from the payload.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuthedUser {
  id: string;
  token: string;
}

/**
 * Extract the bearer token and resolve the authenticated user. Returns null
 * when there's no usable session. The token is the *user's* access token, not
 * the anon key — the client must forward `session.access_token`.
 */
export async function getAuthedUser(req: Request): Promise<AuthedUser | null> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) return null;

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, token };
}

/**
 * True when the authenticated user owns or collaborates on the given child.
 * Runs the check under the user's own RLS context — a row only comes back if
 * policy permits it, so this can't be spoofed by a forged childId.
 */
export async function userCanAccessChild(
  user: AuthedUser,
  childId: string,
): Promise<boolean> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) return false;

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${user.token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // RLS on `children` only returns rows the user owns or collaborates on, so a
  // single matching row proves access.
  const { data, error } = await supabase
    .from("children")
    .select("id")
    .eq("id", childId)
    .maybeSingle();

  if (error) return false;
  return data !== null;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Validate a value is a well-formed UUID string (defends the access check). */
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}
