"use client";

import { useEffect, useRef } from "react";
import { Pill as LucidePill, Mic, Calendar, Sparkles, CloudUpload as CloudCheck } from "lucide-react";

// ─── FAB ─────────────────────────────────────────────────────────────────────

interface FABProps {
  onOpen: () => void;
}

export function FAB({ onOpen }: FABProps) {
  return (
    <button
      type="button"
      aria-label="Log something quickly"
      onClick={onOpen}
      /* Sits above the mobile tab bar (92px up). On lg+ there's no tab bar,
         so it drops to a comfortable corner offset. Right/bottom offsets add
         the safe-area insets so the FAB clears the notch/home rail in
         landscape (viewportFit:cover); the base offsets stay the floor. */
      className="fixed z-40 flex items-center justify-center rounded-full text-fg-on-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-success-dot transition-transform duration-fast ease-standard active:scale-95 right-[calc(var(--safe-right)+1.25rem)] lg:right-[calc(var(--safe-right)+2rem)] bottom-[calc(var(--safe-bottom)+92px)] lg:bottom-[calc(var(--safe-bottom)+2rem)]"
      style={{
        width: 56,
        height: 56,
        background: "var(--cta-success)",
        boxShadow: "var(--shadow-cta-success-float)",
      }}
    >
      {/* "+" icon drawn as two rectangles for full control over weight */}
      <svg
        aria-hidden
        width={22}
        height={22}
        viewBox="0 0 22 22"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="10" y="2" width="2" height="18" rx="1" fill="currentColor" />
        <rect x="2" y="10" width="18" height="2" rx="1" fill="currentColor" />
      </svg>
    </button>
  );
}

// ─── Quick Log Sheet ──────────────────────────────────────────────────────────

interface QuickLogSheetProps {
  /** Called when the sheet should close without doing anything. */
  onClose: () => void;
  /** Called when "Voice observation" is chosen. */
  onVoice: () => void;
  /** Called when "Mood / energy" is chosen. */
  onTag: () => void;
  /** Called when "School event" is chosen. */
  onSchool: () => void;
}

export function QuickLogSheet({
  onClose,
  onVoice,
  onTag,
  onSchool,
}: QuickLogSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Trap focus inside the sheet, restore it on close, and close on Escape.
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;

    // Remember what had focus so we can restore it when the sheet closes.
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const getFocusable = (root: HTMLElement) =>
      Array.from(
        root.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);

    // Move focus to the first focusable element on open.
    getFocusable(sheet)[0]?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const root = sheetRef.current;
      if (!root) return;
      const focusable = getFocusable(root);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      const active = document.activeElement;
      const insideSheet = active instanceof Node && root.contains(active);

      if (e.shiftKey) {
        if (active === first || !insideSheet) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !insideSheet) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      // Restore focus to wherever it was before the sheet opened.
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    <>
      {/* Backdrop. On phones it's a plain overlay behind the bottom sheet; on
          lg+ it also centers the dialog within the viewport. */}
      <div
        role="presentation"
        className="fixed inset-0 z-50 bg-surface-overlay lg:grid lg:place-items-center lg:p-6"
        onClick={onClose}
      >
        {/* Sheet — a phone-style bottom sheet on mobile, a centered modal
            dialog on lg+. Stop propagation so clicks inside don't close it
            via the backdrop handler. */}
        <div
          ref={sheetRef}
          role="dialog"
          aria-modal="true"
          aria-label="Log something quickly"
          onClick={(e) => e.stopPropagation()}
          className="fixed left-0 right-0 bottom-0 z-50 bg-surface-card
                     rounded-t-[24px] lg:static lg:w-full lg:max-w-md lg:rounded-3xl"
          style={{
            padding: "12px 20px calc(var(--safe-bottom) + 32px)",
            boxShadow: "var(--shadow-sheet)",
          }}
        >
          {/* Grabber — a touch affordance, hidden on the desktop modal. */}
          <div
            aria-hidden
            className="mx-auto mb-5 lg:hidden"
            style={{
              width: 40,
              height: 4,
              borderRadius: 9999,
              background: "var(--surface-grabber)",
            }}
          />

        <h2 className="text-lg font-bold tracking-snug text-fg-1 mb-1">
          Log something quickly
        </h2>
        <p className="text-sm text-fg-3 mb-5">
          What just happened? Dictate, type, or pick from a template.
        </p>

        {/* 2×2 action grid */}
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          {/* Dose */}
          <QuickAction
            label="Dose"
            sub="Taken · late · missed"
            icon={<LucidePill size={18} aria-hidden />}
            iconBg="bg-success-bg text-success-fg"
            onClick={onClose} // navigates naturally via the tab bar; close the sheet
          />

          {/* Voice observation */}
          <QuickAction
            label="Voice observation"
            sub="Hold to record"
            icon={<Mic size={18} aria-hidden />}
            iconBg="bg-info-bg text-info-fg"
            onClick={onVoice}
          />

          {/* School event */}
          <QuickAction
            label="School event"
            sub="Email · call · IEP"
            icon={<Calendar size={18} aria-hidden />}
            iconBg="bg-warning-bg text-warning-fg"
            onClick={onSchool}
          />

          {/* Mood / energy */}
          <QuickAction
            label="Mood / energy"
            sub="One-tap tag"
            icon={<Sparkles size={18} aria-hidden />}
            iconBg="bg-accent-bg text-accent-fg"
            onClick={onTag}
          />
        </div>

        {/* Sync notice */}
        <div
          className="flex items-center gap-2.5 rounded-xl px-3.5 py-3 text-xs text-fg-2"
          style={{ background: "var(--cta-success-tint-soft)" }}
        >
          <CloudCheck
            size={16}
            aria-hidden
            className="shrink-0 text-success-fg"
          />
          <span>Saves instantly to this device. Sync runs in the background.</span>
        </div>
        </div>
      </div>
    </>
  );
}

// ─── Small helper ─────────────────────────────────────────────────────────────

interface QuickActionProps {
  label: string;
  sub: string;
  icon: React.ReactNode;
  iconBg: string;
  onClick: () => void;
}

function QuickAction({ label, sub, icon, iconBg, onClick }: QuickActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col gap-2.5 rounded-xl border border-border-card bg-surface-card p-4 text-left min-h-tap transition-colors duration-fast hover:bg-surface-card-alt active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-accent"
    >
      <span
        className={`inline-grid place-items-center rounded-xl ${iconBg}`}
        style={{ width: 36, height: 36 }}
        aria-hidden
      >
        {icon}
      </span>
      <span>
        <span className="block text-sm font-bold text-fg-1">{label}</span>
        <span className="block text-xs text-fg-3 mt-0.5 leading-snug">{sub}</span>
      </span>
    </button>
  );
}
