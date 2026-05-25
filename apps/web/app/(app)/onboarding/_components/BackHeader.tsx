"use client";

import { useRouter } from "next/navigation";

/** Minimal top-bar for onboarding steps 2–5 — just a back button and a title. */
export function BackHeader({ title }: { title: string }) {
  const router = useRouter();

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "12px 20px",
        borderBottom: "1px solid rgba(14, 27, 48, 0.05)",
        background: "var(--cream-100)",
      }}
    >
      <button
        type="button"
        onClick={() => router.back()}
        aria-label="Go back"
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "rgba(14, 27, 48, 0.04)",
          border: "none",
          color: "var(--navy-600)",
          display: "grid",
          placeItems: "center",
          cursor: "pointer",
          flexShrink: 0,
          minWidth: 44,
          minHeight: 44,
        }}
      >
        <ChevronLeft />
      </button>
      <span
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: "var(--navy-800)",
        }}
      >
        {title}
      </span>
    </header>
  );
}

function ChevronLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M11.25 13.5 6.75 9l4.5-4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
