import { DbProvider } from "@/lib/db/provider";
import { AppChrome } from "./_components/AppChrome";

/**
 * App-shell layout. The auth gate lives in middleware.ts — reaching here means
 * you're authenticated (or in local single-device mode). DbProvider boots the
 * on-device database; AppChrome is the header + bottom tab bar.
 */
export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <DbProvider>
      <AppChrome>{children}</AppChrome>
    </DbProvider>
  );
}
