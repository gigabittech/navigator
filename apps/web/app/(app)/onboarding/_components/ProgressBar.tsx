"use client";

/**
 * Onboarding progress bar — 4 segments (steps 1–4 of the flow).
 * step = 0-indexed: 0 = child, 1 = meds, 2 = reminders, 3 = done.
 */
export function ProgressBar({ step }: { step: 0 | 1 | 2 | 3 }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        marginBottom: 20,
      }}
      role="progressbar"
      aria-valuenow={step + 1}
      aria-valuemin={1}
      aria-valuemax={4}
      aria-label={`Step ${step + 1} of 4`}
    >
      {([0, 1, 2, 3] as const).map((i) => (
        <div
          key={i}
          style={{
            height: 4,
            flex: 1,
            background: i <= step ? "var(--emerald-500)" : "rgba(14, 27, 48, 0.08)",
            borderRadius: 2,
            transition: "background 200ms ease",
          }}
        />
      ))}
    </div>
  );
}
