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
            reading width instead of full-bleed on tablet and desktop. */}
        <div className="flex w-full max-w-app md:max-w-xl flex-1 flex-col">
          {children}
        </div>
      </div>
    </DbProvider>
  );
}
