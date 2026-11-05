import { PauseCircle, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useRelativeTime, type AutoRefreshState } from "../../hooks/useAutoRefresh";
import { Button } from "./Button";
import { cn } from "./cn";

export function LiveStatus({
  state,
  className,
  compact = false,
}: {
  state: AutoRefreshState;
  className?: string;
  compact?: boolean;
}) {
  const relative = useRelativeTime(state.lastUpdated);
  const hasError = Boolean(state.error);
  const label = state.isPaused
    ? "Pausado en pestaña oculta"
    : hasError
      ? "Sin conexión; reintentando"
      : `Actualizado ${relative}`;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-surface px-2.5 py-1.5 text-xs text-muted shadow-sm",
        className,
      )}
      title={state.error ?? label}
    >
      <span className="relative flex h-2 w-2" aria-hidden="true">
        {!state.isPaused && !hasError ? (
          <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-60" />
        ) : null}
        <span
          className={cn(
            "relative inline-flex h-2 w-2 rounded-full",
            hasError
              ? "bg-danger"
              : state.isPaused
                ? "bg-warning"
                : "bg-success",
          )}
        />
      </span>
      {state.isPaused ? (
        <PauseCircle aria-hidden="true" size={14} className="text-warning" />
      ) : hasError ? (
        <WifiOff aria-hidden="true" size={14} className="text-danger" />
      ) : (
        <Wifi aria-hidden="true" size={14} className="text-success" />
      )}
      <span className="whitespace-nowrap font-medium" aria-live="polite">
        {compact ? (state.isPaused ? "Pausado" : relative) : label}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 rounded-full"
        onClick={state.refreshNow}
        disabled={state.isRefreshing || state.isPaused}
        aria-label="Actualizar datos ahora"
        title="Actualizar ahora"
      >
        <RefreshCw
          aria-hidden="true"
          size={13}
          className={state.isRefreshing ? "animate-spin" : undefined}
        />
      </Button>
    </div>
  );
}

