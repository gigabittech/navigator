"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { BackHeader } from "../_components/BackHeader";
import { ProgressBar } from "../_components/ProgressBar";

interface MedOption {
  name: string;
  drugClass: string;
}

const MED_LIST: MedOption[] = [
  { name: "Adderall XR", drugClass: "Stimulant · amphetamine" },
  { name: "Adderall IR", drugClass: "Stimulant · amphetamine" },
  { name: "Vyvanse", drugClass: "Stimulant · lisdexamfetamine" },
  { name: "Concerta", drugClass: "Stimulant · methylphenidate ER" },
  { name: "Ritalin", drugClass: "Stimulant · methylphenidate IR" },
  { name: "Strattera", drugClass: "Non-stimulant · atomoxetine" },
  { name: "Guanfacine ER", drugClass: "Non-stimulant · alpha-2 agonist" },
  { name: "Intuniv", drugClass: "Non-stimulant · guanfacine ER" },
  { name: "Sertraline", drugClass: "Antidepressant · SSRI" },
  { name: "Lexapro", drugClass: "Antidepressant · SSRI" },
  { name: "Aripiprazole", drugClass: "Atypical antipsychotic" },
  { name: "Methylphenidate ER", drugClass: "Stimulant · methylphenidate" },
  { name: "Focalin XR", drugClass: "Stimulant · dexmethylphenidate" },
  { name: "Daytrana", drugClass: "Stimulant · methylphenidate patch" },
  { name: "Kapvay", drugClass: "Non-stimulant · clonidine ER" },
  { name: "Fluoxetine", drugClass: "Antidepressant · SSRI" },
];

/**
 * S_AddMed — Step 2 of 4. Search and select one or more medications.
 * Selections are stored in localStorage for the final step.
 */
export default function MedicationsPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MED_LIST;
    return MED_LIST.filter(
      (m) => m.name.toLowerCase().includes(q) || m.drugClass.toLowerCase().includes(q),
    );
  }, [query]);

  function toggleMed(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  function handleContinue() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "navigator.onboarding.medications",
        JSON.stringify(Array.from(selected)),
      );
    }
    router.push("/onboarding/reminders");
  }

  const buttonLabel =
    selected.size === 0
      ? "Continue without medications"
      : `Continue with ${selected.size} medication${selected.size > 1 ? "s" : ""}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <BackHeader title="Add medication" />

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "4px 20px 96px",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <ProgressBar step={1} />

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
            Step 2 of 4
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
            What are they taking?
          </h1>
          <p
            style={{
              marginTop: 8,
              fontSize: 14,
              color: "var(--fg-onboarding-body)",
              lineHeight: 1.5,
            }}
          >
            Search and select medications. Add multiple — you can set timing after setup.
          </p>
        </div>

        {/* Search box */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "20px 1fr",
            gap: 10,
            alignItems: "center",
            background: "var(--surface-onboarding-card)",
            border: "1px solid var(--border-onboarding-subtle)",
            borderRadius: 12,
            padding: "12px 14px",
            marginBottom: 14,
            color: "var(--fg-onboarding-muted)",
          }}
        >
          <SearchIcon />
          <input
            type="search"
            placeholder="Search medications"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 15,
              color: "var(--fg-onboarding-title)",
              fontFamily: "inherit",
              width: "100%",
            }}
            aria-label="Search medications"
          />
        </div>

        {/* Results */}
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }} role="listbox" aria-label="Medication results">
          {filtered.length === 0 && (
            <li
              style={{
                padding: "14px 14px",
                background: "var(--surface-onboarding-card)",
                border: "1px solid var(--border-onboarding-subtle)",
                borderRadius: 12,
                marginBottom: 8,
                fontSize: 14,
                color: "var(--fg-onboarding-body)",
              }}
            >
              No medications match that search.
            </li>
          )}
          {filtered.map((med) => {
            const isSelected = selected.has(med.name);
            return (
              <li key={med.name} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => toggleMed(med.name)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "36px 1fr auto",
                    gap: 12,
                    alignItems: "center",
                    padding: "14px",
                    background: isSelected
                      ? "var(--onboarding-accent-tint-soft)"
                      : "var(--surface-onboarding-card)",
                    border: isSelected
                      ? "1px solid var(--onboarding-accent)"
                      : "1px solid var(--border-onboarding-subtle)",
                    borderRadius: 12,
                    marginBottom: 8,
                    width: "100%",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    textAlign: "left",
                    minHeight: 44,
                    transition: "background 150ms ease, border-color 150ms ease",
                  }}
                >
                  {/* Icon */}
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: isSelected
                        ? "var(--onboarding-accent-tint)"
                        : "var(--surface-onboarding-sunk)",
                      color: isSelected
                        ? "var(--onboarding-accent)"
                        : "var(--fg-onboarding-body)",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                    aria-hidden
                  >
                    <PillIcon />
                  </div>

                  {/* Label */}
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--fg-onboarding-title)",
                        lineHeight: 1.2,
                      }}
                    >
                      {med.name}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--fg-onboarding-muted)", marginTop: 2 }}>
                      {med.drugClass}
                    </div>
                  </div>

                  {/* Badge / plus */}
                  {isSelected ? (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "3px 9px",
                        borderRadius: 9999,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        background: "var(--onboarding-accent-tint)",
                        color: "var(--onboarding-accent)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <CheckIcon size={11} /> Added
                    </span>
                  ) : (
                    <PlusIcon />
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Custom medication hint */}
        <div
          style={{
            marginTop: 4,
            padding: "12px 14px",
            background: "var(--onboarding-accent-tint-soft)",
            borderRadius: 12,
            fontSize: 12,
            color: "var(--onboarding-accent-strong)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <SparklesIcon />
          Can&rsquo;t find it? You can add custom medications from Settings after setup.
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
            marginTop: 20,
            minHeight: 44,
          }}
        >
          {buttonLabel}
          <ArrowRight />
        </button>
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.5" />
      <path d="m13 13 2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function PillIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect
        x="3"
        y="7"
        width="12"
        height="4"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
        transform="rotate(-45 3 7)"
      />
      <line
        x1="6.5"
        y1="11.5"
        x2="11.5"
        y2="6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M2.5 7 6 10.5 11.5 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden style={{ color: "var(--fg-onboarding-muted)" }}>
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M7 1v2M7 11v2M1 7h2M11 7h2M3 3l1.4 1.4M9.6 9.6 11 11M3 11l1.4-1.4M9.6 4.4 11 3"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
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
