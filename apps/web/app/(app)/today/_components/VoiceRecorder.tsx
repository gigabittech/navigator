"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePGlite } from "@electric-sql/pglite-react";
import { ArrowLeft, Mic } from "lucide-react";
import { isTranscribeAvailable, transcribeAudio, TranscribeUnavailableError } from "@/lib/ai/transcribe";
import { logVoiceEntry } from "@/lib/db/mutations/logVoiceEntry";

// ─── Keyword → semantic tag mapping ──────────────────────────────────────────

type TagKind = "mood" | "trigger" | "energy";

const TAG_PATTERNS: Array<{ pattern: RegExp; kind: TagKind }> = [
  {
    pattern:
      /\b(grumpy|irritable|calm|anxious|sad|happy|elevated|frustrated|angry|relaxed|worried)\b/gi,
    kind: "mood",
  },
  {
    pattern:
      /\b(transition|schedule|loud|sensory|hunger|hungry|noise|change|switch|tired|sleep)\b/gi,
    kind: "trigger",
  },
  {
    pattern: /\b(energy|restless|low|high|focused|sluggish|hyper|active)\b/gi,
    kind: "energy",
  },
];

const TAG_STYLES: Record<TagKind, { bg: string; color: string }> = {
  mood: { bg: "var(--color-info-bg)", color: "var(--color-info-fg)" },
  trigger: { bg: "var(--color-warning-bg)", color: "var(--color-warning-fg)" },
  energy: { bg: "var(--cta-success-tint)", color: "var(--color-success-fg)" },
};

/** Annotate a plain transcript string with inline span tags. */
function annotate(text: string): React.ReactNode[] {
  if (!text) return [];

  // Build a list of match regions across all patterns.
  type Region = { start: number; end: number; kind: TagKind };
  const regions: Region[] = [];

  for (const { pattern, kind } of TAG_PATTERNS) {
    pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text)) !== null) {
      // Don't overlap with an already-claimed region.
      const newStart = m.index;
      const newEnd = m.index + m[0].length;
      if (!regions.some((r) => newStart < r.end && newEnd > r.start)) {
        regions.push({ start: newStart, end: newEnd, kind });
      }
    }
  }

  if (regions.length === 0) return [text];

  regions.sort((a, b) => a.start - b.start);

  const nodes: React.ReactNode[] = [];
  let cursor = 0;

  for (const region of regions) {
    if (cursor < region.start) {
      nodes.push(text.slice(cursor, region.start));
    }
    const style = TAG_STYLES[region.kind];
    nodes.push(
      <span
        key={`${region.start}-${region.kind}`}
        className="font-mono text-2xs font-bold rounded-full px-1.5 py-px mr-1"
        style={{ background: style.bg, color: style.color }}
      >
        {region.kind}
      </span>,
    );
    nodes.push(text.slice(region.start, region.end));
    cursor = region.end;
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
}

// ─── Timer ─────────────────────────────────────────────────────────────────

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

type RecState = "idle" | "recording" | "working" | "done" | "error";

interface VoiceRecorderProps {
  /** Called after save completes or user cancels. */
  onClose: () => void;
}

export function VoiceRecorder({ onClose }: VoiceRecorderProps) {
  const db = usePGlite();

  const [recState, setRecState] = useState<RecState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-start recording when the component mounts.
  useEffect(() => {
    void startRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clean up timer on unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startRecording = useCallback(async () => {
    setErrorMsg(null);
    setTranscript(null);
    setElapsed(0);

    if (!isTranscribeAvailable()) {
      // Gracefully degrade: still start recording; transcription will fail at
      // save time and we'll surface a calm message then.
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setRecState("working");

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const durationSeconds = Math.round(
          (Date.now() - startedAtRef.current) / 1000,
        );

        try {
          const text = await transcribeAudio(blob);
          if (text) {
            setTranscript(text);
            await logVoiceEntry(db, {
              transcript: text,
              durationSeconds,
              whisperModel: "whisper-1",
            });
            setRecState("done");
          } else {
            setErrorMsg("Couldn't hear anything. Try again.");
            setRecState("error");
          }
        } catch (err) {
          setErrorMsg(
            err instanceof TranscribeUnavailableError
              ? err.message
              : "Couldn't save that. It's still on this device.",
          );
          setRecState("error");
        }
      };

      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      recorder.start(250); // collect a chunk every 250 ms

      // Tick the elapsed timer.
      timerRef.current = setInterval(() => {
        setElapsed(Math.round((Date.now() - startedAtRef.current) / 1000));
      }, 1000);

      setRecState("recording");
    } catch {
      setErrorMsg("Couldn't access the microphone.");
      setRecState("error");
    }
  }, [db]);

  function stopAndSave() {
    recorderRef.current?.stop();
  }

  function handleCancel() {
    if (recorderRef.current && recState === "recording") {
      // Override onstop so it doesn't attempt to save.
      recorderRef.current.onstop = () => {
        recorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
      recorderRef.current.stop();
    }
    onClose();
  }

  const isRecording = recState === "recording";
  const isWorking = recState === "working";
  const isDone = recState === "done";

  // Close automatically once saved and transcript displayed.
  useEffect(() => {
    if (isDone) {
      const t = setTimeout(() => onClose(), 1400);
      return () => clearTimeout(t);
    }
  }, [isDone, onClose]);

  return (
    <div
      className="fixed inset-0 z-60 flex flex-col bg-surface-page"
      style={{ paddingTop: "var(--safe-top)", paddingBottom: "var(--safe-bottom)" }}
    >
      {/* Header */}
      <header className="flex items-center gap-3 h-14 px-4 border-b border-border-subtle shrink-0">
        <button
          type="button"
          aria-label="Go back"
          onClick={handleCancel}
          className="min-h-tap min-w-tap flex items-center justify-center rounded-lg text-fg-2 hover:bg-surface-card-alt transition-colors duration-fast focus:outline-none focus-visible:ring-2 focus-visible:ring-border-accent"
        >
          <ArrowLeft size={20} aria-hidden />
        </button>
        <h1 className="text-base font-semibold text-fg-1">Voice observation</h1>
      </header>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center overflow-y-auto py-8">
        {/* Pulsing ring + mic button */}
        <div
          className="relative flex items-center justify-center mb-8"
          style={{ width: 180, height: 180 }}
          aria-hidden
        >
          {/* Animated rings (only while recording) */}
          {isRecording ? (
            <>
              <span className="absolute inset-0 rounded-full border border-success-dot opacity-60 animate-[ring-pulse_2s_ease-out_infinite]" />
              <span className="absolute inset-0 rounded-full border border-success-dot opacity-60 animate-[ring-pulse_2s_ease-out_infinite_1s]" />
            </>
          ) : null}

          {/* Mic button — a single stable control across every state, so
              keyboard focus never lands on a vanishing target. */}
          <button
            type="button"
            aria-label={isRecording ? "Stop recording and save" : "Start recording"}
            aria-pressed={isRecording}
            onClick={isRecording ? stopAndSave : () => void startRecording()}
            disabled={isWorking || isDone}
            className="relative z-10 flex items-center justify-center rounded-full text-fg-on-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:ring-success-dot disabled:opacity-60 transition-transform duration-base ease-out active:scale-95"
            style={{
              width: 96,
              height: 96,
              background: "var(--cta-success)",
              boxShadow: "var(--shadow-cta-success-lg)",
            }}
          >
            <Mic size={36} aria-hidden />
          </button>
        </div>

        {/* Heading — announces state transitions to assistive tech. */}
        <h2
          className="text-xl font-bold tracking-snug text-fg-1 mb-1.5"
          role="status"
          aria-live="polite"
        >
          {isWorking ? "Saving…" : isDone ? "Saved" : isRecording ? "Listening…" : "Ready to record"}
        </h2>

        {/* Subtitle */}
        {!isWorking && !isDone && !errorMsg ? (
          <p className="text-sm text-fg-3 max-w-[28ch] leading-normal">
            {isRecording
              ? "Speak naturally. We'll find mood, energy, and any trigger."
              : "Tap the mic to start."}
          </p>
        ) : null}

        {/* Timer */}
        {isRecording ? (
          <p
            className="font-mono text-sm font-semibold mt-4"
            style={{ color: "var(--color-success-fg)" }}
            aria-live="off"
          >
            {formatDuration(elapsed)}
          </p>
        ) : null}

        {/* Live transcript */}
        {(isRecording || isWorking || isDone) && transcript ? (
          <div
            className="mt-6 rounded-xl border border-border-card bg-surface-card text-left text-sm text-fg-2 leading-relaxed w-full max-w-sm px-4 py-3.5"
            aria-live="polite"
          >
            {annotate(transcript)}
          </div>
        ) : null}

        {/* Working spinner */}
        {isWorking && !transcript ? (
          <p className="text-sm text-fg-3 mt-4">Transcribing…</p>
        ) : null}

        {/* Error message */}
        {errorMsg ? (
          <p className="text-sm text-danger-fg mt-4 max-w-[30ch]" role="alert">
            {errorMsg}
          </p>
        ) : null}
      </div>

      {/* Bottom actions */}
      <div
        className="flex gap-3 px-5 pb-5 pt-3 border-t border-border-subtle shrink-0"
      >
        <button
          type="button"
          onClick={handleCancel}
          disabled={isWorking}
          className="flex-1 min-h-tap flex items-center justify-center rounded-xl border border-border-strong text-sm font-semibold text-fg-1 bg-transparent hover:bg-surface-card-alt transition-colors duration-fast focus:outline-none focus-visible:ring-2 focus-visible:ring-border-accent disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={stopAndSave}
          disabled={!isRecording}
          className="flex-1 min-h-tap flex items-center justify-center rounded-xl text-sm font-semibold text-fg-on-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-success-dot transition-colors duration-fast disabled:opacity-50"
          style={{
            background: "var(--cta-success)",
            boxShadow: "var(--shadow-cta-success)",
          }}
        >
          Stop &amp; save
        </button>
      </div>
    </div>
  );
}
