import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CornerDownLeft, Search, X } from "lucide-react";
import { NAV_ITEMS, type Page } from "../../navigation";
import { Button } from "./Button";
import { cn } from "./cn";

export function CommandPalette({
  open,
  onClose,
  onNavigate,
  currentPage,
  alertCount,
}: {
  open: boolean;
  onClose: () => void;
  onNavigate: (page: Page) => void;
  currentPage: Page;
  alertCount: number;
}) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    if (!normalized) return NAV_ITEMS;
    return NAV_ITEMS.filter((item) =>
      `${item.label} ${item.description} ${item.group}`
        .toLocaleLowerCase("es")
        .includes(normalized),
    );
  }, [query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(results.length - 1, 0)));
  }, [results.length]);

  useEffect(() => {
    if (!open) return;
    const node = panelRef.current?.querySelector<HTMLElement>(
      `[data-index="${activeIndex}"]`,
    );
    node?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  if (!open) return null;

  const go = (page: Page) => {
    onNavigate(page);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[60]">
      <div
        className="absolute inset-0 bg-overlay backdrop-blur-[2px]"
        aria-hidden="true"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Buscar y navegar"
        className="absolute left-1/2 top-[10vh] w-[min(92vw,640px)] -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          } else if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((current) => (current + 1) % Math.max(results.length, 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex(
              (current) =>
                (current - 1 + Math.max(results.length, 1)) %
                Math.max(results.length, 1),
            );
          } else if (event.key === "Enter" && results[activeIndex]) {
            event.preventDefault();
            go(results[activeIndex].key);
          } else if (event.key === "Tab") {
            const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
              'input, button, [tabindex]:not([tabindex="-1"])',
            );
            if (!focusable || focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          }
        }}
      >
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search aria-hidden="true" size={18} className="shrink-0 text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            role="combobox"
            aria-expanded="true"
            aria-controls="command-results"
            aria-activedescendant={
              results[activeIndex]
                ? `command-item-${results[activeIndex].key}`
                : undefined
            }
            aria-label="Buscar páginas y acciones"
            placeholder="Buscar página, módulo o acción…"
            className="h-14 min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-muted-2"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Cerrar búsqueda"
          >
            <X aria-hidden="true" size={17} />
          </Button>
        </div>

        <div
          id="command-results"
          role="listbox"
          aria-label="Resultados de navegación"
          className="max-h-[min(60vh,460px)] overflow-y-auto p-2"
        >
          {results.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-semibold text-fg">Sin resultados</p>
              <p className="mt-1 text-xs text-muted">
                Prueba con “zonas”, “alertas”, “medidores” o “tarifas”.
              </p>
            </div>
          ) : (
            results.map((item, index) => {
              const selected = index === activeIndex;
              const Icon = item.icon;
              const isCurrent = item.key === currentPage;
              return (
                <button
                  key={item.key}
                  id={`command-item-${item.key}`}
                  data-index={index}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => go(item.key)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                    selected ? "bg-accent-soft" : "hover:bg-surface-2",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                      selected
                        ? "border-accent-soft-2 bg-surface text-accent-strong"
                        : "border-border bg-surface-2 text-muted",
                    )}
                  >
                    <Icon aria-hidden="true" size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-fg">
                        {item.label}
                      </span>
                      {item.key === "alertas" && alertCount > 0 ? (
                        <span className="rounded-full bg-danger-soft px-1.5 py-0.5 text-[10px] font-bold text-danger-strong tabular-nums">
                          {alertCount}
                        </span>
                      ) : null}
                      {isCurrent ? (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                          actual
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted">
                      {item.description}
                    </span>
                  </span>
                  <span className="hidden shrink-0 rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted sm:block">
                    {item.group}
                  </span>
                  {selected ? (
                    <CornerDownLeft
                      aria-hidden="true"
                      size={14}
                      className="shrink-0 text-accent-strong"
                    />
                  ) : null}
                </button>
              );
            })
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-border bg-surface-2 px-4 py-2.5 text-[11px] text-muted">
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-sans">
              ↑
            </kbd>
            <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-sans">
              ↓
            </kbd>
            navegar
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-sans">
              ↵
            </kbd>
            abrir
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-sans">
              esc
            </kbd>
            cerrar
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

