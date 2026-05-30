"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarCheck,
  ChevronDown,
  ClipboardList,
  FileText,
  ListOrdered,
  Pill,
  Search,
  Settings,
  TrendingUp,
  Users,
} from "lucide-react";
import { SyncDot } from "@navigator/design-system/components";
import { useChild } from "@/lib/db/queries/useChild";
import { useNextAppointment } from "@/lib/db/queries/useNextAppointment";
import { useAuthUser } from "@/lib/auth/useAuthUser";
import { useSyncState } from "@/lib/auth/useSyncState";
import { isSupabaseConfigured } from "@/lib/config";

/* ── Bottom tab bar (mobile only) ─────────────────────────── */

const TABS = [
  { href: "/today", label: "Today", icon: CalendarCheck },
  { href: "/timeline", label: "Timeline", icon: ListOrdered },
  { href: "/patterns", label: "Patterns", icon: TrendingUp },
  { href: "/report", label: "Report", icon: FileText },
  { href: "/prep", label: "Prep", icon: ClipboardList },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

/* ── Sidebar nav sections (desktop) ──────────────────────── */

interface SideNavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  /** Whether to show the upcoming appointment badge on this item. */
  apptBadge?: boolean;
}

const DAILY_NAV: SideNavItem[] = [
  { href: "/today", label: "Today", icon: CalendarCheck },
  { href: "/timeline", label: "Timeline", icon: ListOrdered },
  { href: "/patterns", label: "Patterns", icon: TrendingUp },
];

const CARE_NAV: SideNavItem[] = [
  { href: "/report", label: "Clinical report", icon: FileText },
  { href: "/prep", label: "Appointment prep", icon: ClipboardList, apptBadge: true },
  { href: "/settings#medications", label: "Medications", icon: Pill },
];

const ACCOUNT_NAV: SideNavItem[] = [
  { href: "/settings#coparents", label: "Co-parents", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

/* ── Helpers ──────────────────────────────────────────────── */

/** Format a Date as "May 28" style. */
function formatApptDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** True if the date is within 14 days from now. */
function isWithin14Days(date: Date): boolean {
  const diff = date.getTime() - Date.now();
  return diff >= 0 && diff <= 14 * 24 * 60 * 60 * 1000;
}

/** Initials from a preferred name, max 2 chars. */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    const first = parts[0]?.charAt(0) ?? "";
    const last = parts[parts.length - 1]?.charAt(0) ?? "";
    return (first + last).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/* ── Sidebar ──────────────────────────────────────────────── */

function DesktopSidebar({ pathname }: { pathname: string }) {
  const child = useChild();
  const nextAppt = useNextAppointment(child?.id);
  const authUser = useAuthUser();

  const apptDate =
    nextAppt?.scheduledFor && isWithin14Days(new Date(nextAppt.scheduledFor))
      ? formatApptDate(new Date(nextAppt.scheduledFor))
      : null;

  function isActive(href: string) {
    // Strip hash for active matching
    const base = href.split("#")[0];
    return pathname === base || (base !== "/" && pathname.startsWith(base + "/"));
  }

  function NavLink({ item }: { item: SideNavItem }) {
    const active = isActive(item.href);
    const Icon = item.icon;
    return (
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={[
          "flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] text-[13.5px] font-medium",
          "w-full transition-colors duration-fast",
          active
            ? "bg-surface-on-dark-active text-fg-on-dark font-semibold"
            : "text-fg-on-dark-muted hover:bg-surface-on-dark-hover hover:text-fg-on-dark",
        ].join(" ")}
      >
        <Icon
          size={16}
          aria-hidden
          className={active ? "text-success-dot shrink-0" : "text-fg-on-dark-ghost shrink-0"}
        />
        <span className="truncate">{item.label}</span>
        {item.apptBadge && apptDate ? (
          <span className="ml-auto font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-warning-dot text-ink-800">
            {apptDate}
          </span>
        ) : null}
      </Link>
    );
  }

  function NavSection({ label, items }: { label: string; items: SideNavItem[] }) {
    return (
      <>
        <div className="font-mono text-[10px] font-bold tracking-[0.10em] uppercase text-accent-gold-on-dark px-2.5 pt-3.5 pb-1.5 mt-2">
          {label}
        </div>
        {items.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </>
    );
  }

  const childInitials = child?.preferredName ? getInitials(child.preferredName) : "—";

  return (
    <aside
      className="hidden lg:flex lg:flex-col w-[240px] shrink-0 min-h-screen sticky top-0
                 border-r border-on-dark-subtle px-3.5 py-5 bg-surface-sidebar text-fg-on-dark-muted"
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-2 py-1 mb-5 font-black text-sm tracking-[0.18em] uppercase text-fg-on-dark">
        <span
          className="w-[30px] h-[30px] rounded-[9px] grid place-items-center text-fg-on-dark shrink-0 relative overflow-hidden"
          style={{ background: "var(--gradient-brand-glyph)" }}
          aria-hidden
        >
          {/* Inner border ring */}
          <span className="absolute inset-1 rounded-[6px] border border-on-dark" />
          <svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            className="relative z-10"
          >
            <path
              d="M5 19V5l14 14V5"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        Navigator
      </div>

      {/* Child switcher */}
      <div
        className="flex items-center gap-2.5 px-3 py-2.5 mb-4 rounded-[12px] cursor-pointer
                   bg-surface-sidebar-raised border border-on-dark"
      >
        <span
          className="w-8 h-8 rounded-full grid place-items-center text-fg-on-dark text-xs font-bold shrink-0"
          style={{ background: "var(--gradient-brand-glyph-135)" }}
          aria-hidden
        >
          {childInitials}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-fg-on-dark truncate">
            {child?.preferredName ?? "Loading…"}
          </div>
          <div className="text-[11px] mt-0.5 text-fg-on-dark-faint">Your child</div>
        </div>
        <ChevronDown size={12} className="text-fg-on-dark-ghost shrink-0" aria-hidden />
      </div>

      {/* Nav */}
      <nav aria-label="Primary navigation" className="flex flex-col gap-0.5 flex-1">
        <NavSection label="Daily" items={DAILY_NAV} />
        <NavSection label="Care" items={CARE_NAV} />
        <NavSection label="Account" items={ACCOUNT_NAV} />
      </nav>

      {/* User footer */}
      <div className="mt-auto pt-3 border-t border-on-dark-subtle flex items-center gap-2.5">
        <span
          className="w-7 h-7 rounded-full grid place-items-center text-[11px] font-bold text-fg-on-dark shrink-0 bg-surface-sidebar-raised"
          aria-hidden
        >
          {authUser?.email
            ? authUser.email.charAt(0).toUpperCase()
            : childInitials.slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1">
          {isSupabaseConfigured() && authUser ? (
            <>
              <div className="text-fg-on-dark font-semibold truncate text-[12px]">
                {authUser.email ?? "Signed in"}
              </div>
              <div className="text-[11px] truncate text-fg-on-dark-faint">
                Your account
              </div>
            </>
          ) : (
            <>
              <div className="text-fg-on-dark font-semibold truncate text-[12px]">
                Local mode
              </div>
              <Link
                href="/sign-in"
                className="text-[11px] truncate text-fg-on-dark-faint hover:text-fg-on-dark-muted transition-colors"
              >
                Sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

/* ── Top bar (desktop only) ──────────────────────────────── */

function DesktopTopbar() {
  const syncState = useSyncState();
  return (
    <div
      className="hidden lg:flex items-center justify-between gap-4 px-7 h-[52px]
                 border-b border-border-subtle sticky top-0 z-10 bg-surface-page/85 backdrop-blur"
    >
      {/* Search */}
      <div
        className="flex items-center gap-2.5 px-3.5 py-2 rounded-[10px] max-w-[420px] w-full
                   bg-surface-card border border-border-card text-fg-4"
      >
        <Search size={16} aria-hidden className="shrink-0" />
        <input
          type="search"
          placeholder="Search coming in Phase 2"
          readOnly
          className="flex-1 bg-transparent border-0 outline-none text-[13.5px] text-fg-1 font-sans
                     placeholder:text-fg-4 cursor-default"
          aria-label="Search (coming soon)"
        />
        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-[5px] bg-surface-sunk text-fg-4 shrink-0">
          ⌘ K
        </span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3 ml-auto shrink-0">
        <SyncDot state={syncState} showLabel />
        <button
          type="button"
          className="w-9 h-9 rounded-[10px] bg-surface-card border border-border-card
                     text-fg-3 grid place-items-center hover:bg-surface-card-alt
                     transition-colors duration-fast"
          aria-label="Notifications"
        >
          <Bell size={18} aria-hidden />
        </button>
      </div>
    </div>
  );
}

/* ── AppChrome ───────────────────────────────────────────── */

/**
 * The app-shell frame. On mobile (< 1024 px) renders a header + bottom tab
 * bar. On desktop (≥ 1024 px) renders a left sidebar + top bar instead.
 */
export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const syncState = useSyncState();

  return (
    <div className="min-h-screen flex bg-surface-page">
      {/* ── Desktop sidebar — hidden on mobile ── */}
      <DesktopSidebar pathname={pathname} />

      {/* ── Content column ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop top bar — hidden on mobile */}
        <DesktopTopbar />

        {/* Mobile header — hidden on desktop */}
        <header className="lg:hidden sticky top-0 z-10 flex items-center justify-between h-12 px-5 border-b border-border-subtle bg-surface-card/85 backdrop-blur">
          <span className="font-semibold text-fg-1">Navigator</span>
          <SyncDot state={syncState} showLabel />
        </header>

        {/* Page content. The outer <main> spans the column and handles
            horizontal padding; an inner wrapper caps the readable width to an
            intentional measure (max-w-reading, 70ch) so content never
            stretches uncomfortably wide on tablet, desktop, or big screens.
            The horizontal padding keeps its responsive visual floor (5→10)
            and additionally respects the safe-area insets so content doesn't
            clip under the notch/home rail in landscape (viewportFit:cover).
            Each breakpoint floor is expressed as max(<floor>, safe-inset). */}
        <main
          className="flex-1 w-full py-6
                     pl-[max(var(--safe-left),1.25rem)] pr-[max(var(--safe-right),1.25rem)]
                     sm:pl-[max(var(--safe-left),1.5rem)] sm:pr-[max(var(--safe-right),1.5rem)]
                     lg:pl-[max(var(--safe-left),2rem)] lg:pr-[max(var(--safe-right),2rem)]
                     xl:pl-[max(var(--safe-left),2.5rem)] xl:pr-[max(var(--safe-right),2.5rem)]"
          style={{ paddingBottom: "calc(var(--safe-bottom) + 1.5rem)" }}
        >
          <div className="mx-auto w-full max-w-reading">
            {children}
          </div>
        </main>

        {/* Mobile tab bar — hidden on desktop */}
        <nav
          className="lg:hidden sticky bottom-0 z-10 flex justify-around border-t border-border-subtle bg-surface-card"
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
    </div>
  );
}
