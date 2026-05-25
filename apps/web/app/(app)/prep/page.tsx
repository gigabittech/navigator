"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Button, Card, Pill } from "@navigator/design-system/components";
import {
  adherenceRate,
  projectDoseStatus,
  EventType,
  type LogEvent,
} from "@navigator/schema";
import { useNextAppointment } from "@/lib/db/queries/useNextAppointment";
import { useTimeline } from "@/lib/db/queries/useTimeline";
import { formatClock } from "@/lib/time";

const PREP_WINDOW_DAYS = 14;

export default function PrepPage() {
  const appointment = useNextAppointment();
  const events = useTimeline(400);

  const summary = useMemo(() => {
    const since = new Date();
    since.setDate(since.getDate() - PREP_WINDOW_DAYS);
    const windowEvents = events.filter((e) => new Date(e.occurredAt) >= since);

    const snapshots = projectDoseStatus(windowEvents as unknown as LogEvent[]);
    const adherence = adherenceRate(snapshots);
    const missed = snapshots.filter((s) => s.status === "missed").length;
    const refused = snapshots.filter((s) => s.status === "refused").length;

    const tagCounts = new Map<string, number>();
    for (const e of windowEvents) {
      if (e.eventType !== EventType.BehaviorObserved) continue;
      const tags = Array.isArray(e.payload["tags"]) ? (e.payload["tags"] as string[]) : [];
      for (const t of tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
    }
    const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

    return { adherence, missed, refused, topTags, count: windowEvents.length };
  }, [events]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">Appointment prep</h1>

      {appointment ? (
        <Card>
          <p className="eyebrow mb-2">Next appointment</p>
          <p className="text-lg font-semibold text-fg-1">{appointment.kind}</p>
          {appointment.with ? <p className="text-sm text-fg-2">with {appointment.with}</p> : null}
          <p className="text-sm text-fg-3 mt-2">{formatApptDate(appointment.scheduledFor)}</p>
          {appointment.prepNotes ? (
            <p className="text-sm text-fg-2 mt-3 border-l-2 border-border-accent pl-3">
              {appointment.prepNotes}
            </p>
          ) : null}
        </Card>
      ) : (
        <Card alt>
          <p className="text-sm text-fg-3">
            No appointment scheduled. The summary below is ready whenever one comes up.
          </p>
        </Card>
      )}

      <Card>
        <p className="eyebrow mb-3">Last {PREP_WINDOW_DAYS} days · what to bring up</p>
        <div className="grid grid-cols-3 gap-3">
          <Stat value={`${summary.adherence}%`} label="Adherence" />
          <Stat value={`${summary.missed}`} label="Missed" />
          <Stat value={`${summary.refused}`} label="Refused" />
        </div>

        {summary.topTags.length ? (
          <div className="mt-4">
            <p className="text-xs text-fg-3 mb-2">Most-noted</p>
            <div className="flex flex-wrap gap-2">
              {summary.topTags.map(([tag, n]) => (
                <Pill key={tag} tone="info">
                  {tag} · {n}
                </Pill>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-fg-3 mt-4">
            No observations logged in this window yet.
          </p>
        )}
      </Card>

      <Link href="/report">
        <Button variant="secondary" fullWidth>
          Open the full 90-day report
        </Button>
      </Link>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="metric">{value}</p>
      <p className="text-xs text-fg-3 mt-1">{label}</p>
    </div>
  );
}

function formatApptDate(input: Date | string): string {
  const d = new Date(input);
  const date = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  return `${date} · ${formatClock(d)}`;
}
