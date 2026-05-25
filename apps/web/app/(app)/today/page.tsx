"use client";

import { useState } from "react";
import type { PGliteInterface } from "@electric-sql/pglite";
import { usePGlite } from "@electric-sql/pglite-react";
import { Card } from "@navigator/design-system/components";
import { useChild } from "@/lib/db/queries/useChild";
import { useTodayDoses } from "@/lib/db/queries/useTodayDoses";
import { logObservation } from "@/lib/db/mutations/logObservation";
import { DoseCard } from "./_components/DoseCard";
import { NextVisitBanner } from "./_components/NextVisitBanner";
import { ObservationComposer } from "./_components/ObservationComposer";
import { PatternCard } from "./_components/PatternCard";
import { QuickAddGrid } from "./_components/QuickAddGrid";
import { TagPicker } from "./_components/TagPicker";
import { VoiceNote } from "./_components/VoiceNote";
import { VoiceRecorder } from "./_components/VoiceRecorder";
import { FAB, QuickLogSheet } from "../_components/QuickLogSheet";

type ActiveOverlay = "sheet" | "voice" | "tags" | "school" | null;

/**
 * /today — the home of the app. Today's dose schedule with one-tap logging,
 * wear-off pattern alerts, quick-add shortcuts, next-visit reminder,
 * observation composer, and voice notes. Everything reads from and writes to
 * the local PGlite database; updates are instant.
 */
export default function TodayPage() {
  const child = useChild();
  const { slots, loading } = useTodayDoses();
  const db = usePGlite();

  const [overlay, setOverlay] = useState<ActiveOverlay>(null);

  const greeting = child ? `${child.preferredName}'s day` : "Today";

  function closeOverlay() {
    setOverlay(null);
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <header className="flex items-baseline justify-between">
          <h1 className="text-2xl font-bold tracking-tight">{greeting}</h1>
        </header>

        {loading ? (
          <Card alt>
            <p className="text-sm text-fg-3">Loading today&rsquo;s doses…</p>
          </Card>
        ) : slots.length === 0 ? (
          <Card alt>
            <p className="text-sm text-fg-3">
              No medications scheduled. Add one in settings to start logging doses.
            </p>
          </Card>
        ) : (
          slots.map((slot) => (
            <DoseCard key={`${slot.medicationId}|${slot.scheduledFor}`} slot={slot} />
          ))
        )}

        {/* Wear-off pattern alert — only renders when a pattern is detected */}
        <PatternCard />

        {/* Quick-add 2×2 grid — shortcuts to the observation composer and voice note */}
        <QuickAddGrid />

        {/* Next visit strip — shown when an appointment is within 14 days */}
        <NextVisitBanner />

        <ObservationComposer />
        <VoiceNote />
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
      {/* Backdrop */}
      <div
        role="presentation"
        className="fixed inset-0 z-50 bg-surface-overlay"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Log a school event"
        className="fixed bottom-0 left-0 right-0 z-50 bg-surface-card"
        style={{
          borderRadius: "24px 24px 0 0",
          padding: "12px 20px calc(var(--safe-bottom) + 28px)",
          boxShadow: "0 -20px 60px -10px rgba(14,27,48,0.18)",
        }}
      >
        {/* Grabber */}
        <div
          aria-hidden
          className="mx-auto mb-5"
          style={{
            width: 40,
            height: 4,
            borderRadius: 9999,
            background: "rgba(14,27,48,0.18)",
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
            className="min-h-tap flex flex-1 items-center justify-center rounded-xl text-sm font-semibold text-white transition-opacity duration-fast focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-success-dot disabled:opacity-50"
            style={{
              background: "var(--emerald-600)",
              boxShadow: "0 8px 20px -6px rgba(15,110,86,0.40)",
            }}
          >
            {saving ? "Saving…" : "Save event"}
          </button>
        </div>
      </div>
    </>
  );
}
