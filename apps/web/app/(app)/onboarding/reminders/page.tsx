"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BackHeader } from "../_components/BackHeader";
import { ProgressBar } from "../_components/ProgressBar";

interface ReminderSlot {
  id: string;
  label: string;
  subLabel: string;
}

const DEFAULT_SLOTS: ReminderSlot[] = [
  { id: "morning", label: "7:30 am", subLabel: "Morning dose · weekdays" },
  { id: "noon", label: "12:00 pm", subLabel: "Noon dose · weekdays" },
  { id: "evening", label: "8:00 pm", subLabel: "Evening dose · daily" },
];

/**
 * S_Reminders — Step 3 of 4. Toggle reminder slots. Pure UI state persisted
 * to localStorage. Push notifications will wire up in a later phase.
 */
export default function RemindersPage() {
  const router = useRouter();
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    morning: true,
    noon: true,
    evening: true,
  });
  const [schoolMode, setSchoolMode] = useState(false);

  function toggleSlot(id: string) {
    setEnabled((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleContinue() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "navigator.onboarding.reminders",
        JSON.stringify({ slots: enabled, schoolMode }),
      );
    }
    router.push("/onboarding/done");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <BackHeader title="Reminders" />

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "4px 20px 96px",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <ProgressBar step={2} />

        {/* Page header */}
        <div style={{ padding: "8px 0 20px" }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--fg-onboarding-muted)",
            }}
          >
            Step 3 of 4
          </div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              marginTop: 2,
              marginBottom: 0,
              color: "var(--fg-onboarding-title)",
            }}
          >
            When should we nudge you?
          </h1>
          <p
            style={{
              marginTop: 8,
              fontSize: 14,
              color: "var(--fg-onboarding-body)",
              lineHeight: 1.5,
            }}
          >
            Reminders are gentle — one notification, no escalation. You can change these
            any time from Settings.
          </p>
        </div>

        {/* Reminder slots card */}
        <div
          style={{
            background: "var(--surface-onboarding-card)",
            border: "1px solid var(--border-onboarding-subtle)",
            borderRadius: 16,
            overflow: "hidden",
            marginBottom: 10,
          }}
          role="group"
          aria-label="Reminder times"
        >
          {DEFAULT_SLOTS.map((slot, i) => {
            const on = enabled[slot.id] ?? false;
            return (
              <div
                key={slot.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "44px 1fr auto",
                  gap: 12,
                  alignItems: "center",
                  padding: "14px 16px",
                  borderBottom:
                    i < DEFAULT_SLOTS.length - 1
                      ? "1px solid var(--border-onboarding-subtle)"
                      : "none",
                }}
              >
                {/* Bell icon */}
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: on
                      ? "var(--onboarding-accent-tint)"
                      : "var(--surface-onboarding-sunk)",
                    color: on ? "var(--onboarding-accent)" : "var(--fg-onboarding-muted)",
                    display: "grid",
                    placeItems: "center",
                    transition: "background 200ms, color 200ms",
                  }}
                  aria-hidden
                >
                  <BellIcon />
                </div>

                {/* Label */}
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--fg-onboarding-title)",
                    }}
                  >
                    {slot.label}
                  </div>
                  <div
                    style={{
                      fontSize: 11.5,
                      color: "var(--fg-onboarding-muted)",
                      marginTop: 2,
                    }}
                  >
                    {slot.subLabel}
                  </div>
                </div>

                {/* Toggle */}
                <Toggle
                  on={on}
                  onToggle={() => toggleSlot(slot.id)}
                  label={`Toggle ${slot.label} reminder`}
                />
              </div>
            );
          })}
        </div>

        {/* Add reminder (placeholder) */}
        <button
          type="button"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            width: "100%",
            padding: "16px 22px",
            background: "transparent",
            color: "var(--fg-onboarding-title)",
            border: "1px solid var(--border-onboarding-strong)",
            borderRadius: 14,
            fontSize: 15,
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: "pointer",
            marginBottom: 16,
            minHeight: 44,
          }}
          onClick={() => {
            // Phase 2: open a time picker sheet
          }}
        >
          <PlusIcon />
          Add another reminder
        </button>

        {/* School-day mode card */}
        <div
          style={{
            background: "var(--surface-onboarding)",
            border: "1px dashed var(--border-onboarding)",
            borderRadius: 16,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "var(--fg-onboarding-title)",
              }}
            >
              School-day mode
            </span>
            <Toggle
              on={schoolMode}
              onToggle={() => setSchoolMode((v) => !v)}
              label="Toggle school-day mode"
            />
          </div>
          <p
            style={{
              fontSize: 12,
              color: "var(--fg-onboarding-body)",
              margin: 0,
              lineHeight: 1.45,
            }}
          >
            Pause home reminders during school hours. You can set up school-nurse
            notifications from Settings.
          </p>
        </div>

        <button
          type="button"
          onClick={handleContinue}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            width: "100%",
            padding: "16px 22px",
            background: "var(--onboarding-accent)",
            color: "var(--fg-on-dark)",
            border: "none",
            borderRadius: 14,
            fontSize: 15,
            fontWeight: 600,
            fontFamily: "inherit",
            boxShadow: "var(--onboarding-accent-shadow)",
            cursor: "pointer",
            minHeight: 44,
          }}
        >
          Continue
          <ArrowRight />
        </button>
      </div>
    </div>
  );
}

/** Pill-shaped on/off toggle. */
function Toggle({
  on,
  onToggle,
  label,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      style={{
        width: 38,
        height: 22,
        background: on ? "var(--onboarding-accent)" : "var(--border-onboarding-strong)",
        borderRadius: 9999,
        position: "relative",
        border: "none",
        cursor: "pointer",
        padding: 0,
        flexShrink: 0,
        transition: "background 200ms ease",
        minWidth: 38, // explicit — tab target is the wrapper row
      }}
    >
      <span
        style={{
          position: "absolute",
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "var(--surface-onboarding-card)",
          top: 2,
          left: on ? "calc(100% - 20px)" : 2,
          boxShadow: "0 1px 2px rgba(0,0,0,0.10)",
          transition: "left 200ms ease",
        }}
      />
    </button>
  );
}

function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 2a4 4 0 0 1 4 4v3l1 1.5H3L4 9V6a4 4 0 0 1 4-4zM6.5 13.5a1.5 1.5 0 0 0 3 0"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M3.75 9h10.5M9.75 4.5 14.25 9l-4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
