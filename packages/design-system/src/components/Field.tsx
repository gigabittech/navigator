"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "../lib/cn.js";

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Inline helper text under the field. */
  hint?: string;
  /** Error message — replaces hint when set, also paints the field. */
  error?: string;
  leadingIcon?: ReactNode;
  trailingSlot?: ReactNode;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, hint, error, leadingIcon, trailingSlot, className, id, ...rest },
  ref,
) {
  const reactId = useId();
  const inputId = id ?? reactId;
  const describedById = `${inputId}-desc`;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className="text-xs font-semibold text-fg-2 tracking-wide"
      >
        {label}
      </label>
      <div
        className={cn(
          "relative flex items-center h-12 rounded-md border bg-surface-input",
          "focus-within:border-border-accent focus-within:shadow-glow-accent",
          "transition-[box-shadow,border-color] duration-fast",
          error ? "border-danger-bd" : "border-border-card",
        )}
      >
        {leadingIcon ? (
          <span className="pl-3 text-fg-3 shrink-0 [&_svg]:size-5" aria-hidden>
            {leadingIcon}
          </span>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={hint || error ? describedById : undefined}
          className={cn(
            "flex-1 bg-transparent px-3 text-base text-fg-1 placeholder:text-fg-4",
            "rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-accent",
            className,
          )}
          {...rest}
        />
        {trailingSlot ? <span className="pr-2 shrink-0">{trailingSlot}</span> : null}
      </div>
      {(hint || error) && (
        <p
          id={describedById}
          className={cn("text-xs", error ? "text-danger-fg" : "text-fg-3")}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
});
