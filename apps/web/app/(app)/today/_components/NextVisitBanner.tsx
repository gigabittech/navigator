"use client";

import { useNextAppointment } from "@/lib/db/queries/useNextAppointment";

const DAYS_THRESHOLD = 14;

function ChevronRight() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  );
}

/**
 * Small next-visit row shown when an appointment is within 14 days.
 * Matches the bottom strip from S_Today in the design spec.
 */
export function NextVisitBanner() {
  const appt = useNextAppointment();

  if (!appt) return null;

  const now = new Date();
  const apptDate = new Date(appt.scheduledFor);
  const diffMs = apptDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > DAYS_THRESHOLD || diffDays < 0) return null;

  const dateLabel = apptDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const label = [
    "Next visit",
    appt.with ? `${appt.with}` : appt.kind,
    dateLabel,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      style={{
        padding: "12px 14px",
        background: "white",
        border: "1px solid rgba(14, 27, 48, 0.06)",
        borderRadius: 14,
        fontSize: 12,
        color: "var(--fg-3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 14,
        boxShadow: "0 1px 2px rgba(14, 27, 48, 0.04)",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          color: "var(--fg-3)",
        }}
      >
        <span style={{ color: "var(--fg-4)" }}>
          <CalendarIcon />
        </span>
        {label}
      </span>
      <span style={{ color: "var(--fg-4)" }}>
        <ChevronRight />
      </span>
    </div>
  );
}
