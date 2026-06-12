"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { PGliteInterface } from "@electric-sql/pglite";
import { usePGlite } from "@electric-sql/pglite-react";
import { Card } from "@navigator/design-system/components";
import Link from "next/link";
import { useChildState } from "@/lib/db/queries/useChild";
import { useTodayDoses } from "@/lib/db/queries/useTodayDoses";
import { logObservation } from "@/lib/db/mutations/logObservation";
import { DoseCard } from "./_components/DoseCard";
import { NextVisitBanner } from "./_components/NextVisitBanner";
import { ObservationComposer } from "./_components/ObservationComposer";
import { PatternCard } from "./_components/PatternCard";
import { QuickAddGrid } from "./_components/QuickAddGrid";
import { TagPicker } from "./_components/TagPicker";
import { VoiceNote } from "./_components/VoiceNote";
import { FAB, QuickLogSheet } from "../_components/QuickLogSheet";

// The voice recorder is only reached behind the quick-log sheet — never on
// first paint. Loading it dynamically (client-only) keeps its recorder/AI
// transcription code out of the /today First Load JS. A tiny full-screen
// fallback covers the brief load before the overlay appears.
const VoiceRecorder = dynamic(
  () => import("./_components/VoiceRecorder").then((m) => m.VoiceRecorder),
  {
    ssr: false,
    loading: () => (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-surface-overlay"
        role="status"
      >
        <span className="sr-only">Opening the recorder</span>
        <span
          className="size-2 rounded-full bg-accent-500 animate-pulse-slow"
          aria-hidden
        />
      </div>
    ),
  },
);

type ActiveOverlay = "sheet" | "voice" | "tags" | "school" | null;

/**
 * /today — the home of the app. Today's dose schedule with one-tap logging,
 * wear-off pattern alerts, quick-add shortcuts, next-visit reminder,
 * observation composer, and voice notes. Everything reads from and writes to
 * the local PGlite database; updates are instant.
 */
export default function TodayPage() {
  const { child, loaded: childLoaded } = useChildState();
  const { slots, loading } = useTodayDoses(child?.id);
  const db = usePGlite();

  const [overlay, setOverlay] = useState<ActiveOverlay>(null);

  const greeting = child ? `${child.preferredName}'s day` : "Today";

  function closeOverlay() {
    setOverlay(null);
  }

  return (
    <>
      <div className="flex flex-col gap-4" data-testid="today-page">
        <header className="flex items-baseline justify-between">
          <h1 className="text-2xl font-bold tracking-tight">{greeting}</h1>
        </header>

        {childLoaded && !child ? (
          <Card alt>
            <p className="text-sm text-fg-2 mb-3">
              No child profile on this device yet. Set one up to start logging —
              it takes under a minute.
            </p>
            <Link
              href="/onboarding/child"
              className="inline-flex min-h-tap items-center rounded-lg bg-accent-600 px-4 text-sm font-semibold text-fg-on-accent hover:bg-accent-700 transition-colors duration-fast"
            >
              Set up your child
            </Link>
          </Card>
        ) : loading ? (
          <Card alt>
            <p className="text-sm text-fg-3">Loading today&rsquo;s doses…</p>
          </Card>
        ) : slots.length === 0 ? (
          <Card alt>
            <p className="text-sm text-fg-3">
              No medications scheduled.{" "}
              <Link href="/settings#medications" className="text-accent-700 underline-offset-2 hover:underline">
                Add one in settings
              </Link>{" "}
              to start logging doses.
            </p>
          </Card>
        ) : (
          slots.map((slot) => (
            <DoseCard key={`${slot.medicationId}|${slot.scheduledFor}`} slot={slot} />
          ))
        )}

        {child ? (
          <>
            {/* Wear-off pattern alert — only renders when a pattern is detected */}
            <PatternCard />

            {/* Quick-add 2×2 grid — shortcuts to the observation composer and voice note */}
            <QuickAddGrid />

            {/* Next visit strip — shown when an appointment is within 14 days */}
            <NextVisitBanner />

            <ObservationComposer />
            <VoiceNote />
          </>
        ) : null}
      </div>

      {/* FAB — sits above tab bar, below overlays */}
      <FAB onOpen={() => setOverlay("sheet")} />

      {/* Quick-log bottom sheet */}
      {overlay === "sheet" ? (
        <QuickLogSheet
          onClose={closeOverlay}
          onVoice={() => setOverlay("voice")}
          onTag={() => setOverlay("tags")}
          onSchool={() => setOverlay("school")}
        />
      ) : null}

      {/* Voice recording full-screen overlay */}
      {overlay === "voice" ? <VoiceRecorder onClose={closeOverlay} /> : null}

      {/* Tag picker full-screen overlay */}
      {overlay === "tags" ? <TagPicker onClose={closeOverlay} /> : null}

      {/* School event inline sheet */}
      {overlay === "school" ? (
        <SchoolEventSheet db={db} onClose={closeOverlay} />
      ) : null}
    </>
  );
}

// ─── School event quick-entry sheet ──────────────────────────────────────────

interface SchoolEventSheetProps {
  db: PGliteInterface;
  onClose: () => void;
}

function SchoolEventSheet({ db, onClose }: SchoolEventSheetProps) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!note.trim()) {
      setError("Describe the event first.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await logObservation(db, {
        tags: ["school-event"],
        note: note.trim(),
        context: "school",
      });
      onClose();
    } catch {
      setError("Couldn't save that. It's still on this device.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Backdrop. Phone-style bottom sheet on mobile; centered modal on lg+. */}
      <div
        role="presentation"
        className="fixed inset-0 z-50 bg-surface-overlay lg:grid lg:place-items-center lg:p-6"
        onClick={onClose}
      >
        {/* Sheet */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Log a school event"
          onClick={(e) => e.stopPropagation()}
          className="fixed bottom-0 left-0 right-0 z-50 bg-surface-card
                     rounded-t-[24px] lg:static lg:w-full lg:max-w-md lg:rounded-3xl"
          style={{
            padding: "12px 20px calc(var(--safe-bottom) + 28px)",
            boxShadow: "var(--shadow-sheet)",
          }}
        >
          {/* Grabber — touch affordance, hidden on the desktop modal. */}
          <div
            aria-hidden
            className="mx-auto mb-5 lg:hidden"
            style={{
              width: 40,
              height: 4,
              borderRadius: 9999,
              background: "var(--surface-grabber)",
            }}
          />

        <h2 className="mb-1 text-lg font-bold tracking-snug text-fg-1">
          Log a school event
        </h2>
        <p className="mb-4 text-sm text-fg-3">
          Email, call, IEP meeting, or anything else worth noting.
        </p>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="What happened?"
          disabled={saving}
          className="mb-3 w-full resize-none rounded-xl border border-border-card bg-surface-input px-4 py-3.5 text-base leading-normal text-fg-1 placeholder:text-fg-4 focus:outline-none focus-within:border-border-accent disabled:opacity-50"
        />

        {error ? (
          <p className="mb-3 text-sm text-danger-fg" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="min-h-tap flex flex-1 items-center justify-center rounded-xl border border-border-strong bg-transparent text-sm font-semibold text-fg-1 transition-colors duration-fast hover:bg-surface-card-alt focus:outline-none focus-visible:ring-2 focus-visible:ring-border-accent disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="min-h-tap flex flex-1 items-center justify-center rounded-xl text-sm font-semibold text-fg-on-accent transition-opacity duration-fast focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-success-dot disabled:opacity-50"
            style={{
              background: "var(--cta-success)",
              boxShadow: "var(--shadow-cta-success)",
            }}
          >
            {saving ? "Saving…" : "Save event"}
          </button>
        </div>
        </div>
      </div>
    </>
  );
}
