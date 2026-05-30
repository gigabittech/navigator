"use client";

import { useState } from "react";
import { usePGlite } from "@electric-sql/pglite-react";
import { Button, Card } from "@navigator/design-system/components";
import { logObservation } from "@/lib/db/mutations/logObservation";

const PRESET_TAGS = [
  "focused",
  "calm",
  "irritable",
  "anxious",
  "tired",
  "wear-off",
  "low appetite",
  "meltdown",
];

const CONTEXTS = ["home", "school", "other"] as const;

export function ObservationComposer() {
  const db = usePGlite();
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [context, setContext] = useState<(typeof CONTEXTS)[number]>("home");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleTag(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  function reset() {
    setTags([]);
    setNote("");
    setContext("home");
    setOpen(false);
  }

  async function save() {
    if (tags.length === 0 && note.trim() === "") {
      setError("Add a tag or a note first.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await logObservation(db, {
        tags: tags.length ? tags : ["note"],
        note: note.trim() || undefined,
        context,
      });
      reset();
    } catch {
      setError("Couldn't save that. It stays on this device — try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button variant="secondary" fullWidth onClick={() => setOpen(true)}>
        Add an observation
      </Button>
    );
  }

  return (
    <Card>
      <p className="text-sm font-semibold text-fg-1 mb-3">What did you notice?</p>

      <div className="flex flex-wrap gap-2 mb-4">
        {PRESET_TAGS.map((tag) => {
          const on = tags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              aria-pressed={on}
              className={`min-h-tap px-3 rounded-full border text-sm transition-colors duration-fast ${
                on
                  ? "bg-accent-600 text-fg-on-accent border-transparent"
                  : "bg-surface-card-alt text-fg-2 border-border-card hover:text-fg-1"
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>

      <label htmlFor="observation-note" className="sr-only">
        Note
      </label>
      <textarea
        id="observation-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a note in your own words…"
        rows={2}
        className="w-full rounded-md border border-border-card bg-surface-input px-3 py-2 text-base text-fg-1 placeholder:text-fg-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-accent focus-visible:border-border-accent"
      />

      <div className="flex items-center gap-2 mt-3" role="group" aria-label="Where">
        {CONTEXTS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setContext(c)}
            aria-pressed={context === c}
            className={`min-h-tap px-3 rounded-full border text-sm capitalize transition-colors duration-fast ${
              context === c
                ? "bg-accent-bg text-accent-fg border-border-accent/40"
                : "bg-surface-card-alt text-fg-3 border-border-card"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {error ? (
        <p className="text-xs text-danger-fg mt-3" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2 mt-4">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving" : "Log observation"}
        </Button>
        <Button variant="ghost" onClick={reset} disabled={saving}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}
