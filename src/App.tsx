import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Menu,
  Search,
  X,
  Zap,
} from "lucide-react";

import {
  NAV_GROUPS,
  NAV_ITEMS,
  getPageFromLocation,
  getPageLabel,
  routeHash,
  type Page,
} from "./navigation";
import { obtenerAlertas } from "./services/alertasService";
import { useAutoRefresh } from "./hooks/useAutoRefresh";
import { Button } from "./components/ui/Button";
import { CommandPalette } from "./components/ui/CommandPalette";
import { ThemeMenu } from "./components/ui/ThemeMenu";
import { KpiSkeleton, Skeleton } from "./components/ui/Feedback";
import { cn } from "./components/ui/cn";

const Dashboard = lazy(() => import("./components/Dashboard"));
const Zones = lazy(() => import("./components/Zones"));
const Households = lazy(() => import("./components/Households"));
const Meters = lazy(() => import("./components/Meters"));
const EnergyAnalysis = lazy(() => import("./components/EnergyAnalysis"));
const ReadingHistory = lazy(() => import("./components/ReadingHistory"));
const EnergyCalendar = lazy(() => import("./components/EnergyCalendar"));
const Alerts = lazy(() => import("./components/Alerts"));
const Tariffs = lazy(() => import("./components/Tariffs"));

interface NavigateDetail {
  page?: Page;
  idZona?: number;
}

interface NavButtonProps {
  item: (typeof NAV_ITEMS)[number];
  active: boolean;
  collapsed?: boolean;
  badge?: number;
  onClick: () => void;
}

function NavButton({ item, active, collapsed = false, badge, onClick }: NavButtonProps) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "nav-item group relative flex w-full items-center gap-3 px-3 py-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]",
        active ? "active" : "text-muted",
        collapsed && "justify-center px-0",
      )}
    >
      <Icon size={18} className="shrink-0" aria-hidden="true" />
      {!collapsed ? (
        <>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {item.label}
          </span>
          {badge !== undefined && badge > 0 ? (
            <span
              className={cn(
                "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                active
                  ? "bg-[var(--accent-contrast)] text-accent"
                  : "bg-danger-soft text-danger-strong",
              )}
            >
              {badge > 99 ? "99+" : badge}
            </span>
          ) : null}
        </>
      ) : null}
      {collapsed && badge !== undefined && badge > 0 ? (
        <span
          className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger ring-2 ring-surface"
          aria-hidden="true"
        />
      ) : null}
    </button>
  );
}

function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-5",
        collapsed && "justify-center px-0",
      )}
    >
      <div className="gradient-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-md">
        <Zap size={18} className="text-accent-contrast" aria-hidden="true" />
      </div>
      {!collapsed ? (
        <div className="min-w-0">
          <div className="truncate text-base font-bold tracking-tight text-fg">
            SIMET
          </div>
          <div className="truncate text-xs text-muted">Monitoreo energético</div>
        </div>
      ) : null}
    </div>
  );
}

function SidebarNav({
  page,
  collapsed,
  alertCount,
  onPageChange,
}: {
  page: Page;
  collapsed: boolean;
  alertCount: number;
  onPageChange: (page: Page) => void;
}) {
  return (
    <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto px-3 pb-3">
      {NAV_GROUPS.map((group) => {
        const items = NAV_ITEMS.filter((item) => item.group === group);
        if (items.length === 0) return null;
        return (
          <div key={group} className="mb-4 last:mb-0">
            {!collapsed ? (
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-2">
                {group}
              </p>
            ) : (
              <div className="mx-auto mb-2 h-px w-6 bg-border" aria-hidden="true" />
            )}
            <div className="space-y-0.5">
              {items.map((item) => (
                <NavButton
                  key={item.key}
                  item={item}
                  active={page === item.key}
                  collapsed={collapsed}
                  badge={item.key === "alertas" ? alertCount : undefined}
                  onClick={() => onPageChange(item.key)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

function ApiStatusCard({
  alertCount,
  hasError,
  collapsed,
}: {
  alertCount: number;
  hasError: boolean;
  collapsed: boolean;
}) {
  if (collapsed) {
    return (
      <div className="flex justify-center px-3 py-3">
        <span
          className={cn(
            "h-2.5 w-2.5 rounded-full",
            hasError ? "bg-danger" : "bg-success",
          )}
          title={hasError ? "API con incidencias" : `API operativa · ${alertCount} alertas activas`}
        />
      </div>
    );
  }

  return (
    <div className="m-3 rounded-xl border border-border bg-surface-2 p-3">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2" aria-hidden="true">
          {!hasError ? (
            <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-60" />
          ) : null}
          <span
            className={cn(
              "relative inline-flex h-2 w-2 rounded-full",
              hasError ? "bg-danger" : "bg-success",
            )}
          />
        </span>
        <p className="text-xs font-semibold text-fg">
          {hasError ? "API con incidencias" : "API operativa"}
        </p>
      </div>
      <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
        {hasError
          ? "Mostrando los últimos datos disponibles."
          : `${alertCount} alerta${alertCount === 1 ? "" : "s"} activa${
              alertCount === 1 ? "" : "s"
            } en este momento.`}
      </p>
    </div>
  );
}

function Sidebar({
  page,
  collapsed,
  alertCount,
  hasError,
  onPageChange,
  onCollapsedChange,
}: {
  page: Page;
  collapsed: boolean;
  alertCount: number;
  hasError: boolean;
  onPageChange: (page: Page) => void;
  onCollapsedChange: (collapsed: boolean) => void;
}) {
  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 lg:flex",
        collapsed ? "w-[76px]" : "w-[264px]",
      )}
    >
      <Brand collapsed={collapsed} />
      <SidebarNav
        page={page}
        collapsed={collapsed}
        alertCount={alertCount}
        onPageChange={onPageChange}
      />
      <ApiStatusCard
        alertCount={alertCount}
        hasError={hasError}
        collapsed={collapsed}
      />
      <div className="border-t border-border p-3">
        <button
          type="button"
          onClick={() => onCollapsedChange(!collapsed)}
          aria-label={collapsed ? "Expandir menú lateral" : "Colapsar menú lateral"}
          aria-pressed={collapsed}
          className={cn(
            "flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]",
            collapsed && "px-0",
          )}
        >
          {collapsed ? (
            <ChevronRight aria-hidden="true" size={16} />
          ) : (
            <>
              <ChevronLeft aria-hidden="true" size={16} />
              Colapsar
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

function MobileSidebar({
  open,
  onClose,
  page,
  alertCount,
  hasError,
  onPageChange,
}: {
  open: boolean;
  onClose: () => void;
  page: Page;
  alertCount: number;
  hasError: boolean;
  onPageChange: (page: Page) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const timer = window.setTimeout(() => {
      panelRef.current
        ?.querySelector<HTMLButtonElement>("button")
        ?.focus();
    }, 30);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(timer);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Cerrar menú"
        className="absolute inset-0 bg-overlay backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
        className="absolute inset-y-0 left-0 flex w-[min(86vw,300px)] flex-col border-r border-border bg-surface shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border pr-3">
          <Brand />
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Cerrar menú"
          >
            <X aria-hidden="true" size={18} />
          </Button>
        </div>
        <SidebarNav
          page={page}
          collapsed={false}
          alertCount={alertCount}
          onPageChange={(nextPage) => {
            onPageChange(nextPage);
            onClose();
          }}
        />
        <ApiStatusCard
          alertCount={alertCount}
          hasError={hasError}
          collapsed={false}
        />
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando página">
      <div className="space-y-3">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-4 w-[32rem] max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <KpiSkeleton key={index} />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-5 h-72 w-full" />
        </div>
        <div className="card p-5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-5 h-72 w-full" />
        </div>
      </div>
    </div>
  );
}

function PageContent({
  page,
  selectedZonaId,
}: {
  page: Page;
  selectedZonaId: number | null;
}) {
  switch (page) {
    case "dashboard":
      return <Dashboard />;
    case "zonas":
      return <Zones initialZonaId={selectedZonaId ?? undefined} />;
    case "hogares":
      return <Households />;
    case "medidores":
      return <Meters />;
    case "analisis-energetico":
      return <EnergyAnalysis />;
    case "historial-lecturas":
      return <ReadingHistory />;
    case "calendario-energetico":
      return <EnergyCalendar />;
    case "alertas":
      return <Alerts />;
    case "tarifas":
      return <Tariffs />;
    default:
      return <Dashboard />;
  }
}

export default function App() {
  const [page, setPage] = useState<Page>(() => getPageFromLocation(window.location));
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("simet-sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [selectedZonaId, setSelectedZonaId] = useState<number | null>(null);
  const [alertCount, setAlertCount] = useState(0);
  const [alertsError, setAlertsError] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  const changePage = useCallback((newPage: Page) => {
    setPage(newPage);
    setMobileOpen(false);

    const nextHash = routeHash(newPage);
    if (window.location.hash !== nextHash) {
      // Se conserva la ruta actual para que funcione también en subdirectorios.
      window.history.pushState(null, "", nextHash);
    }
  }, []);

  // Mantiene la URL y la pestaña activa sincronizadas, incluso al recargar
  // con F5 o al usar los botones Atrás/Adelante del navegador.
  useEffect(() => {
    const currentPage = getPageFromLocation(window.location);
    const currentHash = routeHash(currentPage);
    if (window.location.hash !== currentHash) {
      window.history.replaceState(null, "", currentHash);
    }

    const syncFromUrl = () => {
      setPage(getPageFromLocation(window.location));
      setMobileOpen(false);
    };

    window.addEventListener("popstate", syncFromUrl);
    window.addEventListener("hashchange", syncFromUrl);
    return () => {
      window.removeEventListener("popstate", syncFromUrl);
      window.removeEventListener("hashchange", syncFromUrl);
    };
  }, []);

  const loadAlertCount = useCallback(async () => {
    try {
      const alerts = await obtenerAlertas({ estado: "Activa" });
      setAlertCount(alerts.length);
      setAlertsError(false);
      return alerts.length;
    } catch (error) {
      setAlertsError(true);
      throw error;
    }
  }, []);

  const alertRefresh = useAutoRefresh(loadAlertCount, { intervalMs: 60_000 });

  useEffect(() => {
    let active = true;
    loadAlertCount()
      .then(() => {
        if (active) alertRefresh.markUpdated();
      })
      .catch(() => {
        /* el estado de error ya se muestra en la barra lateral */
      });
    return () => {
      active = false;
    };
  }, [alertRefresh.markUpdated, loadAlertCount]);

  useEffect(() => {
    const navigate = (event: Event) => {
      const detail = (event as CustomEvent<NavigateDetail>).detail;
      if (!detail?.page) return;
      if (detail.page === "zonas" && detail.idZona !== undefined) {
        setSelectedZonaId(detail.idZona);
      }
      changePage(detail.page);
    };
    window.addEventListener("simet:navigate", navigate);
    return () => window.removeEventListener("simet:navigate", navigate);
  }, [changePage]);

  useEffect(() => {
    document.title = `${getPageLabel(page)} · SIMET`;
    mainRef.current?.scrollTo({ top: 0 });
  }, [page]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((current) => !current);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const currentDate = useMemo(
    () =>
      new Date().toLocaleDateString("es-MX", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [],
  );

  const currentGroup = useMemo(
    () => NAV_ITEMS.find((item) => item.key === page)?.group ?? "",
    [page],
  );

  const changeCollapsed = useCallback((next: boolean) => {
    setCollapsed(next);
    try {
      localStorage.setItem("simet-sidebar-collapsed", String(next));
    } catch {
      /* almacenamiento no disponible */
    }
  }, []);

  return (
    <div className="flex h-dvh max-h-dvh overflow-hidden bg-bg">
      <a href="#main-content" className="skip-link">
        Saltar al contenido principal
      </a>

      <MobileSidebar
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        page={page}
        alertCount={alertCount}
        hasError={alertsError}
        onPageChange={changePage}
      />

      <Sidebar
        page={page}
        collapsed={collapsed}
        alertCount={alertCount}
        hasError={alertsError}
        onPageChange={changePage}
        onCollapsedChange={changeCollapsed}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-surface/90 px-3 backdrop-blur sm:gap-3 sm:px-5">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú de navegación"
          >
            <Menu aria-hidden="true" size={19} />
          </Button>

          <div className="hidden min-w-0 items-center gap-2 text-sm lg:flex">
            <span className="text-muted">{currentGroup}</span>
            <ChevronRight aria-hidden="true" size={14} className="text-muted-2" />
            <span className="truncate font-semibold text-fg">
              {getPageLabel(page)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="ml-auto flex h-9 min-w-0 items-center gap-2 rounded-lg border border-border bg-surface-2 px-2.5 text-left text-sm text-muted transition-colors hover:border-border-strong hover:bg-surface-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] sm:min-w-[240px] lg:min-w-[300px]"
            aria-label="Buscar o navegar (Ctrl o Cmd + K)"
          >
            <Search aria-hidden="true" size={16} className="shrink-0" />
            <span className="hidden flex-1 truncate sm:inline">
              Buscar o ir a…
            </span>
            <kbd className="hidden rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-muted-2 sm:inline">
              Ctrl K
            </kbd>
          </button>

          <div className="flex items-center gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => changePage("alertas")}
              className="relative gap-1.5"
              aria-label={`Abrir alertas: ${alertCount} activas`}
            >
              <Bell aria-hidden="true" size={16} />
              <span className="hidden text-xs font-semibold sm:inline">
                {alertCount}
              </span>
              {alertCount > 0 ? (
                <span
                  className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-danger ring-2 ring-surface"
                  aria-hidden="true"
                />
              ) : null}
            </Button>
            <ThemeMenu compact />
          </div>
        </header>

        <main ref={mainRef} id="main-content" className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
            <Suspense fallback={<PageSkeleton />}>
              <PageContent page={page} selectedZonaId={selectedZonaId} />
            </Suspense>
            <footer className="mt-10 flex flex-col gap-1 border-t border-border pt-4 text-[11px] text-muted-2 sm:flex-row sm:items-center sm:justify-between">
              <p>SIMET · Toluca Smart City · {currentDate}</p>
              <p>Datos del sistema · actualización automática</p>
            </footer>
          </div>
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={changePage}
        currentPage={page}
        alertCount={alertCount}
      />
    </div>
  );
}

