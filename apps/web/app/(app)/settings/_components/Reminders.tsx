"use client";

import { useEffect, useState } from "react";
import { Button, Card } from "@navigator/design-system/components";
import {
  isPushConfigured,
  currentPermission,
  subscribeToReminders,
  unsubscribeFromReminders,
  type PushPermission,
} from "@/lib/push/subscribe";

export function Reminders({ childId }: { childId: string | undefined }) {
  const [configured, setConfigured] = useState(false);
  const [permission, setPermission] = useState<PushPermission>("default");
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    setConfigured(isPushConfigured());
    setPermission(currentPermission());
    // Reflect any existing subscription on this device.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => setOn(Boolean(sub)))
        .catch(() => setOn(false));
    }
  }, []);

  async function enable() {
    if (!childId || busy) return;
    setBusy(true);
    setNote(null);
    try {
      const res = await subscribeToReminders(childId);
      setPermission(res.permission);
      setOn(res.ok);
      setNote(res.message);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      await unsubscribeFromReminders();
      setOn(false);
      setNote("Reminders are off on this device.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="reminders" className="flex flex-col gap-3 scroll-mt-20">
      <h2 className="text-sm font-semibold text-fg-2">Dose reminders</h2>
      <Card alt elevation="flat" className="p-4 flex flex-col gap-3">
        {!configured ? (
          <p className="text-sm text-fg-3">
            Reminders aren&rsquo;t set up on this server yet. When they are,
            you can turn on a notification for each scheduled dose, per device.
          </p>
        ) : permission === "denied" ? (
          <p className="text-sm text-fg-3">
            Reminders are blocked for this site. You can turn them back on in
            your browser settings, then come back here.
          </p>
        ) : (
          <>
            <p className="text-sm text-fg-2">
              {on
                ? "This device gets a reminder at each scheduled dose time."
                : "Get a quiet reminder on this device at each scheduled dose time."}
            </p>
            {on ? (
              <Button variant="ghost" fullWidth disabled={busy} onClick={disable}>
                {busy ? "Turning off…" : "Turn off on this device"}
              </Button>
            ) : (
              <Button fullWidth disabled={busy || !childId} onClick={enable}>
                {busy ? "Turning on…" : "Turn on reminders"}
              </Button>
            )}
          </>
        )}
        {note ? <p className="text-2xs text-fg-3">{note}</p> : null}
      </Card>
    </section>
  );
}
