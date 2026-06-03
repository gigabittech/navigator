"use client";

import { useEffect, useState } from "react";
import { Button, Card, Field } from "@navigator/design-system/components";
import {
  isMfaConfigured,
  hasActiveTotp,
  enrollTotp,
  verifyTotp,
  type EnrollResult,
} from "@/lib/auth/mfa";

/**
 * Optional two-factor (TOTP) setup. A scaffold over Supabase Auth MFA — fully
 * functional when TOTP is enabled in the Supabase project; shows a calm "not
 * available" state in local mode.
 */
export function TwoFactor() {
  const [configured, setConfigured] = useState(false);
  const [active, setActive] = useState(false);
  const [enroll, setEnroll] = useState<EnrollResult | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    setConfigured(isMfaConfigured());
    hasActiveTotp().then(setActive).catch(() => setActive(false));
  }, []);

  async function start() {
    setBusy(true);
    setNote(null);
    try {
      setEnroll(await enrollTotp());
    } catch {
      setNote("Couldn't start setup. Two-factor may not be enabled on this server yet.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!enroll) return;
    setBusy(true);
    setNote(null);
    try {
      await verifyTotp(enroll.factorId, code.trim());
      setActive(true);
      setEnroll(null);
      setCode("");
      setNote("Two-factor is on.");
    } catch {
      setNote("That code didn't match. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-fg-2">Two-factor authentication</h2>
      <Card alt elevation="flat" className="p-4 flex flex-col gap-3">
        {!configured ? (
          <p className="text-sm text-fg-3">
            Two-factor isn&rsquo;t available in local mode. When you sign in with an account, you can
            add an authenticator app for extra protection.
          </p>
        ) : active ? (
          <p className="text-sm text-fg-2">
            Two-factor is on. You&rsquo;ll be asked for a code from your authenticator app when you
            sign in.
          </p>
        ) : enroll ? (
          <>
            <p className="text-sm text-fg-2">
              Add this secret to your authenticator app, then enter the 6-digit code to turn on
              two-factor.
            </p>
            <code className="select-all break-all rounded-md bg-surface-card px-2 py-1 text-2xs text-fg-2">
              {enroll.secret}
            </code>
            <Field
              label="6-digit code"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="000000"
            />
            <div>
              <Button size="sm" onClick={confirm} disabled={busy || code.length < 6}>
                {busy ? "Verifying…" : "Turn on two-factor"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-fg-2">
              Add an authenticator app for an extra layer of protection at sign-in.
            </p>
            <div>
              <Button variant="secondary" size="sm" onClick={start} disabled={busy}>
                {busy ? "Starting…" : "Set up two-factor"}
              </Button>
            </div>
          </>
        )}
        {note ? <p className="text-2xs text-fg-3">{note}</p> : null}
      </Card>
    </section>
  );
}
