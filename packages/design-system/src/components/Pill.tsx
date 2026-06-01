import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../lib/cn.js";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "accent";

export interface PillProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  icon?: ReactNode;
}

const toneClasses: Record<Tone, string> = {
  neutral: "bg-surface-card-alt text-fg-2 border-border-card",
  success: "bg-success-bg text-success-fg border-success-bd",
  warning: "bg-warning-bg text-warning-fg border-warning-bd",
  danger: "bg-danger-bg text-danger-fg border-danger-bd",
  info: "bg-info-bg text-info-fg border-info-bd",
  accent: "bg-accent-bg text-accent-fg border-border-accent/30",
};

export const Pill = forwardRef<HTMLSpanElement, PillProps>(function Pill(
  { tone = "neutral", icon, className, children, ...rest },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full border",
        "text-xs font-medium whitespace-nowrap",
        toneClasses[tone],
        className,
      )}
      {...rest}
    >
      {icon ? <span className="shrink-0 [&_svg]:size-3.5">{icon}</span> : null}
      {children}
    </span>
  );
});
