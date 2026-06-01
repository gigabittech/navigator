"use client";

import React from "react";

/* ── Inline SVG icons ── */
function QIcon({ name }: { name: string }) {
  const p = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "mic":
      return (
        <svg {...p}>
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" x2="12" y1="19" y2="22" />
        </svg>
      );
    case "pencil":
      return (
        <svg {...p}>
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...p}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" x2="16" y1="2" y2="6" />
          <line x1="8" x2="8" y1="2" y2="6" />
          <line x1="3" x2="21" y1="10" y2="10" />
        </svg>
      );
    case "sparkles":
      return (
        <svg {...p}>
          <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
        </svg>
      );
    default:
      return null;
  }
}

interface QuickAddGridProps {
  onVoiceNote?: () => void;
  onObservation?: () => void;
  onSchoolEvent?: () => void;
  onSideEffect?: () => void;
}

interface CellConfig {
  icon: string;
  title: string;
  subtitle: string;
  variant: "default" | "alt" | "alt2" | "alt3";
  onClick?: () => void;
}

const ICON_BG: Record<CellConfig["variant"], string> = {
  default: "var(--cta-success-tint)",
  alt:     "var(--color-info-bg)",
  alt2:    "var(--color-warning-bg)",
  alt3:    "var(--accent-gold-bg)",
};

const ICON_COLOR: Record<CellConfig["variant"], string> = {
  default: "var(--color-success-fg)",
  alt:     "var(--color-info-fg)",
  alt2:    "var(--color-warning-fg)",
  alt3:    "var(--accent-gold-600)",
};

function QuickCell({ icon, title, subtitle, variant, onClick }: CellConfig) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-tap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page"
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 14,
        padding: 16,
        display: "grid",
        gap: 10,
        textAlign: "left",
        cursor: "pointer",
        width: "100%",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: ICON_BG[variant],
          color: ICON_COLOR[variant],
          display: "grid",
          placeItems: "center",
        }}
      >
        <QIcon name={icon} />
      </div>
      <div>
        <h4
          style={{
            fontSize: 14,
            fontWeight: 700,
            margin: 0,
            color: "var(--fg-1)",
          }}
        >
          {title}
        </h4>
        <p
          style={{
            fontSize: 12,
            color: "var(--fg-3)",
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          {subtitle}
        </p>
      </div>
    </button>
  );
}

/**
 * 2×2 quick-add grid matching the S_Today design spec.
 * Each cell is a button; callers wire up the action via props.
 */
export function QuickAddGrid({
  onVoiceNote,
  onObservation,
  onSchoolEvent,
  onSideEffect,
}: QuickAddGridProps) {
  const cells: CellConfig[] = [
    {
      icon: "mic",
      title: "Voice note",
      subtitle: "Hold & talk",
      variant: "default",
      onClick: onVoiceNote,
    },
    {
      icon: "pencil",
      title: "Observation",
      subtitle: "Type a quick note",
      variant: "alt",
      onClick: onObservation,
    },
    {
      icon: "calendar",
      title: "School event",
      subtitle: "Email · IEP",
      variant: "alt2",
      onClick: onSchoolEvent,
    },
    {
      icon: "sparkles",
      title: "Side effect",
      subtitle: "Tagged log",
      variant: "alt3",
      onClick: onSideEffect,
    },
  ];

  return (
    <div
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 16,
        padding: 16,
        marginBottom: 14,
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--fg-1)" }}>
          Quick add
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-4)",
          }}
        >
          15 sec
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        {cells.map((cell) => (
          <QuickCell key={cell.title} {...cell} />
        ))}
      </div>
    </div>
  );
}
