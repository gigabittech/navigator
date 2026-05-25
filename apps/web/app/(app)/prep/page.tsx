"use client";

import { useMemo, useState } from "react";
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

/* ── Inline check icon for checkboxes ── */
function CheckIcon() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/* ── Dark navy banner ── */
function PrepBanner({ appointment }: { appointment: NonNullable<ReturnType<typeof useNextAppointment>> }) {
  const apptDate = new Date(appointment.scheduledFor);
  const now = new Date();
  const diffDays = Math.ceil((apptDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const dateLabel = apptDate.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const timeLabel = formatClock(apptDate);
  const daysLabel = diffDays === 1 ? "tomorrow" : `in ${diffDays} days`;

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #0E1B30, #1a3050)",
        color: "#FCFBF6",
        borderRadius: 16,
        padding: "18px 20px",
        marginBottom: 16,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative glow orb */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: -40,
          top: -40,
          width: 140,
          height: 140,
          borderRadius: "50%",
          background: "rgba(15, 110, 86, 0.25)",
          filter: "blur(20px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: "#C9A84C",
          marginBottom: 6,
        }}
      >
        Pre-visit
      </div>
      <h2
        style={{
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          margin: "0 0 4px",
          color: "#FCFBF6",
        }}
      >
        {appointment.with ?? appointment.kind} · {dateLabel}
      </h2>
      <p
        style={{
          fontSize: 13,
          color: "rgba(252, 251, 246, 0.78)",
          margin: 0,
        }}
      >
        {appointment.prepNotes ?? "15-minute med management. Things worth raising."}
      </p>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          marginTop: 12,
          color: "#C9A84C",
        }}
      >
        {daysLabel} · {timeLabel} · in-person
      </div>
    </div>
  );
}

/* ── Interactive checklist ── */
interface ChecklistItem {
  id: string;
  title: string;
  body?: string;
}

function Checklist({ items }: { items: ChecklistItem[] }) {
  const [checked, setChecked] = useState<string[]>([]);

  function toggle(id: string) {
    setChecked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div
      style={{
        background: "white",
        border: "1px solid rgba(14, 27, 48, 0.06)",
        borderRadius: 16,
        padding: "6px 0",
        marginBottom: 14,
        boxShadow: "0 1px 2px rgba(14, 27, 48, 0.04)",
      }}
    >
      {items.map((item) => {
        const done = checked.includes(item.id);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => toggle(item.id)}
            style={{
              display: "grid",
              gridTemplateColumns: "24px 1fr",
              gap: 12,
              alignItems: "start",
              padding: "12px 16px",
              background: "transparent",
              border: "none",
              borderBottom: "1px solid rgba(14, 27, 48, 0.04)",
              width: "100%",
              textAlign: "left",
              cursor: "pointer",
            }}
            aria-pressed={done}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: 6,
                border: done ? "none" : "1.5px solid rgba(14, 27, 48, 0.20)",
                background: done ? "var(--emerald-600)" : "transparent",
                color: "white",
                display: "grid",
                placeItems: "center",
                marginTop: 2,
                flexShrink: 0,
              }}
            >
              {done ? <CheckIcon /> : null}
            </div>
            <div>
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: done ? "var(--fg-4)" : "var(--fg-1)",
                  lineHeight: 1.3,
                  textDecoration: done ? "line-through" : "none",
                }}
              >
                {item.title}
              </div>
              {item.body ? (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--fg-3)",
                    marginTop: 2,
                    lineHeight: 1.4,
                  }}
                >
                  {item.body}
                </div>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}

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

  // Build checklist items from top tags and adherence data
  const checklistItems: ChecklistItem[] = useMemo(() => {
    const items: ChecklistItem[] = [];

    if (summary.topTags.some(([t]) => ["wear-off", "irritable"].includes(t))) {
      items.push({
        id: "wear-off",
        title: "3 pm wear-off window appearing",
        body: "Irritability returning after morning dose. Consider XR booster?",
      });
    }

    if (summary.topTags.some(([t]) => ["low appetite"].includes(t))) {
      items.push({
        id: "appetite",
        title: "Appetite suppression at dinner",
        body: "Eating less at dinner on multiple days. Timing adjustment vs. carb load?",
      });
    }

    if (summary.refused > 0) {
      items.push({
        id: "refusal",
        title: `Dose refusal pattern · ${summary.refused} instance${summary.refused === 1 ? "" : "s"}`,
        body: "Multiple refusals in the window. Worth reviewing with the provider.",
      });
    }

    if (items.length === 0 && summary.count > 0) {
      items.push({
        id: "adherence",
        title: `${summary.adherence}% adherence over last ${PREP_WINDOW_DAYS} days`,
        body: summary.missed > 0 ? `${summary.missed} missed dose${summary.missed === 1 ? "" : "s"} in this window.` : undefined,
      });
    }

    if (items.length === 0) {
      items.push({
        id: "no-events",
        title: "No patterns detected yet",
        body: "Keep logging daily — patterns emerge over 7+ days.",
      });
    }

    return items;
  }, [summary]);

  const openQuestions: ChecklistItem[] = [
    {
      id: "transition",
      title: "School-transition episodes within expected range?",
      body: "Flag any recent incidents or IEP updates.",
    },
    {
      id: "summer",
      title: "Heading into summer break — anything to watch?",
      body: "Loss of structure. Sleep schedule risk.",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">Appointment prep</h1>

      {appointment ? (
        <PrepBanner appointment={appointment} />
      ) : (
        <Card alt>
          <p className="text-sm text-fg-3">
            No appointment scheduled. The summary below is ready whenever one comes up.
          </p>
        </Card>
      )}

      {/* Top changes to discuss — interactive checklist */}
      <div>
        <p
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.06em",
            color: "var(--fg-4)",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          Top changes to discuss
        </p>
        <Checklist items={checklistItems} />
      </div>

      {/* Adherence stats */}
      <Card>
        <p className="eyebrow mb-3">Last {PREP_WINDOW_DAYS} days · overview</p>
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

      {/* Open questions checklist */}
      <div>
        <p
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.06em",
            color: "var(--fg-4)",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          Open questions
        </p>
        <Checklist items={openQuestions} />
      </div>

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

