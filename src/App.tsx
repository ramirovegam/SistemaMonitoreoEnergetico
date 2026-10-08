import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import {
  Activity, Bell, BookOpen, ChevronLeft, ChevronRight,
  DollarSign, Home, LayoutDashboard, LineChart,
  Map, Menu, X, Zap,
} from "lucide-react";
import Alerts from "./components/Alerts";
import Dashboard from "./components/Dashboard";
import EnergyAnalysis from "./components/EnergyAnalysis";
import Households from "./components/Households";
import Meters from "./components/Meters";
import ReadingHistory from "./components/ReadingHistory";
import Tariffs from "./components/Tariffs";
import Zones from "./components/Zones";
import { summaryStats } from "./data/synthetic";

type Page =
  | "dashboard" | "zonas" | "hogares" | "medidores"
  | "analisis-energetico" | "historial-lecturas"
  | "alertas" | "tarifas";

interface NavItem {
  key: Page;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  badge?: number;
}

interface SidebarProps {
  page: Page;
  setPage: (page: Page) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const navItems: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "zonas", label: "Zonas", icon: Map },
  { key: "hogares", label: "Servicios", icon: Home },
  { key: "medidores", label: "Medidores", icon: Activity },
  { key: "analisis-energetico", label: "Análisis Energético", icon: LineChart },
  { key: "historial-lecturas", label: "Historial de Lecturas", icon: BookOpen },
  { key: "alertas", label: "Alertas", icon: Bell, badge: summaryStats.activeAlerts },
  { key: "tarifas", label: "Config. Tarifaria", icon: DollarSign },
];

function Sidebar({ page, setPage, collapsed, setCollapsed }: SidebarProps) {
  return (
    <aside className={`relative flex flex-shrink-0 flex-col border-r border-[#eef0f7] bg-white transition-all duration-300 ${collapsed ? "w-[72px]" : "w-60"}`}>
      <div className="blob -right-12 -top-12 h-48 w-48 bg-[#fff4ea] opacity-60" />
      <div className={`flex items-center gap-3 px-4 py-6 ${collapsed ? "justify-center" : ""}`}>
        <div className="gradient-orange flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl shadow-lg">
          <Zap size={18} className="text-white" />
        </div>
        {!collapsed && <div><div className="text-base font-bold text-[#1a1a2e]">SIMET</div><div className="text-[10px] text-[#9098b1]">Monitoreo Energético</div></div>}
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
        {navItems.map((item) => { const Icon = item.icon; const active = page === item.key; return (
          <button type="button" key={item.key} onClick={() => setPage(item.key)} title={collapsed ? item.label : undefined}
            className={`nav-item relative flex items-center gap-3 px-3 py-2.5 text-left ${active ? "active text-white" : "text-[#9098b1]"} ${collapsed ? "justify-center" : ""}`}>
            <Icon size={18} />{!collapsed && <span className="text-[13px] font-medium">{item.label}</span>}
          </button>
        ); })}
      </nav>
      <button type="button" onClick={() => setCollapsed(!collapsed)} className="m-3 flex items-center justify-center rounded-xl p-2 text-xs text-[#9098b1]">
        {collapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /><span className="ml-1">Colapsar</span></>}
      </button>
    </aside>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedZonaId, setSelectedZonaId] = useState<number | null>(null);

  useEffect(() => {
    const navegar = (event: Event): void => {
      const detail = (event as CustomEvent<{ page?: Page; idZona?: number }>).detail;
      if (!detail?.page) return;
      if (detail.page === "zonas" && detail.idZona !== undefined) {
        setSelectedZonaId(detail.idZona);
      }
      setPage(detail.page);
      setMobileOpen(false);
    };

    window.addEventListener("simet:navigate", navegar);
    return () => window.removeEventListener("simet:navigate", navegar);
  }, []);

  const currentPageLabel = navItems.find((item) => item.key === page)?.label ?? "SIMET";
  const currentDate = new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
  const changeMobilePage = (newPage: Page): void => { setPage(newPage); setMobileOpen(false); };

  return (
    <div className="flex h-full overflow-hidden bg-[#f2f3f7]">
      {mobileOpen && <button type="button" aria-label="Cerrar menú" className="fixed inset-0 z-40 bg-[#1a1a2e]/30 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />}
      <div className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 lg:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-full w-60 flex-col bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b px-4 py-5"><b>SIMET</b><button onClick={() => setMobileOpen(false)}><X size={16} /></button></div>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
            {navItems.map((item) => { const Icon = item.icon; return <button type="button" key={item.key} onClick={() => changeMobilePage(item.key)} className={`nav-item flex items-center gap-3 px-3 py-2.5 ${page === item.key ? "active text-white" : "text-[#9098b1]"}`}><Icon size={18} /><span>{item.label}</span></button>; })}
          </nav>
        </div>
      </div>
      <div className="hidden lg:flex"><Sidebar page={page} setPage={setPage} collapsed={collapsed} setCollapsed={setCollapsed} /></div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-4 border-b border-[#eef0f7] bg-white px-6 py-4">
          <button type="button" className="lg:hidden" onClick={() => setMobileOpen(true)}><Menu size={18} /></button>
          <div className="flex-1"><h2 className="text-sm font-semibold text-[#1a1a2e]">{currentPageLabel}</h2><p className="text-[10px] text-[#9098b1]">SIMET · Toluca Smart City · {currentDate}</p></div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {page === "dashboard" && <Dashboard />}
          {page === "zonas" && <Zones initialZonaId={selectedZonaId} />}
          {page === "hogares" && <Households />}
          {page === "medidores" && <Meters />}
          {page === "analisis-energetico" && <EnergyAnalysis />}
          {page === "historial-lecturas" && <ReadingHistory />}
          {page === "alertas" && <Alerts />}
          {page === "tarifas" && <Tariffs />}
        </main>
      </div>
    </div>
  );
}
