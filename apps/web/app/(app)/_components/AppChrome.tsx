"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, ClipboardList, FileText, ListOrdered, Settings } from "lucide-react";
import { SyncDot } from "@navigator/design-system/components";

const TABS = [
  { href: "/today", label: "Today", icon: CalendarCheck },
  { href: "/timeline", label: "Timeline", icon: ListOrdered },
  { href: "/report", label: "Report", icon: FileText },
  { href: "/prep", label: "Prep", icon: ClipboardList },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

/**
 * The app-shell frame: a status header and a bottom tab bar. Wraps every
 * authenticated route. The data provider sits above this in the layout, so
 * children can read the local DB.
 */
export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col bg-surface-page">
      <header className="sticky top-0 z-10 flex items-center justify-between h-12 px-5 border-b border-border-subtle bg-surface-card/85 backdrop-blur">
        <span className="font-semibold text-fg-1">Navigator</span>
        <SyncDot state="synced" showLabel />
      </header>

      <main
        className="flex-1 px-5 py-6 max-w-app mx-auto w-full"
        style={{ paddingBottom: "calc(var(--safe-bottom) + 1.5rem)" }}
      >
        {children}
      </main>

      <nav
        className="sticky bottom-0 z-10 flex justify-around border-t border-border-subtle bg-surface-card"
        style={{ paddingBottom: "var(--safe-bottom)" }}
        aria-label="Primary"
      >
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 h-16 min-h-tap text-2xs ${
                active ? "text-fg-accent" : "text-fg-3 hover:text-fg-1"
              }`}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
