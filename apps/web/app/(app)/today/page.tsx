"use client";

import { Card } from "@navigator/design-system/components";
import { useChild } from "@/lib/db/queries/useChild";
import { useTodayDoses } from "@/lib/db/queries/useTodayDoses";
import { DoseCard } from "./_components/DoseCard";
import { ObservationComposer } from "./_components/ObservationComposer";
import { VoiceNote } from "./_components/VoiceNote";

/**
 * /today — the home of the app. Today's dose schedule with one-tap logging,
 * plus a quick observation composer. Everything reads from and writes to the
 * local PGlite database; updates are instant.
 */
export default function TodayPage() {
  const child = useChild();
  const { slots, loading } = useTodayDoses();

  const greeting = child ? `${child.preferredName}'s day` : "Today";

  return (
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

      <ObservationComposer />
      <VoiceNote />
    </div>
  );
}
