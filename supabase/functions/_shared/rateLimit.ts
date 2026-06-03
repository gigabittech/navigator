// Shared fixed-window rate limiter for Edge Functions.
//
// Backed by the rate_limits table (migration 0011), accessed with the
// service-role key. Per (actor, function) within a fixed time window: increment
// a counter and reject once it exceeds the limit. Guards the expensive AI calls
// (risk register: "Claude API cost at scale").
//
// Fixed-window is intentionally simple and good enough here; the window is short
// and the cost of an occasional boundary burst is negligible versus the
// operational simplicity (no Redis, no token-bucket bookkeeping).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the window resets (for a Retry-After hint). */
  retryAfter: number;
}

/**
 * Check + record a hit for (actorId, fn). `limit` requests per `windowSec`.
 * Fails OPEN on infrastructure error (a limiter outage must not break the
 * product), but logs nothing sensitive.
 */
export async function checkRateLimit(
  actorId: string,
  fn: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return { allowed: true, retryAfter: 0 };

  const admin = createClient(url, key, { auth: { persistSession: false } });

  const now = Date.now();
  const windowMs = windowSec * 1000;
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs).toISOString();

  try {
    // Read current count for this window.
    const { data: existing } = await admin
      .from("rate_limits")
      .select("count")
      .eq("actor_id", actorId)
      .eq("fn", fn)
      .eq("window_start", windowStart)
      .maybeSingle();

    const current = existing?.count ?? 0;
    if (current >= limit) {
      const resetAt = Math.floor(now / windowMs) * windowMs + windowMs;
      return { allowed: false, retryAfter: Math.ceil((resetAt - now) / 1000) };
    }

    // Upsert the incremented count (idempotent on the PK).
    await admin
      .from("rate_limits")
      .upsert(
        { actor_id: actorId, fn, window_start: windowStart, count: current + 1 },
        { onConflict: "actor_id,fn,window_start" },
      );

    return { allowed: true, retryAfter: 0 };
  } catch {
    // Fail open — never let the limiter take the feature down.
    return { allowed: true, retryAfter: 0 };
  }
}
