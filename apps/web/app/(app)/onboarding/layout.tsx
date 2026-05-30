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
          display: "flex",
          flexDirection: "column",
          fontFamily: "var(--font-sans)",
        }}
      >
        {children}
      </div>
    </DbProvider>
  );
}
