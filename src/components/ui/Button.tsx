import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "outline"
  | "subtle"
  | "danger";

type ButtonSize = "xs" | "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-accent-contrast border border-transparent hover:bg-accent-strong active:translate-y-px shadow-sm",
  secondary:
    "bg-surface-2 text-fg border border-border hover:bg-surface-3 active:translate-y-px",
  ghost:
    "bg-transparent text-muted border border-transparent hover:bg-surface-2 hover:text-fg",
  outline:
    "bg-transparent text-fg border border-border-strong hover:bg-surface-2 active:translate-y-px",
  subtle:
    "bg-accent-soft text-accent-strong border border-transparent hover:bg-accent-soft-2",
  danger:
    "bg-danger text-on-danger border border-transparent hover:brightness-95 active:translate-y-px",
};

const sizes: Record<ButtonSize, string> = {
  xs: "h-8 px-2.5 text-xs rounded-md gap-1.5",
  sm: "h-9 px-3 text-sm rounded-md gap-2",
  md: "h-10 px-4 text-sm rounded-lg gap-2",
  lg: "h-11 px-5 text-sm rounded-lg gap-2",
  icon: "h-9 w-9 p-0 rounded-md",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "secondary",
      size = "md",
      type = "button",
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-semibold transition-[background-color,color,box-shadow,transform,border-color] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:pointer-events-none disabled:opacity-55",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);

Button.displayName = "Button";

