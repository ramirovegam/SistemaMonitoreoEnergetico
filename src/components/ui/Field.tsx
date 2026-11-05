import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { cn } from "./cn";

const controlBase =
  "h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-fg shadow-sm placeholder:text-muted-2 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] disabled:opacity-60";

function FieldLabel({
  htmlFor,
  children,
  hidden,
}: {
  htmlFor: string;
  children: ReactNode;
  hidden?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        "mb-1.5 block text-xs font-semibold text-fg-secondary",
        hidden && "sr-only",
      )}
    >
      {children}
    </label>
  );
}

export interface SelectFieldProps
  extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hideLabel?: boolean;
  hint?: string;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, hideLabel, hint, className, id, children, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const hintId = hint ? `${selectId}-hint` : undefined;
    return (
      <div className="min-w-0">
        <FieldLabel htmlFor={selectId} hidden={hideLabel}>
          {label}
        </FieldLabel>
        <select
          ref={ref}
          id={selectId}
          aria-describedby={hintId}
          className={cn(controlBase, "pr-8", className)}
          {...props}
        >
          {children}
        </select>
        {hint ? (
          <p id={hintId} className="mt-1 text-xs text-muted">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);

SelectField.displayName = "SelectField";

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hideLabel?: boolean;
  hint?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, hideLabel, hint, className, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const hintId = hint ? `${inputId}-hint` : undefined;
    return (
      <div className="min-w-0">
        <FieldLabel htmlFor={inputId} hidden={hideLabel}>
          {label}
        </FieldLabel>
        <input
          ref={ref}
          id={inputId}
          aria-describedby={hintId}
          className={cn(controlBase, className)}
          {...props}
        />
        {hint ? (
          <p id={hintId} className="mt-1 text-xs text-muted">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);

TextField.displayName = "TextField";

export function SearchField({
  label = "Buscar",
  placeholder = "Buscar…",
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  const generatedId = useId();
  const inputId = props.id ?? generatedId;
  return (
    <div className={cn("relative min-w-0", className)}>
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <input
        id={inputId}
        type="search"
        className={cn(controlBase, "pl-9 pr-3")}
        placeholder={placeholder}
        {...props}
      />
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    </div>
  );
}

