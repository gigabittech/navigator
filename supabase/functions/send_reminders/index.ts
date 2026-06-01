// Supabase Edge Function — dose reminder sender (Web Push).
//
// Scheduler-invoked (NOT browser-invoked): a cron trigger calls this every few
// minutes. It finds medications whose scheduled dose time falls in the current
// window and, for each, sends a Web Push reminder to every device subscribed to
// that child. Uses the service-role key to read across users; it is not exposed
// to the client and must be protected by a shared secret header.
//
// Deploy:
//   supabase functions deploy send_reminders --no-verify-jwt
//   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... \
//     VAPID_SUBJECT=mailto:alerts@navigator.app CRON_SECRET=...
// Schedule (e.g. every 5 min) via Supabase cron / pg_cron calling this URL with
//   header  x-cron-secret: <CRON_SECRET>
//
// VAPID key pair (one-time): npx web-push generate-vapid-keys
// Put the PUBLIC key in the app as NEXT_PUBLIC_VAPID_PUBLIC_KEY too.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

interface Sub {
  endpoint: string;
  p256dh: string;
  auth: string;
  child_id: string;
}

function ok(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  // Auth: a shared secret only the scheduler knows. Fail closed.
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return ok({ error: "Not authorized." }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:alerts@navigator.app";
  if (!supabaseUrl || !serviceKey || !vapidPublic || !vapidPrivate) {
    return ok({ error: "Reminders are not configured on this server." }, 501);
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // 1. Find doses due in the current window (default: the next 5 minutes).
  //    scheduled_times is a JSON array of "HH:MM" local strings per medication.
  const windowMin = Number(Deno.env.get("REMINDER_WINDOW_MIN") ?? "5");
  const now = new Date();
  const dueHHMM = withinWindow(now, windowMin);

  const { data: meds, error: medErr } = await admin
    .from("medications")
    .select("id, child_id, name, scheduled_times, active")
    .eq("active", true);
  if (medErr) return ok({ error: "Could not read medications." }, 500);

  // Which children have a dose due right now, and the med name to mention.
  const dueByChild = new Map<string, string[]>();
  for (const m of meds ?? []) {
    const times: string[] = Array.isArray(m.scheduled_times) ? m.scheduled_times : [];
    if (times.some((t) => dueHHMM.has(normalizeHHMM(t)))) {
      const list = dueByChild.get(m.child_id) ?? [];
      list.push(m.name);
      dueByChild.set(m.child_id, list);
    }
  }
  if (dueByChild.size === 0) return ok({ sent: 0, note: "No doses due in this window." });

  // 2. For each due child, push to every subscribed device.
  let sent = 0;
  let pruned = 0;
  for (const [childId, medNames] of dueByChild) {
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth, child_id")
      .eq("child_id", childId);

    const payload = JSON.stringify({
      title: "Dose reminder",
      // Voice: sentence case, second person, no exclamation marks.
      body:
        medNames.length === 1
          ? `Time for ${medNames[0]}.`
          : `Time for ${medNames.length} medications.`,
      url: "/today",
      tag: `dose-${childId}`,
    });

    for (const s of (subs ?? []) as Sub[]) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        sent++;
      } catch (err) {
        // 404/410 mean the subscription is dead — prune it so we stop retrying.
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
          pruned++;
        }
      }
    }
  }

  return ok({ sent, pruned });
});

/** Set of "HH:MM" minutes from now..now+windowMin (local-time match). */
function withinWindow(now: Date, windowMin: number): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i <= windowMin; i++) {
    const d = new Date(now.getTime() + i * 60000);
    out.add(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
  }
  return out;
}
function normalizeHHMM(t: string): string {
  const [h, m] = t.split(":");
  return `${pad(Number(h))}:${pad(Number(m))}`;
}
function pad(n: number): string {
  return String(n).padStart(2, "0");
}
