// Supabase Edge Function — Claude-backed clinical narrative.
//
// Takes a structured Report (from @navigator/report) and returns a concise,
// clinician-fluent summary. Runs on Deno; never exposed to the client except
// through this function (the Anthropic key stays server-side).
//
// Deploy:  supabase functions deploy generate_narrative
// Secrets: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import { corsHeaders, json } from "../_shared/cors.ts";

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
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "Narrative is not configured on this server." }, 501);

  try {
    const { report } = await req.json();
    if (!report) return json({ error: "Missing report." }, 400);

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
      return json({ error: `Anthropic returned ${res.status}.` }, 502);
    }
    const data = await res.json();
    const narrative = data?.content?.[0]?.text?.trim() ?? "";
    return json({ narrative });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
