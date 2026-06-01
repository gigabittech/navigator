"use client";

/**
 * Web Push subscription flow for dose reminders.
 *
 * Client side: ask permission, subscribe via the service worker's pushManager,
 * and persist the PushSubscription to Supabase (push_subscriptions). The server
 * function (supabase/functions/send_reminders) reads those rows to send.
 *
 * DEPLOY-GATED: needs a VAPID key pair. The public key is exposed as
 * NEXT_PUBLIC_VAPID_PUBLIC_KEY; the private key lives in the edge function's
 * secrets. Without the public key, isPushConfigured() is false and the UI shows
 * a calm "not set up" state instead of attempting to subscribe.
 */

import { isSupabaseConfigured } from "../config.js";
import { createBrowserClient } from "../auth/supabase.js";
import { getClientId } from "../db/client.js";

export type PushPermission = "default" | "granted" | "denied" | "unsupported";

/** True when push can run: browser support + Supabase + a VAPID public key. */
export function isPushConfigured(): boolean {
  if (typeof window === "undefined") return false;
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  return supported && isSupabaseConfigured() && Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
}

export function currentPermission(): PushPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as PushPermission;
}

/**
 * VAPID keys are base64url; the browser's applicationServerKey wants an
 * ArrayBuffer. Returns a fresh ArrayBuffer (not a possibly-shared view buffer)
 * so the type is exactly BufferSource.
 */
function urlBase64ToArrayBuffer(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buf;
}

export interface SubscribeResult {
  ok: boolean;
  permission: PushPermission;
  message: string;
}

/**
 * Subscribe this device to dose reminders for a child. Idempotent: an existing
 * subscription is reused. Stores the subscription keyed by (client_id, child).
 */
export async function subscribeToReminders(childId: string): Promise<SubscribeResult> {
  if (!isPushConfigured()) {
    return { ok: false, permission: currentPermission(), message: "Reminders aren't set up yet." };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return {
      ok: false,
      permission: permission as PushPermission,
      message:
        permission === "denied"
          ? "Reminders are blocked. You can turn them on in your browser settings."
          : "Reminders need permission to send.",
    };
  }

  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToArrayBuffer(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
    }));

  const json = sub.toJSON();
  const supabase = createBrowserClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      client_id: getClientId(),
      child_id: childId,
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
    },
    { onConflict: "endpoint" },
  );
  if (error) {
    return { ok: false, permission: "granted", message: "Couldn't save the reminder setup. Try again." };
  }

  return { ok: true, permission: "granted", message: "Reminders are on for this device." };
}

/** Turn reminders off on this device: unsubscribe + remove the stored row. */
export async function unsubscribeFromReminders(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  if (isSupabaseConfigured()) {
    await createBrowserClient().from("push_subscriptions").delete().eq("endpoint", endpoint);
  }
}
