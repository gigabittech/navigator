"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * S_Welcome — Step 0 of the onboarding flow.
 * Shows the Navigator logo, a brief promise, and two actions:
 * set up the child profile, or skip entirely.
 */
export default function WelcomePage() {
  const router = useRouter();

  // If the user already completed onboarding, skip straight to /today.
  useEffect(() => {
    if (typeof window !== "undefined" && window.localStorage.getItem("navigator.onboarded") === "true") {
      router.replace("/today");
    }
  }, [router]);

  function handleSetUp() {
    router.push("/onboarding/child");
  }

  function handleSkip() {
    router.push("/today");
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "24px 24px 40px",
        justifyContent: "space-between",
        minHeight: "100dvh",
      }}
    >
      {/* Upper content */}
      <div>
        {/* Step pill */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "var(--onboarding-accent)",
            background: "var(--onboarding-accent-tint)",
            padding: "4px 10px",
            borderRadius: 9999,
            marginBottom: 24,
          }}
        >
          Welcome to the beta
        </div>

        {/* Logo glyph */}
        <div
          style={{
            width: 84,
            height: 84,
            borderRadius: 20,
            background: "var(--gradient-brand-glyph)",
            display: "grid",
            placeItems: "center",
            color: "var(--fg-on-dark)",
            boxShadow: "0 16px 36px -12px rgba(15, 110, 86, 0.45)",
            marginBottom: 32,
            position: "relative",
            overflow: "hidden",
          }}
          aria-hidden
        >
          {/* Inner border ring */}
          <div
            style={{
              position: "absolute",
              inset: 8,
              border: "1.5px solid var(--border-on-dark)",
              borderRadius: 12,
            }}
          />
          <svg
            width="36"
            height="36"
            viewBox="0 0 36 36"
            fill="none"
            aria-hidden
            style={{ position: "relative", zIndex: 1 }}
          >
            <path
              d="M18 6C11.373 6 6 11.373 6 18s5.373 12 12 12 12-5.373 12-12S24.627 6 18 6zm0 2a10 10 0 1 1 0 20A10 10 0 0 1 18 8zm0 3a7 7 0 1 0 0 14A7 7 0 0 0 18 11zm0 2a5 5 0 1 1 0 10A5 5 0 0 1 18 13z"
              fill="currentColor"
              opacity="0.9"
            />
          </svg>
        </div>

        <h1
          style={{
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: "-0.025em",
            lineHeight: 1.05,
            margin: "0 0 12px",
            color: "var(--fg-onboarding-title)",
          }}
        >
          One place for your{" "}
          <em
            style={{
              fontStyle: "italic",
              fontWeight: 400,
              color: "var(--accent-gold-600)",
            }}
          >
            child&rsquo;s
          </em>{" "}
          care.
        </h1>

        <p
          style={{
            fontSize: 15,
            color: "var(--fg-onboarding-body)",
            lineHeight: 1.55,
            margin: 0,
          }}
        >
          Navigator lives on this device. Every dose, observation, and school event saves
          locally — instantly — and syncs quietly when you&rsquo;re back on signal.
        </p>
      </div>

      {/* Footer buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24 }}>
        <button
          type="button"
          onClick={handleSetUp}
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
          Set up a child profile
          <ArrowRight />
        </button>

        <button
          type="button"
          onClick={handleSkip}
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
            minHeight: 44,
          }}
        >
          I&rsquo;ll do this later
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
