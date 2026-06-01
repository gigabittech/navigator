// Supabase Edge Function — Claude-backed clinical narrative.
//
// Takes a structured Report (from @navigator/report) and returns a concise,
// clinician-fluent summary. Runs on Deno; never exposed to the client except
// through this function (the Anthropic key stays server-side).
//
// Security: the gateway verifies the JWT, but we additionally authorize the
// payload — the caller must own or collaborate on the `childId` they reference
// before we send anything to Anthropic.
//
// Deploy:  supabase functions deploy generate_narrative
// Secrets: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import { handlePreflight, isOriginAllowed, json } from "../_shared/cors.ts";
import { getAuthedUser, isUuid, userCanAccessChild } from "../_shared/auth.ts";
import { redact } from "../_shared/redact.ts";

// deno-lint-ignore no-explicit-any
type AnyReport = any;

const MODEL = Deno.env.get("CLAUDE_MODEL") ?? "claude-sonnet-4-5";

function buildPrompt(report: AnyReport): string {
  const sections = (report.sections ?? [])
    .map((s: AnyReport) => `## ${s.title}\n${s.body}`)
    .join("\n\n");

  return [
    "You are helping a parent prepare for a short psychiatric appointment about their child.",
    "Write a calm, factual 2–3 paragraph summary a clinician can read in under a minute.",
    "Rules: use the parent's own words where given; do not diagnose or recommend dose changes;",
    "lead with adherence and any notable patterns; second person ('you'); no exclamation marks.",
    "",
    `Child: ${report.child?.preferredName ?? "the child"}`,
    report.child?.diagnosesNotes ? `Parent's notes: ${report.child.diagnosesNotes}` : "",
    `Window: ${report.rangeStart} to ${report.rangeEnd}`,
    `Adherence: ${report.highlights?.adherenceRate}% over ${report.highlights?.daysCovered} days, ${report.highlights?.eventsLogged} events.`,
    "",
    sections,
  ]
    .filter(Boolean)
    .join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handlePreflight(req);

  // Fail closed on disallowed origins before doing any work.
  if (!isOriginAllowed(req)) {
    return json(req, { error: "Request not allowed." }, 403);
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json(req, { error: "Narrative is not configured on this server." }, 501);

  try {
    const user = await getAuthedUser(req);
    if (!user) return json(req, { error: "Not signed in." }, 401);

    const body = await req.json().catch(() => null);
    const report = body?.report;
    const childId = body?.childId ?? report?.child?.id;

    if (!report) return json(req, { error: "Missing report." }, 400);
    if (!isUuid(childId)) return json(req, { error: "Missing or invalid child reference." }, 400);

    // Authorize the payload against the caller — generic error, no leakage of
    // whether the child exists.
    if (!(await userCanAccessChild(user, childId))) {
      return json(req, { error: "Not allowed." }, 403);
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 800,
        messages: [{ role: "user", content: buildPrompt(report) }],
      }),
    });

    if (!res.ok) {
      // Log the upstream status only — never the prompt/report (PII).
      console.error("anthropic_error", redact({ status: res.status }));
      return json(req, { error: "The summary service is unavailable." }, 502);
    }
    const data = await res.json();
    const narrative = data?.content?.[0]?.text?.trim() ?? "";
    return json(req, { narrative });
  } catch (err) {
    // Never echo internal error detail to the client, and redact before logging.
    console.error("generate_narrative_error", redact({ name: err instanceof Error ? err.name : "unknown" }));
    return json(req, { error: "Something went wrong generating the summary." }, 500);
  }
});
