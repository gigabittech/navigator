import { type HTMLAttributes } from "react";
import { cn } from "../lib/cn.js";

export type SyncState = "synced" | "syncing" | "offline" | "error";

export interface SyncDotProps extends HTMLAttributes<HTMLSpanElement> {
  state: SyncState;
  /** Render an inline text label after the dot. */
  showLabel?: boolean;
}

const stateLabel: Record<SyncState, string> = {
  synced: "Saved",
  syncing: "Saving",
  offline: "Offline — saved locally",
  error: "Couldn't sync",
};

const stateDotClass: Record<SyncState, string> = {
  synced: "bg-success-dot",
  syncing: "bg-accent-500 animate-pulse-slow",
  offline: "bg-fg-4",
  error: "bg-danger-dot",
};

/**
 * The 6×6 status dot. Pair with the label (or render `showLabel`) so the
 * state is not communicated by color alone.
 */
export function SyncDot({
  state,
  showLabel = false,
  className,
  children,
  ...rest
}: SyncDotProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-2 text-xs text-fg-3", className)}
      role="status"
      aria-live="polite"
      {...rest}
    >
      <span
        aria-hidden
        className={cn("size-1.5 rounded-full", stateDotClass[state])}
      />
      {showLabel ? <span>{children ?? stateLabel[state]}</span> : null}
    </span>
  );
}
