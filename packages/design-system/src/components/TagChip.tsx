"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "../lib/cn.js";

export interface TagChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  icon?: ReactNode;
}

/**
 * A selectable chip for mood / trigger / behavior tags. Press to toggle.
 * Always controlled — pass `selected` and an `onClick` handler.
 */
export const TagChip = forwardRef<HTMLButtonElement, TagChipProps>(function TagChip(
  { selected = false, icon, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={selected}
      className={cn(
        "inline-flex items-center gap-1.5 h-9 px-3 rounded-full border text-sm font-medium",
        "transition-[background-color,border-color,color] duration-fast",
        "active:scale-[0.98]",
        selected
          ? "bg-accent-bg text-accent-fg border-border-accent"
          : "bg-surface-card text-fg-2 border-border-card hover:bg-surface-card-alt",
        className,
      )}
      {...rest}
    >
      {icon ? <span className="shrink-0 [&_svg]:size-4" aria-hidden>{icon}</span> : null}
      {children}
    </button>
  );
});
