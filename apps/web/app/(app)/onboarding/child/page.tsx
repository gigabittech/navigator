"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BackHeader } from "../_components/BackHeader";
import { ProgressBar } from "../_components/ProgressBar";

const DIAGNOSES = ["ADHD", "Anxiety", "Mood disorder", "Autism", "Depression", "Dyslexia"] as const;
type Diagnosis = (typeof DIAGNOSES)[number];

/**
 * S_AddChild — Step 1 of 4. Collects the child's name, age, pronouns, and
 * optional diagnoses. Persists to localStorage for the final step to write
 * to the DB.
 */
export default function AddChildPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<Set<Diagnosis>>(new Set());
  const [error, setError] = useState<string | null>(null);

  function toggleDiagnosis(d: Diagnosis) {
    setSelectedDiagnoses((prev) => {
      const next = new Set(prev);
      if (next.has(d)) {
        next.delete(d);
      } else {
        next.add(d);
      }
      return next;
    });
  }

  function handleContinue() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("A first name is required to continue.");
      return;
    }
    setError(null);

    // Persist to localStorage — done/page.tsx will read and write to the DB.
    const data = {
      name: trimmedName,
      age: age.trim() || null,
      pronouns: pronouns.trim() || null,
      diagnoses: Array.from(selectedDiagnoses),
    };
    if (typeof window !== "undefined") {
      window.localStorage.setItem("navigator.onboarding.child", JSON.stringify(data));
    }

    router.push("/onboarding/medications");
  }

  const inputStyle: React.CSSProperties = {
    background: "var(--surface-onboarding-card)",
    border: "1px solid var(--border-onboarding)",
    borderRadius: 12,
    padding: "14px 16px",
    fontSize: 16,
    fontFamily: "inherit",
    color: "var(--fg-onboarding-title)",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };

  // Focus style is handled by the global :focus-visible rule in tokens.css.
  // onFocus/onBlur add the accent ring inline so it works without Tailwind JIT.
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "var(--onboarding-accent)";
    e.currentTarget.style.boxShadow = "0 0 0 3px var(--onboarding-accent-ring)";
  };
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "var(--border-onboarding)";
    e.currentTarget.style.boxShadow = "none";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <BackHeader title="New profile" />

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "4px 20px 96px",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <ProgressBar step={0} />

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
            Step 1 of 4
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
            Who is this for?
          </h1>
          <p
            style={{
              marginTop: 8,
              fontSize: 14,
              color: "var(--fg-onboarding-body)",
              lineHeight: 1.5,
            }}
          >
            Navigator keeps separate profiles for each child. You can invite a co-parent later.
          </p>
        </div>

        {/* Name field */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
          <label
            htmlFor="child-name"
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--fg-onboarding-muted)",
            }}
          >
            First name
          </label>
          <input
            id="child-name"
            type="text"
            autoComplete="given-name"
            placeholder="e.g. Ezra"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={{
              ...inputStyle,
              fontWeight: name ? 600 : 400,
            }}
            aria-required="true"
            aria-describedby={error ? "name-error" : undefined}
          />
          {error && (
            <p
              id="name-error"
              role="alert"
              style={{
                fontSize: 12,
                color: "var(--color-danger-fg)",
                margin: 0,
              }}
            >
              {error}
            </p>
          )}
        </div>

        {/* Age + Pronouns row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
            <label
              htmlFor="child-age"
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--fg-onboarding-muted)",
              }}
            >
              Age
            </label>
            <input
              id="child-age"
              type="number"
              min={1}
              max={25}
              placeholder="9"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{
                ...inputStyle,
                fontWeight: age ? 600 : 400,
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
            <label
              htmlFor="child-pronouns"
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--fg-onboarding-muted)",
              }}
            >
              Pronouns
            </label>
            <input
              id="child-pronouns"
              type="text"
              placeholder="he / him"
              value={pronouns}
              onChange={(e) => setPronouns(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{
                ...inputStyle,
                fontWeight: pronouns ? 600 : 400,
              }}
            />
          </div>
        </div>

        {/* Diagnoses chips */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--fg-onboarding-muted)",
            }}
          >
            Diagnoses (optional)
          </span>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 4,
            }}
            role="group"
            aria-label="Select diagnoses"
          >
            {DIAGNOSES.map((d) => {
              const selected = selectedDiagnoses.has(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDiagnosis(d)}
                  aria-pressed={selected}
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    padding: "8px 14px",
                    borderRadius: 9999,
                    background: selected
                      ? "var(--fg-onboarding-title)"
                      : "var(--surface-onboarding-card)",
                    border: selected
                      ? "1px solid var(--fg-onboarding-title)"
                      : "1px solid var(--border-onboarding)",
                    color: selected ? "var(--fg-on-dark)" : "var(--fg-onboarding-muted)",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    minHeight: 44,
                    transition: "background 150ms ease, color 150ms ease",
                  }}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>

        <p
          style={{
            fontSize: 12,
            color: "var(--fg-onboarding-muted)",
            lineHeight: 1.5,
            marginTop: 8,
          }}
        >
          Navigator uses diagnoses only to surface relevant tracking templates. It
          doesn&rsquo;t share these with anyone.
        </p>

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
            marginTop: 24,
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
