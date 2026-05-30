"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePGlite } from "@electric-sql/pglite-react";
import { addMedication } from "@/lib/db/mutations/medications";

interface OnboardingChild {
  name: string;
  age: string | null;
  pronouns: string | null;
  diagnoses: string[];
}

/**
 * S_AllSet — Final step. Reads onboarding data from localStorage, writes
 * the child profile + medications to the local DB, marks onboarding complete,
 * then navigates to /today.
 */
export default function DonePage() {
  const router = useRouter();
  const db = usePGlite();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [childName, setChildName] = useState("your child");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("navigator.onboarding.child");
      if (raw) {
        const parsed = JSON.parse(raw) as OnboardingChild;
        if (parsed.name) setChildName(parsed.name);
      }
    } catch {
      // ignore parse errors — fall back to default
    }
  }, []);

  async function handleOpenToday() {
    if (saving) return;
    setSaving(true);
    setError(null);

    try {
      await writeOnboardingData();
      // Mark onboarding complete.
      if (typeof window !== "undefined") {
        window.localStorage.setItem("navigator.onboarded", "true");
        // Clean up transient onboarding keys.
        window.localStorage.removeItem("navigator.onboarding.child");
        window.localStorage.removeItem("navigator.onboarding.medications");
        window.localStorage.removeItem("navigator.onboarding.reminders");
      }
      router.replace("/today");
    } catch (err) {
      setSaving(false);
      setError("Couldn't save that. Your data is still on this device.");
      console.error("Onboarding write failed:", err);
    }
  }

  async function writeOnboardingData() {
    if (typeof window === "undefined") return;

    // --- Parse child data -----------------------------------------------
    let child: OnboardingChild = { name: "My child", age: null, pronouns: null, diagnoses: [] };
    try {
      const raw = window.localStorage.getItem("navigator.onboarding.child");
      if (raw) child = JSON.parse(raw) as OnboardingChild;
    } catch {
      // keep defaults
    }

    // Check if a child already exists (e.g. demo seed ran).
    const existing = await db.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM children",
    );
    const hasChild = (existing.rows[0]?.count ?? 0) > 0;

    let childId: string;
    let profileId: string;

    if (hasChild) {
      // Update the existing child's preferred name (demo seed may have set "Wren").
      const childRow = await db.query<{ id: string; ownerId: string }>(
        `SELECT id, owner_id AS "ownerId" FROM children ORDER BY created_at LIMIT 1`,
      );
      const row = childRow.rows[0];
      if (!row) throw new Error("Expected a child row.");
      childId = row.id;
      profileId = row.ownerId;

      const diagNotes =
        child.diagnoses.length > 0 ? child.diagnoses.join("; ") : null;

      await db.query(
        `UPDATE children
         SET preferred_name = $1,
             diagnoses_notes = COALESCE($2, diagnoses_notes)
         WHERE id = $3`,
        [child.name, diagNotes, childId],
      );
    } else {
      // No seed ran yet — create profile + child from scratch.
      const profileRes = await db.query<{ id: string }>(
        `INSERT INTO profiles (email, full_name, role)
         VALUES ($1, $2, 'parent')
         ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
         RETURNING id`,
        ["parent@navigator.local", "Parent"],
      );
      profileId = profileRes.rows[0]!.id;

      const diagNotes =
        child.diagnoses.length > 0 ? child.diagnoses.join("; ") : null;

      const childRes = await db.query<{ id: string }>(
        `INSERT INTO children (owner_id, preferred_name, diagnoses_notes)
         VALUES ($1, $2, $3) RETURNING id`,
        [profileId, child.name, diagNotes],
      );
      childId = childRes.rows[0]!.id;
    }

    // --- Parse + write medications -------------------------------------
    let medNames: string[] = [];
    try {
      const raw = window.localStorage.getItem("navigator.onboarding.medications");
      if (raw) medNames = JSON.parse(raw) as string[];
    } catch {
      // no medications selected — that's fine
    }

    for (const name of medNames) {
      // Check if this medication already exists to avoid duplicates.
      const dup = await db.query<{ count: number }>(
        `SELECT count(*)::int AS count FROM medications WHERE child_id = $1 AND name = $2 AND active = true`,
        [childId, name],
      );
      if ((dup.rows[0]?.count ?? 0) === 0) {
        await addMedication(db, {
          name,
          doseMg: 0, // dose set during full setup in Settings
          scheduledTimes: [],
        });
      }
    }
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: "60px 24px",
        minHeight: "100dvh",
      }}
    >
      {/* Success glyph */}
      <div
        style={{
          width: 96,
          height: 96,
          margin: "0 auto 32px",
          borderRadius: "50%",
          background: "var(--onboarding-accent-tint)",
          display: "grid",
          placeItems: "center",
          color: "var(--onboarding-accent)",
        }}
        aria-hidden
      >
        <CheckCircleIcon />
      </div>

      <h1
        style={{
          fontSize: 32,
          fontWeight: 700,
          letterSpacing: "-0.025em",
          lineHeight: 1.05,
          color: "var(--fg-onboarding-title)",
          margin: "0 0 12px",
        }}
      >
        You&rsquo;re all set.
      </h1>

      <p
        style={{
          fontSize: 15,
          color: "var(--fg-onboarding-body)",
          lineHeight: 1.55,
          margin: 0,
          maxWidth: 280,
        }}
      >
        {childName}&rsquo;s profile is ready. Your first reminder will arrive tomorrow
        morning. Until then, Navigator is quietly waiting.
      </p>

      {/* What happens next */}
      <div
        style={{
          marginTop: 32,
          padding: "16px 18px",
          background: "var(--surface-onboarding-card)",
          border: "1px solid var(--border-onboarding-subtle)",
          borderRadius: 14,
          width: "100%",
          maxWidth: 320,
          textAlign: "left",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "var(--accent-gold-700)",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          What happens next
        </div>
        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: "none",
            display: "grid",
            gap: 8,
          }}
        >
          {[
            "Log doses with one tap on the Today screen",
            "Capture observations by voice or text",
            "Generate a 90-day report before any visit",
          ].map((text) => (
            <li
              key={text}
              style={{
                display: "flex",
                alignItems: "start",
                gap: 8,
                fontSize: 13,
                color: "var(--fg-onboarding-body)",
              }}
            >
              <span
                style={{
                  color: "var(--onboarding-accent)",
                  marginTop: 3,
                  flexShrink: 0,
                }}
                aria-hidden
              >
                <SmallCheckIcon />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </div>

      {/* Error message */}
      {error && (
        <p
          role="alert"
          style={{
            marginTop: 16,
            fontSize: 13,
            color: "var(--color-danger-fg)",
            maxWidth: 320,
          }}
        >
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleOpenToday}
        disabled={saving}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          width: "100%",
          maxWidth: 320,
          padding: "16px 22px",
          background: saving ? "var(--onboarding-accent-strong)" : "var(--onboarding-accent)",
          color: "var(--fg-on-dark)",
          border: "none",
          borderRadius: 14,
          fontSize: 15,
          fontWeight: 600,
          fontFamily: "inherit",
          boxShadow: "var(--onboarding-accent-shadow)",
          cursor: saving ? "wait" : "pointer",
          marginTop: 28,
          minHeight: 44,
        }}
      >
        {saving ? "Saving…" : "Open Today"}
        {!saving && <ArrowRight />}
      </button>
    </div>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden>
      <circle cx="22" cy="22" r="20" stroke="currentColor" strokeWidth="2" />
      <path
        d="M13 22.5 19.5 29 31 16"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SmallCheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
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
