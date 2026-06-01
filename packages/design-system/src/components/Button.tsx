"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "../lib/cn.js";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-accent-600 text-fg-on-accent hover:bg-accent-700 active:scale-[0.98] shadow-sm",
  secondary:
    "bg-surface-card text-fg-1 border border-border-card hover:bg-surface-card-alt active:scale-[0.98]",
  ghost: "bg-transparent text-fg-2 hover:bg-surface-card-alt active:scale-[0.98]",
  danger:
    "bg-danger-bg text-danger-fg border border-danger-bd hover:bg-danger-bg/80 active:scale-[0.98]",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-10 px-3 text-sm gap-1.5 rounded-md",
  md: "h-12 px-5 text-base gap-2 rounded-lg",
  lg: "h-14 px-6 text-md gap-2 rounded-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    leadingIcon,
    trailingIcon,
    fullWidth,
    className,
    children,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center font-semibold whitespace-nowrap select-none",
        "transition-[transform,background-color,box-shadow] duration-fast ease-standard",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border-accent focus-visible:ring-offset-surface-page",
        "disabled:opacity-50 disabled:pointer-events-none",
        "min-h-tap", // 44px tap target floor
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {leadingIcon ? <span className="shrink-0">{leadingIcon}</span> : null}
      {children}
      {trailingIcon ? <span className="shrink-0">{trailingIcon}</span> : null}
    </button>
  );
});
