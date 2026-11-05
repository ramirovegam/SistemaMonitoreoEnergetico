import { useEffect, useId, useRef, useState } from "react";
import { Check, Monitor, Moon, Palette, Sun } from "lucide-react";
import {
  ACCENTS,
  THEME_MODES,
  useTheme,
  type ThemeMode,
} from "../../theme/ThemeProvider";
import { Button } from "./Button";
import { cn } from "./cn";

const modeIcons: Record<ThemeMode, typeof Sun> = {
  light: Sun,
  dark: Moon,
  auto: Monitor,
};

export function ThemeMenu({ compact = false }: { compact?: boolean }) {
  const { mode, accent, resolvedTheme, setMode, setAccent } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const ModeIcon = modeIcons[mode];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <Button
        variant="secondary"
        size={compact ? "icon" : "sm"}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label="Cambiar tema y color de acento"
        onClick={() => setOpen((current) => !current)}
        className={compact ? undefined : "gap-2"}
      >
        <Palette aria-hidden="true" size={15} className="text-accent-strong" />
        {compact ? null : (
          <>
            <span className="hidden sm:inline">
              {THEME_MODES.find((item) => item.id === mode)?.label ?? "Tema"}
            </span>
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-full bg-[var(--accent)] ring-1 ring-border"
            />
          </>
        )}
      </Button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Apariencia de la interfaz"
          className="absolute right-0 z-40 mt-2 w-72 rounded-xl border border-border bg-surface p-4 shadow-xl"
        >
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Apariencia
              </p>
              <p className="mt-0.5 text-xs text-muted-2">
                Tema {resolvedTheme === "dark" ? "oscuro" : "claro"}
              </p>
            </div>
            <ModeIcon aria-hidden="true" size={18} className="text-accent-strong" />
          </div>

          <div className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-surface-2 p-1">
            {THEME_MODES.map((item) => {
              const Icon = modeIcons[item.id];
              const selected = item.id === mode;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setMode(item.id)}
                  className={cn(
                    "flex min-h-10 flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1.5 text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]",
                    selected
                      ? "bg-surface text-fg shadow-sm"
                      : "text-muted hover:text-fg",
                  )}
                >
                  <Icon aria-hidden="true" size={15} />
                  {item.label}
                </button>
              );
            })}
          </div>

          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            Color de acento
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ACCENTS.map((item) => {
              const selected = item.id === accent;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-label={`Acento ${item.label}`}
                  aria-pressed={selected}
                  title={item.label}
                  onClick={() => setAccent(item.id)}
                  className={cn(
                    "relative flex h-9 w-9 items-center justify-center rounded-full border transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]",
                    selected ? "border-fg" : "border-border",
                  )}
                  style={{ background: item.swatch }}
                >
                  {selected ? (
                    <Check
                      aria-hidden="true"
                      size={15}
                      className="text-[var(--swatch-check)] drop-shadow-sm"
                    />
                  ) : null}
                </button>
              );
            })}
          </div>

          <p className="mt-4 rounded-md bg-surface-2 p-2 text-[11px] leading-relaxed text-muted">
            Se guarda en este navegador. La opción Auto sigue el tema del sistema.
          </p>
        </div>
      ) : null}
    </div>
  );
}

