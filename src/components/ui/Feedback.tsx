import type { ReactNode } from "react";
import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";
import { Button } from "./Button";
import { cn } from "./cn";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("skeleton", className)} />;
}

export function KpiSkeleton() {
  return (
    <div className="card p-5">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-4 h-8 w-32" />
      <Skeleton className="mt-3 h-3 w-40" />
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="table-scroll" aria-hidden="true">
      <div className="border-b border-border bg-surface-2 px-4 py-3">
        <Skeleton className="h-3 w-48" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 px-4 py-3.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-muted">
        {icon ?? <Inbox aria-hidden="true" size={22} />}
      </div>
      <h3 className="text-sm font-semibold text-fg">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-md text-sm leading-relaxed text-muted">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "No se pudieron cargar los datos",
  description,
  onRetry,
  retrying = false,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center px-6 py-14 text-center"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger-strong">
        <AlertTriangle aria-hidden="true" size={22} />
      </div>
      <h3 className="text-sm font-semibold text-fg">{title}</h3>
      <p className="mt-1 max-w-md text-sm leading-relaxed text-muted">
        {description ??
          "Revisa la conexión con la API. Conservamos los últimos datos disponibles y puedes reintentar."}
      </p>
      {onRetry ? (
        <Button
          className="mt-5"
          variant="secondary"
          size="sm"
          onClick={onRetry}
          disabled={retrying}
        >
          <RefreshCw
            aria-hidden="true"
            size={15}
            className={retrying ? "animate-spin" : undefined}
          />
          {retrying ? "Reintentando…" : "Reintentar"}
        </Button>
      ) : null}
    </div>
  );
}

