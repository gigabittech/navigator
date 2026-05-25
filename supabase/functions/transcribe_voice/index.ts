// Supabase Edge Function — Whisper voice transcription.
//
// Accepts an audio file (multipart/form-data, field "file") and returns the
// transcript. The OpenAI key stays server-side.
//
// Deploy:  supabase functions deploy transcribe_voice
// Secrets: supabase secrets set OPENAI_API_KEY=sk-...

import { corsHeaders, json } from "../_shared/cors.ts";

const MODEL = Deno.env.get("WHISPER_MODEL") ?? "whisper-1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return json({ error: "Transcription is not configured on this server." }, 501);

  try {
    const inForm = await req.formData();
    const file = inForm.get("file");
    if (!(file instanceof File)) return json({ error: "Missing audio file." }, 400);

    const upstream = new FormData();
    upstream.append("file", file, file.name || "audio.webm");
    upstream.append("model", MODEL);

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstream,
    });

    if (!res.ok) {
      return json({ error: `Transcription service returned ${res.status}.` }, 502);
    }
    const data = await res.json();
    return json({ transcript: (data?.text ?? "").trim(), model: MODEL });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
