"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePGlite } from "@electric-sql/pglite-react";
import { Button, Card, Pill } from "@navigator/design-system/components";
import { useMedications } from "@/lib/db/queries/useMedications";
import { useChild } from "@/lib/db/queries/useChild";
import { resetLocalData, stopMedication } from "@/lib/db/mutations/medications";
import { applyTheme, getStoredTheme, type Theme } from "@/lib/theme";
import { formatDose } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/config";
import { createBrowserClient } from "@/lib/auth/supabase";
import { deleteServerAccount } from "@/lib/auth/deleteAccount";
import { useAuthUser } from "@/lib/auth/useAuthUser";
import { MedicationForm } from "./_components/MedicationForm";
import { CoParents } from "./_components/CoParents";
import { Reminders } from "./_components/Reminders";
import { TwoFactor } from "./_components/TwoFactor";

export default function SettingsPage() {
  const db = usePGlite();
  const child = useChild();
  const meds = useMedications();
  const user = useAuthUser();
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>("light");
  const [busy, setBusy] = useState(false);

  useEffect(() => setTheme(getStoredTheme()), []);

  function setThemeAndApply(next: Theme) {
    setTheme(next);
    applyTheme(next);
  }

  async function exportData() {
    // HIPAA right of access / data portability: export ALL of the user's data,
    // not just doses. Every child-scoped table on the device is included.
    const [
      profileRows,
      childRows,
      collaboratorRows,
      medRows,
      apptRows,
      eventRows,
      reportRows,
    ] = await Promise.all([
      db.query("SELECT * FROM profiles"),
      db.query("SELECT * FROM children"),
      db.query("SELECT * FROM child_collaborators"),
      db.query("SELECT * FROM medications"),
      db.query("SELECT * FROM appointments"),
      db.query("SELECT * FROM log_events ORDER BY occurred_at"),
      db.query("SELECT * FROM reports ORDER BY generated_at"),
    ]);
    const payload = {
      exportedAt: new Date().toISOString(),
      format: "navigator-export-v2",
      profiles: profileRows.rows,
      children: childRows.rows,
      collaborators: collaboratorRows.rows,
      medications: medRows.rows,
      appointments: apptRows.rows,
      events: eventRows.rows,
      reports: reportRows.rows,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `navigator-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function reset() {
    if (!window.confirm("Clear all data on this device and load fresh demo data?")) return;
    setBusy(true);
    await resetLocalData(db);
    window.location.reload();
  }

  async function handleSignOut() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push("/sign-in");
  }

  async function handleDeleteAccount() {
    if (
      !window.confirm(
        "Delete your account and all data? This can't be undone. Your data is removed from this device and the server.",
      )
    )
      return;
    setBusy(true);
    // Server first: if it fails, keep the local copy rather than orphan the data.
    const serverOk = await deleteServerAccount();
    if (!serverOk) {
      setBusy(false);
      window.alert("Couldn't delete your account on the server. Your data is unchanged.");
      return;
    }
    await resetLocalData(db);
    router.push("/sign-in");
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-fg-2">Medications</h2>
        {meds.length === 0 ? (
          <Card alt>
            <p className="text-sm text-fg-3">No active medications.</p>
          </Card>
        ) : (
          meds.map((m) => (
            <Card key={m.id} alt elevation="flat" className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-fg-1">
                    {m.name} <span className="text-fg-3">· {formatDose(m.doseMg)} mg</span>
                  </p>
                  <p className="text-xs text-fg-3 mt-1 font-mono break-words">
                    {m.scheduledTimes.join(" · ")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={() => stopMedication(db, m.id)}
                >
                  Stop
                </Button>
              </div>
            </Card>
          ))
        )}
        <MedicationForm />
      </section>

      <CoParents childId={child?.id} />

      <Reminders childId={child?.id} />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-fg-2">Appearance</h2>
        <Card alt elevation="flat" className="p-4">
          <div className="flex items-center gap-2" role="group" aria-label="Theme">
            {(["light", "dark"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setThemeAndApply(t)}
                aria-pressed={theme === t}
                className={`min-h-tap px-4 rounded-full border text-sm capitalize transition-colors duration-fast ${
                  theme === t
                    ? "bg-accent-600 text-fg-on-accent border-transparent"
                    : "bg-surface-card text-fg-2 border-border-card"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-fg-2">Your data</h2>
        <Card alt elevation="flat" className="p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-fg-2">
              Everything is stored on this device{child ? ` for ${child.preferredName}` : ""}.
            </p>
            <Pill tone={isSupabaseConfigured() ? "success" : "neutral"}>
              {isSupabaseConfigured() ? "Sync ready" : "Local only"}
            </Pill>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={exportData}>
              Export data (JSON)
            </Button>
            <Button variant="danger" size="sm" onClick={reset} disabled={busy}>
              {busy ? "Clearing…" : "Clear this device"}
            </Button>
          </div>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-fg-2">Account</h2>
        {isSupabaseConfigured() && user ? (
          <Card alt elevation="flat" className="p-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-fg-1">{user.email ?? "Signed in"}</div>
              <div className="text-xs text-fg-3 mt-0.5">Your account</div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              Sign out
            </Button>
          </Card>
        ) : (
          <Card alt elevation="flat" className="p-4">
            <p className="text-sm text-fg-3">Local mode — data saved to this device only.</p>
          </Card>
        )}
        <Card alt elevation="flat" className="p-4 flex flex-col gap-2">
          <p className="text-sm text-fg-2">Delete your account</p>
          <p className="text-2xs text-fg-4">
            Removes all of your data from this device{isSupabaseConfigured() ? " and the server" : ""}. This can&rsquo;t be undone.
          </p>
          <div>
            <Button variant="danger" size="sm" onClick={handleDeleteAccount} disabled={busy}>
              {busy ? "Deleting…" : "Delete account and data"}
            </Button>
          </div>
        </Card>
      </section>

      <TwoFactor />
    </div>
  );
}
