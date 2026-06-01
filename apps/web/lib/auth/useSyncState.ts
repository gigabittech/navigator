"use client";

/**
 * Reactive hook that returns the current sync state for the SyncDot indicator.
 *
 * State logic:
 *   "offline"  — device has no network connection (takes precedence: the user
 *                must know writes are local-only).
 *   "syncing"  — the Electric sync layer is starting / streaming shapes.
 *   "error"    — sync hit a problem. Data is still safe locally; the dot warns.
 *   "synced"   — local-only mode, OR signed-in + online with sync live/idle.
 */

import { useEffect, useState } from "react";
import { isSupabaseConfigured } from "@/lib/config";
import { useAuthUser } from "./useAuthUser";
import { useSyncPhase } from "@/lib/sync/store";

export type SyncState = "synced" | "syncing" | "error" | "offline";

export function useSyncState(): SyncState {
  // Subscribe to auth changes so sync state recomputes on sign-in/out.
  // (No-op when Supabase is not configured.) The value itself is unused here.
  useAuthUser();
  const phase = useSyncPhase();

  const [online, setOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Offline always wins — the user must know writes aren't leaving the device.
  if (!online) return "offline";

  // Local-only mode: data is safely persisted to IndexedDB.
  if (!isSupabaseConfigured()) return "synced";

  // Signed in + online: reflect the live sync phase.
  if (phase === "starting") return "syncing";
  if (phase === "error") return "error";
  return "synced";
}
