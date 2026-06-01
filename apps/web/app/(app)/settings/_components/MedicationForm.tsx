"use client";

import { useState } from "react";
import { usePGlite } from "@electric-sql/pglite-react";
import { Button, Card, Field } from "@navigator/design-system/components";
import { addMedication } from "@/lib/db/mutations/medications";

const TIME_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;

export function MedicationForm() {
  const db = usePGlite();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [times, setTimes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setDose("");
    setTimes("");
    setError(null);
    setOpen(false);
  }

  async function save() {
    const doseMg = Number(dose);
    const parsedTimes = times
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (!name.trim()) return setError("Add a medication name.");
    if (!Number.isFinite(doseMg) || doseMg <= 0) return setError("Add a dose in mg.");
    if (parsedTimes.length === 0 || !parsedTimes.every((t) => TIME_RE.test(t))) {
      return setError("Use 24-hour times like 07:00, 12:00.");
    }

    setError(null);
    setSaving(true);
    try {
      await addMedication(db, { name: name.trim(), doseMg, scheduledTimes: parsedTimes });
      reset();
    } catch {
      setError("Couldn't save that. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button variant="secondary" fullWidth onClick={() => setOpen(true)}>
        Add a medication
      </Button>
    );
  }

  return (
    <Card>
      <div className="flex flex-col gap-4">
        <Field label="Name" placeholder="e.g. Methylphenidate ER" value={name} onChange={(e) => setName(e.target.value)} />
        <Field
          label="Dose (mg)"
          type="number"
          inputMode="decimal"
          placeholder="10"
          value={dose}
          onChange={(e) => setDose(e.target.value)}
        />
        <Field
          label="Scheduled times"
          placeholder="07:00, 12:00"
          hint="24-hour, comma-separated."
          value={times}
          onChange={(e) => setTimes(e.target.value)}
        />
        {error ? <p className="text-xs text-danger-fg">{error}</p> : null}
        <div className="flex gap-2">
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving" : "Save medication"}
          </Button>
          <Button variant="ghost" onClick={reset} disabled={saving}>
            Cancel
          </Button>
        </div>
      </div>
    </Card>
  );
}
