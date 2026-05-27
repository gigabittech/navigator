"use client";

import { useState } from "react";
import { usePGlite } from "@electric-sql/pglite-react";
import { ArrowLeft } from "lucide-react";
import { logObservation } from "@/lib/db/mutations/logObservation";

// ─── Tag definitions ──────────────────────────────────────────────────────────

interface TagGroup {
  label: string;
  tags: string[];
}

const TAG_GROUPS: TagGroup[] = [
  {
    label: "Mood",
    tags: ["Calm", "Irritable", "Anxious", "Sad", "Elevated"],
  },
  {
    label: "Energy",
    tags: ["Low", "Steady", "High", "Restless"],
  },
  {
    label: "Trigger",
    tags: [
      "Transition",
      "Schedule change",
      "Sleep · short",
      "Hunger",
      "Loud / sensory",
    ],
  },
  {
    label: "Side effect",
    tags: ["None", "Appetite ↓", "Sleep ↓", "Headache", "Tics"],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface TagPickerProps {
  onClose: () => void;
}

export function TagPicker({ onClose }: TagPickerProps) {
  const db = usePGlite();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(tag: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  }

  async function save() {
    if (selected.size === 0 && note.trim() === "") {
      setError("Pick at least one tag or add a note.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await logObservation(db, {
        tags: selected.size > 0 ? Array.from(selected) : ["note"],
        note: note.trim() || undefined,
      });
      onClose();
    } catch {
      setError("Couldn't save that. It's still on this device.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-60 flex flex-col bg-surface-page"
      style={{
        paddingTop: "var(--safe-top)",
        paddingBottom: "var(--safe-bottom)",
      }}
    >
      {/* Header */}
      <header className="flex items-center gap-3 h-14 px-4 border-b border-border-subtle shrink-0">
        <button
          type="button"
          aria-label="Go back"
          onClick={onClose}
          disabled={saving}
          className="min-h-tap min-w-tap flex items-center justify-center rounded-lg text-fg-2 hover:bg-surface-card-alt transition-colors duration-fast focus:outline-none focus-visible:ring-2 focus-visible:ring-border-accent disabled:opacity-50"
        >
          <ArrowLeft size={20} aria-hidden />
        </button>
        <h1 className="text-base font-semibold text-fg-1">Tag this moment</h1>
      </header>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {/* Page heading */}
        <div className="pb-5">
          <h2 className="text-2xl font-bold tracking-tight text-fg-1 mt-1">
            How was that?
          </h2>
          <p className="text-sm text-fg-3 mt-1.5 leading-normal">
            Tap as many as fit. You can always edit later.
          </p>
        </div>

        {/* Tag groups */}
        {TAG_GROUPS.map(({ label, tags }) => (
          <div key={label} className="mb-5">
            <p className="text-xs font-bold tracking-eyebrow uppercase text-fg-3 mb-2">
              {label}
            </p>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const on = selected.has(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(tag)}
                    disabled={saving}
                    className={`min-h-tap px-3.5 rounded-full border text-sm font-semibold transition-colors duration-fast focus:outline-none focus-visible:ring-2 focus-visible:ring-border-accent disabled:opacity-50 ${
                      on
                        ? "bg-fg-1 text-fg-on-accent border-transparent"
                        : "bg-surface-card text-fg-2 border-border-card hover:border-border-strong hover:text-fg-1"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Optional note */}
        <div className="mb-4">
          <label
            htmlFor="tag-picker-note"
            className="block text-xs font-bold tracking-eyebrow uppercase text-fg-3 mb-1.5"
          >
            Add a note (optional)
          </label>
          <textarea
            id="tag-picker-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Anything else worth remembering?"
            disabled={saving}
            className="w-full rounded-xl border border-border-card bg-surface-input px-4 py-3.5 text-base text-fg-1 placeholder:text-fg-4 leading-normal resize-none focus:outline-none focus-within:border-border-accent disabled:opacity-50"
          />
        </div>

        {/* Error */}
        {error ? (
          <p className="text-sm text-danger-fg mb-4" role="alert">
            {error}
          </p>
        ) : null}

        {/* Save button */}
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="w-full min-h-tap flex items-center justify-center rounded-xl text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-success-dot transition-opacity duration-fast disabled:opacity-50 mb-6"
          style={{
            background: "var(--emerald-600)",
            boxShadow: "0 8px 20px -6px rgba(15,110,86,0.40)",
            padding: "16px 22px",
          }}
        >
          {saving ? "Saving…" : "Save observation"}
        </button>
      </div>
    </div>
  );
}
