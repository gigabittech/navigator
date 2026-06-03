// Supabase Edge Function — Whisper voice transcription.
//
// Accepts an audio file (multipart/form-data, field "file") plus the target
// "childId" and returns the transcript. The OpenAI key stays server-side.
//
// Security: the gateway verifies the JWT, but we additionally authorize the
// request — the caller must own or collaborate on the referenced child before
// we send any audio to Whisper.
//
// Deploy:  supabase functions deploy transcribe_voice
// Secrets: supabase secrets set OPENAI_API_KEY=sk-...

import { handlePreflight, isOriginAllowed, json } from "../_shared/cors.ts";
import { getAuthedUser, userCanAccessChild } from "../_shared/auth.ts";
import { redact } from "../_shared/redact.ts";
import { transcribeFieldsSchema, parse } from "../_shared/validate.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { appendAudit } from "../_shared/audit.ts";

const MODEL = Deno.env.get("WHISPER_MODEL") ?? "whisper-1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handlePreflight(req);

  // Fail closed on disallowed origins before doing any work.
  if (!isOriginAllowed(req)) {
    return json(req, { error: "Request not allowed." }, 403);
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return json(req, { error: "Transcription is not configured on this server." }, 501);

  try {
    const user = await getAuthedUser(req);
    if (!user) return json(req, { error: "Not signed in." }, 401);

    const inForm = await req.formData();
    const file = inForm.get("file");

    // Validate the non-file fields at the boundary (Zod).
    const fields = parse(transcribeFieldsSchema, { childId: inForm.get("childId") });
    if (!(file instanceof File)) return json(req, { error: "Missing audio file." }, 400);
    if (!fields.ok) return json(req, { error: "Invalid request." }, 400);
    const { childId } = fields.data;

    // Rate limit the Whisper call: 20 per 5 minutes per user.
    const rl = await checkRateLimit(user.id, "transcribe_voice", 20, 300);
    if (!rl.allowed) {
      return json(req, { error: "Too many requests. Try again shortly." }, 429);
    }

    // Authorize against the caller — generic error, no existence leakage.
    if (!(await userCanAccessChild(user, childId))) {
      return json(req, { error: "Not allowed." }, 403);
    }

    const upstream = new FormData();
    upstream.append("file", file, file.name || "audio.webm");
    upstream.append("model", MODEL);

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstream,
    });

    if (!res.ok) {
      // Log the upstream status only — never the audio or transcript (PII).
      console.error("whisper_error", redact({ status: res.status }));
      return json(req, { error: "The transcription service is unavailable." }, 502);
    }
    const data = await res.json();

    // Audit the access. Detail is non-PII (no audio, no transcript) — the raw
    // audio was never stored; only the transcript is returned to the device.
    await appendAudit({
      actorId: user.id,
      childId,
      action: "voice.transcribe",
      detail: { model: MODEL },
    });

    return json(req, { transcript: (data?.text ?? "").trim(), model: MODEL });
  } catch (err) {
    console.error("transcribe_voice_error", redact({ name: err instanceof Error ? err.name : "unknown" }));
    return json(req, { error: "Something went wrong transcribing that." }, 500);
  }
});
