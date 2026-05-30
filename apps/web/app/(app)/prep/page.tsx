"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button, Card, Pill } from "@navigator/design-system/components";
import {
  adherenceRate,
  projectDoseStatus,
  EventType,
  type LogEvent,
} from "@navigator/schema";
import { usePGlite, useLiveQuery } from "@electric-sql/pglite-react";
import { useNextAppointment } from "@/lib/db/queries/useNextAppointment";
import { useTimeline } from "@/lib/db/queries/useTimeline";
import { useChild } from "@/lib/db/queries/useChild";
import { formatClock } from "@/lib/time";
import { APPOINTMENT_COLUMNS } from "@/lib/db/sql";
import type { AppointmentRow } from "@/lib/db/types";

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
        background: "linear-gradient(135deg, var(--ink-800), var(--ink-700))",
        color: "var(--fg-on-dark)",
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
          background: "var(--surface-on-dark-active)",
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
          color: "var(--accent-gold-on-dark)",
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
          color: "var(--fg-on-dark)",
        }}
      >
        {appointment.with ?? appointment.kind} · {dateLabel}
      </h2>
      <p
        style={{
          fontSize: 13,
          color: "var(--fg-on-dark-muted)",
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
          color: "var(--accent-gold-on-dark)",
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
        background: "var(--surface-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 16,
        padding: "6px 0",
        marginBottom: 14,
        boxShadow: "var(--shadow-sm)",
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
              borderBottom: "1px solid var(--border-subtle)",
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
                border: done ? "none" : "1.5px solid var(--border-strong)",
                background: done ? "var(--color-success-fg)" : "transparent",
                color: "var(--fg-on-accent)",
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

/* ── Add appointment form ── */

function AddAppointmentForm({ onSaved }: { onSaved: () => void }) {
  const db = usePGlite();
  const [providerName, setProviderName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const providerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    providerRef.current?.focus();
  }, []);

  async function save() {
    if (!providerName.trim()) {
      setError("Enter the provider name.");
      return;
    }
    if (!date) {
      setError("Choose an appointment date.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const scheduledFor = time ? `${date}T${time}:00` : `${date}T00:00:00`;
      const childRes = await db.query<{ id: string }>(
        "SELECT id FROM children ORDER BY created_at LIMIT 1",
      );
      const childId = childRes.rows[0]?.id;
      if (!childId) throw new Error("No child on this device.");
      await db.query(
        `INSERT INTO appointments (child_id, kind, "with", scheduled_for, prep_notes)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          childId,
          "Appointment",
          providerName.trim(),
          scheduledFor,
          notes.trim() || null,
        ],
      );
      onSaved();
    } catch {
      setError("Couldn't save that. It's still on this device.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--border-card)",
        borderRadius: 16,
        padding: "16px",
        marginTop: 8,
      }}
    >
      <p className="text-sm font-semibold text-fg-1 mb-3">New appointment</p>
      <div className="flex flex-col gap-3">
        <div>
          <label
            className="text-xs text-fg-3 mb-1 block"
            htmlFor="appt-provider"
          >
            Doctor or provider
          </label>
          <input
            id="appt-provider"
            ref={providerRef}
            type="text"
            value={providerName}
            onChange={(e) => setProviderName(e.target.value)}
            placeholder="Dr. Alvarez"
            disabled={saving}
            className="w-full rounded-xl border border-border-card bg-surface-input px-3.5 py-2.5 text-sm text-fg-1 placeholder:text-fg-4 focus:outline-none focus-within:border-border-accent disabled:opacity-50"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-fg-3 mb-1 block" htmlFor="appt-date">
              Date
            </label>
            <input
              id="appt-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={saving}
              className="w-full rounded-xl border border-border-card bg-surface-input px-3.5 py-2.5 text-sm text-fg-1 focus:outline-none focus-within:border-border-accent disabled:opacity-50"
            />
          </div>
          <div>
            <label className="text-xs text-fg-3 mb-1 block" htmlFor="appt-time">
              Time (optional)
            </label>
            <input
              id="appt-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              disabled={saving}
              className="w-full rounded-xl border border-border-card bg-surface-input px-3.5 py-2.5 text-sm text-fg-1 focus:outline-none focus-within:border-border-accent disabled:opacity-50"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-fg-3 mb-1 block" htmlFor="appt-notes">
            Notes (optional)
          </label>
          <textarea
            id="appt-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="What to bring up at this visit…"
            disabled={saving}
            className="w-full resize-none rounded-xl border border-border-card bg-surface-input px-3.5 py-2.5 text-sm text-fg-1 placeholder:text-fg-4 focus:outline-none focus-within:border-border-accent disabled:opacity-50"
          />
        </div>
        {error ? (
          <p className="text-xs text-danger-fg" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSaved}
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
            {saving ? "Saving…" : "Save appointment"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Upcoming appointments list ── */

function UpcomingAppointments() {
  const db = usePGlite();
  const [showForm, setShowForm] = useState(false);
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const res = useLiveQuery<AppointmentRow>(
    `SELECT ${APPOINTMENT_COLUMNS} FROM appointments
     WHERE scheduled_for >= now() ORDER BY scheduled_for ASC`,
    [],
  );
  const appointments = res?.rows ?? [];

  function handleSaved() {
    setShowForm(false);
    setSaved(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
  }

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  async function deleteAppointment(id: string) {
    await db.query("DELETE FROM appointments WHERE id = $1", [id]);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.06em",
            color: "var(--fg-4)",
            textTransform: "uppercase",
          }}
        >
          Upcoming appointments
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="text-xs font-semibold text-accent-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-border-accent"
          >
            Add appointment
          </button>
        ) : null}
      </div>

      {saved ? (
        <p className="text-xs text-fg-3 mb-2" role="status">
          Appointment saved.
        </p>
      ) : null}

      {showForm ? (
        <AddAppointmentForm onSaved={handleSaved} />
      ) : null}

      {appointments.length === 0 && !showForm ? (
        <p className="text-sm text-fg-3">
          No upcoming appointments. Add one to start preparing.
        </p>
      ) : (
        <div
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 16,
            padding: "6px 0",
            boxShadow: "var(--shadow-sm)",
            marginTop: showForm ? 8 : 0,
          }}
        >
          {appointments.map((appt, idx) => {
            const apptDate = new Date(appt.scheduledFor);
            const dateLabel = apptDate.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            });
            const timeLabel = formatClock(apptDate);
            return (
              <div
                key={appt.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  borderBottom:
                    idx < appointments.length - 1
                      ? "1px solid var(--border-subtle)"
                      : "none",
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-fg-1 truncate">
                    {appt.with ?? appt.kind}
                  </p>
                  <p
                    className="text-xs text-fg-3 mt-0.5"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {dateLabel} · {timeLabel}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void deleteAppointment(appt.id)}
                  className="text-xs text-fg-4 hover:text-danger-fg transition-colors duration-fast focus:outline-none focus-visible:ring-2 focus-visible:ring-border-accent shrink-0 min-h-tap flex items-center"
                  aria-label={`Remove appointment with ${appt.with ?? appt.kind}`}
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── PrepPage ── */

export default function PrepPage() {
  const child = useChild();
  const appointment = useNextAppointment(child?.id);
  const events = useTimeline(400, child?.id);

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

      {/* Appointment scheduling — add / view upcoming */}
      <UpcomingAppointments />

      {appointment ? (
        <PrepBanner appointment={appointment} />
      ) : null}

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

