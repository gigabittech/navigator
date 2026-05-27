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
      className="fixed z-40 flex items-center justify-center rounded-full text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-success-dot transition-transform duration-fast ease-standard active:scale-95"
      style={{
        right: 20,
        bottom: "calc(var(--safe-bottom) + 92px)",
        width: 56,
        height: 56,
        background: "var(--emerald-600)",
        boxShadow:
          "0 12px 28px -6px rgba(15,110,86,0.50), 0 4px 10px rgba(0,0,0,0.08)",
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
        <rect x="10" y="2" width="2" height="18" rx="1" fill="white" />
        <rect x="2" y="10" width="18" height="2" rx="1" fill="white" />
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
  // Trap focus inside the sheet while it is open.
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const first = sheetRef.current?.querySelector<HTMLElement>(
      "button, [tabindex]",
    );
    first?.focus();
  }, []);

  // Close on Escape.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        role="presentation"
        className="fixed inset-0 z-50 bg-surface-overlay"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Log something quickly"
        className="fixed left-0 right-0 bottom-0 z-50 bg-surface-card"
        style={{
          borderRadius: "24px 24px 0 0",
          padding: "12px 20px calc(var(--safe-bottom) + 32px)",
          boxShadow: "0 -20px 60px -10px rgba(14,27,48,0.18)",
        }}
      >
        {/* Grabber */}
        <div
          aria-hidden
          className="mx-auto mb-5"
          style={{
            width: 40,
            height: 4,
            borderRadius: 9999,
            background: "rgba(14,27,48,0.18)",
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
          style={{ background: "rgba(15,110,86,0.06)" }}
        >
          <CloudCheck
            size={16}
            aria-hidden
            className="shrink-0 text-success-fg"
          />
          <span>Saves instantly to this device. Sync runs in the background.</span>
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
