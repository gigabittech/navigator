"use client";

import { useRef, useState } from "react";
import { usePGlite } from "@electric-sql/pglite-react";
import { Button } from "@navigator/design-system/components";
import {
  isTranscribeAvailable,
  transcribeAudio,
  TranscribeUnavailableError,
} from "@/lib/ai/transcribe";
import { logVoiceEntry } from "@/lib/db/mutations/logVoiceEntry";
import { getContext } from "@/lib/db/mutations/context";

type State = "idle" | "recording" | "working";

export function VoiceNote() {
  const db = usePGlite();
  const [state, setState] = useState<State>("idle");
  const [note, setNote] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);

  async function start() {
    setNote(null);
    if (!isTranscribeAvailable()) {
      setNote("Voice notes need a backend connection. They're off in local mode.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setState("working");
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const seconds = Math.round((Date.now() - startedAtRef.current) / 1000);
        try {
          const { childId } = await getContext(db);
          const transcript = await transcribeAudio(blob, childId);
          if (transcript) {
            await logVoiceEntry(db, {
              transcript,
              durationSeconds: seconds,
              whisperModel: "whisper-1",
            });
            setNote("Voice note saved.");
          } else {
            setNote("Couldn't hear anything. Try again.");
          }
        } catch (err) {
          setNote(
            err instanceof TranscribeUnavailableError
              ? err.message
              : "Couldn't transcribe that. Try again.",
          );
        } finally {
          setState("idle");
        }
      };
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      recorder.start();
      setState("recording");
    } catch {
      setNote("Couldn't access the microphone.");
    }
  }

  function stop() {
    recorderRef.current?.stop();
  }

  return (
    <div className="flex flex-col gap-2">
      {state === "recording" ? (
        <Button variant="danger" fullWidth onClick={stop}>
          Stop recording
        </Button>
      ) : (
        <Button variant="ghost" fullWidth onClick={start} disabled={state === "working"}>
          {state === "working" ? "Transcribing…" : "Record a voice note"}
        </Button>
      )}
      {note ? <p className="text-xs text-fg-3 text-center">{note}</p> : null}
    </div>
  );
}
