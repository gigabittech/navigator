"use client";

import { useState } from "react";
import { usePGlite } from "@electric-sql/pglite-react";
import { Card, Pill, type PillProps } from "@navigator/design-system/components";
import type { DoseSlot } from "@/lib/db/types";
import { logDoseEvent, type DoseOutcome } from "@/lib/db/mutations/logDoseEvent";
import { correctDoseEvent } from "@/lib/db/mutations/correctDoseEvent";
import { formatClock } from "@/lib/time";
import { formatDose } from "@/lib/format";

const OUTCOMES: { value: DoseOutcome; label: string }[] = [
  { value: "taken", label: "Taken" },
  { value: "late", label: "Late" },
  { value: "missed", label: "Missed" },
  { value: "refused", label: "Refused" },
];

const STATUS_PILL: Record<DoseSlot["status"], { tone: PillProps["tone"]; label: string }> = {
  scheduled: { tone: "neutral", label: "Scheduled" },
  taken: { tone: "success", label: "Taken" },
  late: { tone: "warning", label: "Late" },
  missed: { tone: "danger", label: "Missed" },
  refused: { tone: "danger", label: "Refused" },
  vomited: { tone: "danger", label: "Brought back up" },
};

export function DoseCard({ slot }: { slot: DoseSlot }) {
  const db = usePGlite();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<DoseOutcome | null>(null);

  const logged = slot.status !== "scheduled";
  const pill = STATUS_PILL[slot.status];
  const pillLabel =
    slot.status === "late" && slot.minutesOffset
      ? `Late · ${slot.minutesOffset}m`
      : pill.label;

  async function record(outcome: DoseOutcome) {
    setError(null);
    setPending(outcome);
    try {
      if (logged && slot.sourceEventId) {
        await correctDoseEvent(db, { correctsEventId: slot.sourceEventId, newStatus: outcome });
      } else {
        await logDoseEvent(db, {
          medicationId: slot.medicationId,
          scheduledFor: slot.scheduledFor,
          doseMg: Number(slot.doseMg),
          outcome,
        });
      }
    } catch {
      setError("Couldn't log that. It stays on this device — try again.");
    } finally {
      setPending(null);
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-fg-3">{formatClock(slot.scheduledFor)} · scheduled</p>
        <Pill tone={pill.tone}>{pillLabel}</Pill>
      </div>

      <p className="text-lg font-semibold text-fg-1">{slot.medicationName}</p>
      <p className="metric mt-1">{formatDose(slot.doseMg)} mg</p>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={`Log ${slot.medicationName}`}>
        {OUTCOMES.map(({ value, label }) => {
          const active = slot.status === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => record(value)}
              disabled={pending !== null}
              aria-pressed={slot.status === value}
              className={`min-h-tap px-4 rounded-full border text-sm font-medium transition-colors duration-fast disabled:opacity-50 ${
                active
                  ? "bg-accent-600 text-fg-on-accent border-transparent"
                  : "bg-surface-card-alt text-fg-2 border-border-card hover:text-fg-1"
              }`}
            >
              {pending === value ? "Saving" : label}
            </button>
          );
        })}
      </div>

      {logged ? (
        <p className="text-xs text-fg-3 mt-3">
          {slot.corrected ? "Corrected. " : ""}Tap a different option to change it.
        </p>
      ) : null}

      {error ? <p className="text-xs text-danger-fg mt-3">{error}</p> : null}
    </Card>
  );
}
