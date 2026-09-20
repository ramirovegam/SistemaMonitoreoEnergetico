import { useState } from "react";
import {
  LayoutDashboard, Map, Home, Activity, Bell, BarChart2, Settings,
  Zap, Menu, X, ChevronLeft, ChevronRight, DollarSign, FileText, Leaf, Package,
} from "lucide-react";
import Dashboard from "./components/Dashboard";
import Zones from "./components/Zones";
import Households from "./components/Households";
import Meters from "./components/Meters";
import AssetManagement from "./components/AssetManagement";
import Alerts from "./components/Alerts";
import Analytics from "./components/Analytics";
import Tariffs from "./components/Tariffs";
import Reports from "./components/Reports";
import Efficiency from "./components/Efficiency";
import Admin from "./components/Admin";
import { summaryStats } from "./data/synthetic";

type Page = "dashboard" | "zonas" | "hogares" | "medidores" | "activos" | "alertas" | "analitica" | "tarifas" | "reportes" | "eficiencia" | "admin";

const navItems: { key: Page; label: string; icon: React.ComponentType<any>; badge?: number; group?: string }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "zonas", label: "Zonas", icon: Map },
  { key: "hogares", label: "Hogares", icon: Home },
  { key: "medidores", label: "Medidores", icon: Activity },
  { key: "activos", label: "Activos Energéticos", icon: Package },
  { key: "alertas", label: "Alertas", icon: Bell, badge: summaryStats.activeAlerts },
  { key: "analitica", label: "Analítica", icon: BarChart2 },
  { key: "tarifas", label: "Config. Tarifaria", icon: DollarSign },
  { key: "reportes", label: "Reportes", icon: FileText },
  { key: "eficiencia", label: "Eficiencia Energética", icon: Leaf },
  { key: "admin", label: "Administración", icon: Settings },
];

function Sidebar({ page, setPage, collapsed, setCollapsed }: {
  page: Page; setPage: (p: Page) => void;
  collapsed: boolean; setCollapsed: (c: boolean) => void;
}) {
  return (
    <aside className={`flex flex-col bg-white border-r border-[#eef0f7] transition-all duration-300 ${collapsed ? "w-[72px]" : "w-60"} flex-shrink-0 relative`}>
      {/* Decorative blob */}
      <div className="blob w-48 h-48 bg-[#fff4ea] opacity-60 -top-12 -right-12" />

      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-6 ${collapsed ? "justify-center" : ""}`}>
        <div className="w-10 h-10 rounded-2xl gradient-orange flex items-center justify-center flex-shrink-0 shadow-lg" style={{ boxShadow: "0 4px 14px rgba(255,138,31,0.4)" }}>
          <Zap size={18} className="text-white" />
        </div>
        {!collapsed && (
          <div>
            <div className="text-base font-bold text-[#1a1a2e]" style={{ fontFamily: "Nunito, sans-serif" }}>SIMET</div>
            <div className="text-[10px] text-[#9098b1] -mt-0.5">Monitoreo Energético</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 flex flex-col gap-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = page === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setPage(item.key)}
              title={collapsed ? item.label : undefined}
              className={`nav-item flex items-center gap-3 px-3 py-2.5 text-left relative ${
                active ? "active text-white" : "text-[#9098b1]"
              } ${collapsed ? "justify-center" : ""}`}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="text-[13px] font-medium">{item.label}</span>}
              {item.badge && item.badge > 0 && (
                <span className={`${collapsed ? "absolute top-1.5 right-1.5" : "ml-auto"} min-w-[18px] h-[18px] rounded-full bg-[#ef4444] text-white text-[9px] font-bold flex items-center justify-center px-1`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User + collapse */}
      <div className="px-3 pb-5 flex flex-col gap-2">
        <div className="border-t border-[#f0f1f7] pt-3">
          {!collapsed && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#f8f9fc]">
              <div className="flex-1 min-w-0">
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[#9098b1] hover:bg-[#f2f3f7] hover:text-[#ff8a1f] transition-all text-xs"
          >
            {collapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /><span>Colapsar</span></>}
          </button>
        </div>
      </div>
    </aside>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-full bg-[#f2f3f7] overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-[#1a1a2e]/30 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile drawer */}
      <div className={`fixed inset-y-0 left-0 z-50 lg:hidden transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex flex-col w-60 h-full bg-white shadow-2xl">
          <div className="flex items-center justify-between px-4 py-5 border-b border-[#f0f1f7]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl gradient-orange flex items-center justify-center shadow-md">
                <Zap size={16} className="text-white" />
              </div>
              <div>
                <div className="text-sm font-bold text-[#1a1a2e]" style={{ fontFamily: "Nunito, sans-serif" }}>SIMET</div>
                <div className="text-[9px] text-[#9098b1]">Monitoreo Energético</div>
              </div>
            </div>
            <button onClick={() => setMobileOpen(false)} className="p-1 rounded-lg hover:bg-[#f2f3f7]">
              <X size={16} className="text-[#9098b1]" />
            </button>
          </div>
          <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const active = page === item.key;
              return (
                <button key={item.key} onClick={() => { setPage(item.key); setMobileOpen(false); }}
                  className={`nav-item flex items-center gap-3 px-3 py-2.5 text-left ${active ? "active text-white" : "text-[#9098b1]"}`}>
                  <Icon size={18} />
                  <span className="text-[13px] font-medium">{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <span className="ml-auto min-w-[18px] h-[18px] rounded-full bg-[#ef4444] text-white text-[9px] font-bold flex items-center justify-center px-1">{item.badge}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar page={page} setPage={setPage} collapsed={collapsed} setCollapsed={setCollapsed} />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center gap-4 px-6 py-4 bg-white border-b border-[#eef0f7]" style={{ boxShadow: "0 1px 4px rgba(26,26,46,0.04)" }}>
          <button className="lg:hidden p-1.5 rounded-xl hover:bg-[#f2f3f7]" onClick={() => setMobileOpen(true)}>
            <Menu size={18} className="text-[#9098b1]" />
          </button>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-[#1a1a2e]">
              {navItems.find(n => n.key === page)?.label}
            </h2>
            <p className="text-[10px] text-[#9098b1]">SIMET · Toluca Smart City · {new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-[#10b981] bg-[#ecfdf5] px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] pulse-dot" />
              <span className="font-medium hidden sm:block">Operativo</span>
            </div>
            <button className="relative p-2 rounded-xl hover:bg-[#f2f3f7] transition-colors">
              <Bell size={16} className="text-[#9098b1]" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#ef4444]" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {page === "dashboard" && <Dashboard />}
          {page === "zonas" && <Zones />}
          {page === "hogares" && <Households />}
          {page === "medidores" && <Meters />}
          {page === "activos" && <AssetManagement />}
          {page === "alertas" && <Alerts />}
          {page === "analitica" && <Analytics />}
          {page === "tarifas" && <Tariffs />}
          {page === "reportes" && <Reports />}
          {page === "eficiencia" && <Efficiency />}
          {page === "admin" && <Admin />}
        </main>
      </div>
    </div>
  );
}
