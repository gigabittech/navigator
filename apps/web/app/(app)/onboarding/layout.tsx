import { DbProvider } from "@/lib/db/provider";

/**
 * Onboarding layout. Intentionally bare — no AppChrome header or tab bar.
 * DbProvider is still required because the final step writes to the local DB.
 */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <DbProvider>
      <div
        style={{
          minHeight: "100dvh",
          background: "var(--surface-onboarding)",
          fontFamily: "var(--font-sans)",
        }}
        className="flex flex-col items-center"
      >
        {/* Centered, capped column so the 5-step flow stays a comfortable
            reading width instead of full-bleed on tablet and desktop. A
            layout-level horizontal gutter (plus safe-area insets) guarantees
            every step keeps clear of the viewport edge, regardless of its own
            padding. */}
        <div
          className="flex w-full max-w-app md:max-w-xl flex-1 flex-col [padding-left:calc(1.25rem+var(--safe-left))] [padding-right:calc(1.25rem+var(--safe-right))] sm:[padding-left:calc(1.5rem+var(--safe-left))] sm:[padding-right:calc(1.5rem+var(--safe-right))]"
        >
          {children}
        </div>
      </div>
    </DbProvider>
  );
}
