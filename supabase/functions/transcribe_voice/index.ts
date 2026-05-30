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
import { getAuthedUser, isUuid, userCanAccessChild } from "../_shared/auth.ts";
import { redact } from "../_shared/redact.ts";

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
    const childId = inForm.get("childId");

    if (!(file instanceof File)) return json(req, { error: "Missing audio file." }, 400);
    if (!isUuid(childId)) return json(req, { error: "Missing or invalid child reference." }, 400);

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
    return json(req, { transcript: (data?.text ?? "").trim(), model: MODEL });
  } catch (err) {
    console.error("transcribe_voice_error", redact({ name: err instanceof Error ? err.name : "unknown" }));
    return json(req, { error: "Something went wrong transcribing that." }, 500);
  }
});
