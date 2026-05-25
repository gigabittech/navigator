import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../lib/cn.js";

type Elevation = "flat" | "raised" | "floating";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevation?: Elevation;
  /** Use the alt surface (for nested or list-row cards). */
  alt?: boolean;
}

const elevationClasses: Record<Elevation, string> = {
  flat: "shadow-none",
  raised: "shadow-sm",
  floating: "shadow-md",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { elevation = "raised", alt, className, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border border-border-card p-6",
        alt ? "bg-surface-card-alt" : "bg-surface-card",
        elevationClasses[elevation],
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
});
