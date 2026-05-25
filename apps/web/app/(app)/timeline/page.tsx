"use client";

import { useMemo } from "react";
import { Card, Pill } from "@navigator/design-system/components";
import { useTimeline } from "@/lib/db/queries/useTimeline";
import { useMedications } from "@/lib/db/queries/useMedications";
import { dayHeading, dayKey, relativeTime } from "@/lib/time";
import { describeEvent } from "./_components/eventDisplay";
import type { EventRow } from "@/lib/db/types";

export default function TimelinePage() {
  const events = useTimeline(300);
  const meds = useMedications();

  const medName = useMemo(() => {
    const byId = new Map(meds.map((m) => [m.id, m.name]));
    return (id: string) => byId.get(id) ?? "Medication";
  }, [meds]);

  const groups = useMemo(() => {
    const out: { key: string; heading: string; items: EventRow[] }[] = [];
    let current: { key: string; heading: string; items: EventRow[] } | null = null;
    for (const e of events) {
      const key = dayKey(e.occurredAt);
      if (!current || current.key !== key) {
        current = { key, heading: dayHeading(e.occurredAt), items: [] };
        out.push(current);
      }
      current.items.push(e);
    }
    return out;
  }, [events]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">Timeline</h1>

      {events.length === 0 ? (
        <Card alt>
          <p className="text-sm text-fg-3">
            Nothing logged yet. Start with this morning&rsquo;s dose on the Today tab.
          </p>
        </Card>
      ) : (
        groups.map((group) => (
          <section key={group.key} className="flex flex-col gap-2">
            <h2 className="sticky top-12 z-[5] -mx-1 px-1 py-1 text-xs font-semibold text-fg-3 bg-surface-page/90 backdrop-blur">
              {group.heading}
            </h2>
            {group.items.map((e) => {
              const d = describeEvent(e, medName);
              return (
                <Card key={e.id} alt elevation="flat" className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-base font-medium text-fg-1 truncate">{d.title}</p>
                      {d.detail ? <p className="text-sm text-fg-3 mt-0.5">{d.detail}</p> : null}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {d.status ? <Pill tone={d.tone}>{d.status}</Pill> : null}
                      <span className="text-2xs text-fg-4">{relativeTime(e.occurredAt)}</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </section>
        ))
      )}
    </div>
  );
}
