import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  Activity,
  Bell,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Home,
  LayoutDashboard,
  LineChart,
  Map,
  Menu,
  X,
  Zap,
} from "lucide-react";

import Alerts from "./components/Alerts";
import Dashboard from "./components/Dashboard";
import EnergyAnalysis from "./components/EnergyAnalysis";
import EnergyCalendar from "./components/EnergyCalendar";
import Households from "./components/Households";
import Meters from "./components/Meters";
import ReadingHistory from "./components/ReadingHistory";
import Tariffs from "./components/Tariffs";
import Zones from "./components/Zones";
import { summaryStats } from "./data/synthetic";

type Page =
  | "dashboard"
  | "zonas"
  | "hogares"
  | "medidores"
  | "analisis-energetico"
  | "historial-lecturas"
  | "calendario-energetico"
  | "alertas"
  | "tarifas";

interface NavItem {
  key: Page;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  badge?: number;
}

interface SidebarProps {
  page: Page;
  onPageChange: (page: Page) => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

interface NavigateDetail {
  page?: Page;
  idZona?: number;
}

const NAV_ITEMS: NavItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    key: "zonas",
    label: "Zonas",
    icon: Map,
  },
  {
    key: "hogares",
    label: "Servicios",
    icon: Home,
  },
  {
    key: "medidores",
    label: "Medidores",
    icon: Activity,
  },
  {
    key: "analisis-energetico",
    label: "Análisis Energético",
    icon: LineChart,
  },
  {
    key: "historial-lecturas",
    label: "Historial de Lecturas",
    icon: BookOpen,
  },
  {
    key: "calendario-energetico",
    label: "Calendario Energético",
    icon: CalendarDays,
  },
  {
    key: "alertas",
    label: "Alertas",
    icon: Bell,
    badge: summaryStats.activeAlerts,
  },
  {
    key: "tarifas",
    label: "Config. Tarifaria",
    icon: DollarSign,
  },
];

function NavButton({
  item,
  active,
  collapsed = false,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  collapsed?: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={`nav-item relative flex items-center gap-3 px-3 py-2.5 text-left ${
        active ? "active text-white" : "text-[#9098b1]"
      } ${collapsed ? "justify-center" : ""}`}
    >
      <Icon size={18} />

      {!collapsed && (
        <>
          <span className="flex-1 text-[13px] font-medium">
            {item.label}
          </span>

          {item.badge !== undefined && item.badge > 0 && (
            <span
              className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[9px] font-bold ${
                active
                  ? "bg-white/20 text-white"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {item.badge > 99 ? "99+" : item.badge}
            </span>
          )}
        </>
      )}

      {collapsed && item.badge !== undefined && item.badge > 0 && (
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
      )}
    </button>
  );
}

function Sidebar({
  page,
  onPageChange,
  collapsed,
  onCollapsedChange,
}: SidebarProps) {
  return (
    <aside
      className={`relative flex flex-shrink-0 flex-col overflow-hidden border-r border-[#eef0f7] bg-white transition-all duration-300 ${
        collapsed ? "w-[72px]" : "w-60"
      }`}
    >
      <div className="blob -right-12 -top-12 h-48 w-48 bg-[#fff4ea] opacity-60" />

      <div
        className={`flex items-center gap-3 px-4 py-6 ${
          collapsed ? "justify-center" : ""
        }`}
      >
        <div className="gradient-orange flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl shadow-lg">
          <Zap size={18} className="text-white" />
        </div>

        {!collapsed && (
          <div>
            <div className="text-base font-bold text-[#1a1a2e]">
              SIMET
            </div>
            <div className="text-[10px] text-[#9098b1]">
              Monitoreo Energético
            </div>
          </div>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
        {NAV_ITEMS.map((item) => (
          <NavButton
            key={item.key}
            item={item}
            active={page === item.key}
            collapsed={collapsed}
            onClick={() => onPageChange(item.key)}
          />
        ))}
      </nav>

      <button
        type="button"
        onClick={() => onCollapsedChange(!collapsed)}
        className="m-3 flex items-center justify-center rounded-xl p-2 text-xs text-[#9098b1] transition hover:bg-[#f6f7fa]"
      >
        {collapsed ? (
          <ChevronRight size={14} />
        ) : (
          <>
            <ChevronLeft size={14} />
            <span className="ml-1">Colapsar</span>
          </>
        )}
      </button>
    </aside>
  );
}

function MobileSidebar({
  page,
  open,
  onClose,
  onPageChange,
}: {
  page: Page;
  open: boolean;
  onClose: () => void;
  onPageChange: (page: Page) => void;
}) {
  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-40 bg-[#1a1a2e]/30 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full w-64 flex-col bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b px-4 py-5">
            <div className="flex items-center gap-3">
              <div className="gradient-orange flex h-9 w-9 items-center justify-center rounded-xl">
                <Zap size={17} className="text-white" />
              </div>
              <div>
                <b className="block text-[#1a1a2e]">SIMET</b>
                <span className="text-[9px] text-[#9098b1]">
                  Monitoreo Energético
                </span>
              </div>
            </div>

            <button
              type="button"
              aria-label="Cerrar menú"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f2f3f7]"
            >
              <X size={16} />
            </button>
          </div>

          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
            {NAV_ITEMS.map((item) => (
              <NavButton
                key={item.key}
                item={item}
                active={page === item.key}
                onClick={() => onPageChange(item.key)}
              />
            ))}
          </nav>
        </div>
      </div>
    </>
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
      return <Zones initialZonaId={selectedZonaId} />;
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
  const [page, setPage] = useState<Page>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedZonaId, setSelectedZonaId] =
    useState<number | null>(null);

  useEffect(() => {
    const navigate = (event: Event): void => {
      const customEvent = event as CustomEvent<NavigateDetail>;
      const detail = customEvent.detail;

      if (!detail?.page) {
        return;
      }

      if (
        detail.page === "zonas" &&
        detail.idZona !== undefined
      ) {
        setSelectedZonaId(detail.idZona);
      }

      setPage(detail.page);
      setMobileOpen(false);
    };

    window.addEventListener("simet:navigate", navigate);

    return () => {
      window.removeEventListener("simet:navigate", navigate);
    };
  }, []);

  const currentPageLabel = useMemo(
    () =>
      NAV_ITEMS.find((item) => item.key === page)?.label ?? "SIMET",
    [page],
  );

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

  const changePage = (newPage: Page) => {
    setPage(newPage);
    setMobileOpen(false);
  };

  return (
    <div className="flex h-full overflow-hidden bg-[#f2f3f7]">
      <MobileSidebar
        page={page}
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onPageChange={changePage}
      />

      <div className="hidden lg:flex">
        <Sidebar
          page={page}
          onPageChange={changePage}
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-4 border-b border-[#eef0f7] bg-white px-4 py-4 sm:px-6">
          <button
            type="button"
            aria-label="Abrir menú"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f2f3f7] lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={18} />
          </button>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-[#1a1a2e]">
              {currentPageLabel}
            </h2>
            <p className="truncate text-[10px] capitalize text-[#9098b1]">
              SIMET · Toluca Smart City · {currentDate}
            </p>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <PageContent
            page={page}
            selectedZonaId={selectedZonaId}
          />
        </main>
      </div>
    </div>
  );
}
