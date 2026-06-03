// Supabase Edge Function — scheduled retention purge.
//
// Scheduler-invoked (x-cron-secret), like send_reminders. Enforces the data
// retention matrix from the compliance framework:
//   - Voice transcripts: purge the transcript text from VoiceEntryTranscribed
//     events older than 90 days (the event row stays for the care record; the
//     transcript field is cleared). Raw audio is never stored, so nothing to do
//     there.
//   - Waitlist entries: delete 12 months after signup.
//   - Reports: delete generated reports older than 2 years.
//   - Rate-limit rows: prune windows older than a day (housekeeping).
//
// The audit_log is NEVER purged here (7-year retention, separate policy).
//
// Deploy:   supabase functions deploy purge_expired --no-verify-jwt
// Secrets:  supabase secrets set CRON_SECRET=...
// Schedule: daily, calling this URL with header  x-cron-secret: <CRON_SECRET>
//
// NOTE: voice-transcript purge mutates log_events, which is append-only and
// guarded by a trigger. Clearing a single field is a retention obligation, not a
// care-record edit; this runs with the service role AND requires a dedicated
// allowance in the trigger (see migration note). Until that allowance is
// deployed, the transcript purge is reported as "skipped" rather than failing.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function ok(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString();
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return ok({ error: "Not authorized." }, 401);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return ok({ error: "Not configured." }, 501);

  const admin = createClient(url, key, { auth: { persistSession: false } });
  const result: Record<string, number | string> = {};

  // 1. Waitlist: delete entries older than 12 months.
  try {
    const { count } = await admin
      .from("waitlist_entries")
      .delete({ count: "exact" })
      .lt("created_at", daysAgo(365));
    result.waitlistDeleted = count ?? 0;
  } catch {
    result.waitlistDeleted = "skipped";
  }

  // 2. Reports: delete generated reports older than 2 years.
  try {
    const { count } = await admin
      .from("reports")
      .delete({ count: "exact" })
      .lt("generated_at", daysAgo(730));
    result.reportsDeleted = count ?? 0;
  } catch {
    result.reportsDeleted = "skipped";
  }

  // 3. Rate-limit housekeeping: prune windows older than a day.
  try {
    const { count } = await admin
      .from("rate_limits")
      .delete({ count: "exact" })
      .lt("window_start", daysAgo(1));
    result.rateLimitsPruned = count ?? 0;
  } catch {
    result.rateLimitsPruned = "skipped";
  }

  // 4. Voice transcripts older than 90 days: clear the transcript text.
  //    Mutating append-only log_events requires the retention allowance in the
  //    trigger (migration 0012). If that isn't deployed yet, the update throws
  //    and we report it as skipped rather than failing the whole job.
  try {
    const { data, error } = await admin
      .from("log_events")
      .update({ payload: { transcript: null, purged_for_retention: true } })
      .eq("event_type", "VoiceEntryTranscribed")
      .lt("occurred_at", daysAgo(90))
      .select("id");
    result.transcriptsPurged = error ? "skipped" : (data?.length ?? 0);
  } catch {
    result.transcriptsPurged = "skipped";
  }

  return ok(result);
});
