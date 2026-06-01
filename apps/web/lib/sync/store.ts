"use client";

/**
 * A tiny module-level store for the live sync phase, so the SyncDot can reflect
 * real sync activity without prop-drilling. The sync manager writes here; the
 * SyncDot reads via useSyncPhase(). No external state library (CLAUDE.md).
 */

import { useSyncExternalStore } from "react";
import type { SyncPhase } from "./electric.js";

let phase: SyncPhase = "idle";
const listeners = new Set<() => void>();

export function setSyncPhase(next: SyncPhase): void {
  if (next === phase) return;
  phase = next;
  for (const l of listeners) l();
}

export function getSyncPhase(): SyncPhase {
  return phase;
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Reactive read of the current sync phase. */
export function useSyncPhase(): SyncPhase {
  return useSyncExternalStore(subscribe, getSyncPhase, () => "idle" as SyncPhase);
}
