"use client";

import { useState } from "react";
import { usePGlite } from "@electric-sql/pglite-react";
import { useWearOffPattern } from "@/lib/db/queries/useWearOffPattern";
import { useChild } from "@/lib/db/queries/useChild";
import { logObservation } from "@/lib/db/mutations/logObservation";

/**
 * Pattern alert card — surfaces detected wear-off patterns from the last 7
 * days. Disappears for the session when dismissed or after "Add to prep".
 */
export function PatternCard() {
  const child = useChild();
  const pattern = useWearOffPattern(child?.id);
  const db = usePGlite();
  const [dismissed, setDismissed] = useState(false);
  const [added, setAdded] = useState(false);

  if (!pattern.detected || dismissed) return null;

  async function addToPrep() {
    try {
      await logObservation(db, {
        tags: ["wear-off", "prep"],
        note: pattern.description,
      });
    } catch {
      // best-effort — don't block dismissal
    } finally {
      setAdded(true);
      setDismissed(true);
    }
  }

  return (
    <div
      style={{
        background: "var(--gradient-pattern-card)",
        border: "1px solid var(--cta-success-bd)",
        borderRadius: 16,
        padding: "14px 16px",
        marginBottom: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--fg-1)",
          }}
        >
          Wear-off · day {pattern.dayCount}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: "3px 9px",
            borderRadius: 9999,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            background: "var(--accent-gold-bg)",
            color: "var(--accent-gold-600)",
          }}
        >
          Pattern
        </span>
      </div>

      <p
        style={{
          fontSize: 13,
          color: "var(--fg-3)",
          lineHeight: 1.45,
          margin: 0,
        }}
      >
        {pattern.description}
      </p>

      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={addToPrep}
          style={{
            fontSize: 12,
            fontWeight: 700,
            padding: "8px 14px",
            borderRadius: 9999,
            background: "var(--color-accent-600)",
            color: "var(--fg-on-accent)",
            border: "none",
            cursor: "pointer",
          }}
        >
          {added ? "Added" : "Add to prep"}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          style={{
            fontSize: 12,
            fontWeight: 700,
            padding: "8px 14px",
            borderRadius: 9999,
            background: "var(--surface-sunk)",
            color: "var(--fg-1)",
            border: "none",
            cursor: "pointer",
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
