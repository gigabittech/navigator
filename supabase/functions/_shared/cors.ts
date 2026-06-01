// Shared CORS handling for browser-invoked Edge Functions.
//
// Fail-closed by design: in production you MUST set ALLOWED_ORIGIN to the
// origin(s) allowed to call these functions. Requests from any other origin
// get no CORS grant and the browser blocks them.
//
//   supabase secrets set ALLOWED_ORIGIN=https://your-deployment.vercel.app
//   # comma-separate to allow more than one (e.g. preview + prod):
//   supabase secrets set ALLOWED_ORIGIN=https://app.example.com,https://staging.example.com
//
// Local development (DENO_ENV / ENVIRONMENT not "production") additionally
// allows http://localhost:* and http://127.0.0.1:* so the dev server works
// without configuration. Production never falls back to a wildcard.

const baseCorsHeaders = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  Vary: "Origin",
};

function isProd(): boolean {
  const env = (Deno.env.get("ENVIRONMENT") ?? Deno.env.get("DENO_ENV") ?? "")
    .toLowerCase();
  return env === "production" || env === "prod";
}

function configuredOrigins(): string[] {
  return (Deno.env.get("ALLOWED_ORIGIN") ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
}

function isLocalhost(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

/**
 * Decide whether `origin` is allowed. Returns the value to echo back in
 * Access-Control-Allow-Origin, or null when the origin is not allowed.
 */
function resolveAllowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  const allowed = configuredOrigins();
  if (allowed.includes(origin)) return origin;
  // Dev convenience only — never in production.
  if (!isProd() && isLocalhost(origin)) return origin;
  return null;
}

/** Build CORS headers for a given request. Fails closed for disallowed origins. */
export function corsHeadersFor(req: Request): Record<string, string> {
  const allowOrigin = resolveAllowedOrigin(req.headers.get("origin"));
  if (!allowOrigin) return { ...baseCorsHeaders };
  return { ...baseCorsHeaders, "Access-Control-Allow-Origin": allowOrigin };
}

/** True when the request's origin is permitted to call this function. */
export function isOriginAllowed(req: Request): boolean {
  return resolveAllowedOrigin(req.headers.get("origin")) !== null;
}

/** Handle the CORS preflight. Returns 403 when the origin is not allowed. */
export function handlePreflight(req: Request): Response {
  if (!isOriginAllowed(req)) {
    return new Response("origin not allowed", {
      status: 403,
      headers: { ...baseCorsHeaders },
    });
  }
  return new Response("ok", { headers: corsHeadersFor(req) });
}

/** JSON response with CORS headers scoped to the request's origin. */
export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersFor(req), "Content-Type": "application/json" },
  });
}
