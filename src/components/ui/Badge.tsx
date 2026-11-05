import type { ReactNode } from "react";
import { cn } from "./cn";

export type BadgeTone =
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral"
  | "violet";

const tones: Record<BadgeTone, string> = {
  accent: "bg-accent-soft text-accent-strong border-accent-soft-2",
  success: "bg-success-soft text-success-strong border-success-soft",
  warning: "bg-warning-soft text-warning-strong border-warning-soft",
  danger: "bg-danger-soft text-danger-strong border-danger-soft",
  info: "bg-info-soft text-info-strong border-info-soft",
  neutral: "bg-surface-3 text-muted border-border",
  violet: "bg-accent-soft text-accent-strong border-accent-soft-2",
};

export function Badge({
  children,
  tone = "neutral",
  className,
  dot = false,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold leading-none whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {dot ? (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full bg-current"
        />
      ) : null}
      {children}
    </span>
  );
}

