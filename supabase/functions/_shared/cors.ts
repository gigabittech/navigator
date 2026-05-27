// Shared CORS headers for browser-invoked Edge Functions.
//
// In production, set the ALLOWED_ORIGIN secret to lock requests to your
// Vercel deployment:
//   supabase secrets set ALLOWED_ORIGIN=https://your-deployment.vercel.app
//
// Without ALLOWED_ORIGIN set, the functions accept requests from any origin
// (suitable for local development and preview deployments).
const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") ?? "*";

export const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
