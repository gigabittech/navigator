"use client";

/**
 * Reactive hook that returns the current sync state for the SyncDot indicator.
 *
 * State logic:
 *   "offline"  — device has no network connection
 *   "synced"   — local-only mode (data is saved on device) OR logged in + online
 *                (sync is deferred but data is safe)
 *
 * The "syncing" and "error" states are reserved for when the ElectricSQL sync
 * layer is wired in. They are not produced here yet.
 */

import { useEffect, useState } from "react";
import { isSupabaseConfigured } from "@/lib/config";
import { useAuthUser } from "./useAuthUser";

export type SyncState = "synced" | "syncing" | "error" | "offline";

export function useSyncState(): SyncState {
  // useAuthUser is no-op when Supabase is not configured.
  useAuthUser();

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

  if (!online) return "offline";

  // In local-only mode data is safely persisted to IndexedDB — treat as saved.
  // When logged in + online, sync is deferred but data is not at risk.
  if (!isSupabaseConfigured()) return "synced";

  return "synced";
}
