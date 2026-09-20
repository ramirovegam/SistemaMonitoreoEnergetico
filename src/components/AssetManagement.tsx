import { useState } from "react";
import {
  Zap, Activity, Layout, Building2, GitBranch,
  ChevronRight, ChevronDown, Plus, Search, Edit2, Trash2,
} from "lucide-react";

type AssetTab = "medidores" | "transformadores" | "tableros" | "instalaciones" | "jerarquia";

// Synthetic catalogs
const medidoresCatalog = Array.from({ length: 20 }, (_, i) => ({
  id: `MED-${String(i+1).padStart(4,"0")}`,
  modelo: ["EDMI Mk7C","Landis+Gyr E350","Itron CF55","Honeywell 780"][i%4],
  tipo: ["Monofásico","Trifásico","Bifásico"][i%3],
  tension: ["120V","220V","440V"][i%3],
  precision: ["Clase 0.5","Clase 1.0","Clase 2.0"][i%3],
  instalacion: `2024-0${(i%9)+1}-${String((i*3+1)%28+1).padStart(2,"0")}`,
  zona: ["Norte","Centro","Sur","Industrial"][i%4],
  estado: ["Activo","Activo","Activo","Mantenimiento","Inactivo"][i%5],
}));

const transformadoresCatalog = Array.from({ length: 10 }, (_, i) => ({
  id: `TRF-${String(i+1).padStart(3,"0")}`,
  tipo: ["Distribución","Potencia","Reductor"][i%3],
  capacidad: [`${(i+1)*50} kVA`][0],
  voltajePrim: ["23kV","13.2kV","4.16kV"][i%3],
  voltajeSec: ["220V","440V","120V"][i%3],
  instalacion: `2022-0${(i%9)+1}-15`,
  zona: ["Norte","Centro","Sur","Industrial"][i%4],
  estado: ["Operativo","Operativo","Mantenimiento"][i%3],
}));

const tablerosCatalog = Array.from({ length: 12 }, (_, i) => ({
  id: `TAB-${String(i+1).padStart(3,"0")}`,
  tipo: ["Principal","Secundario","Sub-distribución"][i%3],
  circuitos: (i+1)*4,
  capacidad: `${(i+1)*20}A`,
  instalacion: `2023-0${(i%9)+1}-10`,
  zona: ["Norte","Centro","Sur","Industrial"][i%4],
  estado: ["Activo","Activo","Revisión"][i%3],
}));

const instalaciones = [
  { id: "PLT-001", nombre: "Planta Norte Toluca", tipo: "Planta", zona: "Norte", areas: 4, equipos: 48, estado: "Activo" },
  { id: "PLT-002", nombre: "Centro Comercial Tollocan", tipo: "Edificio", zona: "Centro", areas: 3, equipos: 32, estado: "Activo" },
  { id: "PLT-003", nombre: "Sucursal Sur", tipo: "Sucursal", zona: "Sur", areas: 2, equipos: 18, estado: "Activo" },
  { id: "PLT-004", nombre: "Zona Industrial Lerma", tipo: "Planta", zona: "Industrial", areas: 8, equipos: 120, estado: "Activo" },
];

const hierarchy = [
  {
    label: "Planta Norte Toluca", type: "Planta", id: "PLT-001",
    children: [
      {
        label: "Área de Producción A", type: "Área", id: "AREA-001",
        children: [
          {
            label: "Línea 1", type: "Línea", id: "LIN-001",
            children: [
              { label: "Compresor CM-01", type: "Máquina", id: "EQ-001", children: [] },
              { label: "Motor MT-02", type: "Máquina", id: "EQ-002", children: [] },
            ],
          },
          {
            label: "Línea 2", type: "Línea", id: "LIN-002",
            children: [
              { label: "Bomba BP-03", type: "Máquina", id: "EQ-003", children: [] },
            ],
          },
        ],
      },
      {
        label: "Área de Servicios", type: "Área", id: "AREA-002",
        children: [
          {
            label: "Climatización", type: "Línea", id: "LIN-003",
            children: [
              { label: "HVAC-01", type: "Máquina", id: "EQ-004", children: [] },
              { label: "HVAC-02", type: "Máquina", id: "EQ-005", children: [] },
            ],
          },
        ],
      },
    ],
  },
  {
    label: "Zona Industrial Lerma", type: "Planta", id: "PLT-004",
    children: [
      {
        label: "Área Manufactura", type: "Área", id: "AREA-003",
        children: [
          {
            label: "Línea Ensamble", type: "Línea", id: "LIN-004",
            children: [
              { label: "Robot RA-01", type: "Máquina", id: "EQ-006", children: [] },
              { label: "Soldadora SW-02", type: "Máquina", id: "EQ-007", children: [] },
            ],
          },
        ],
      },
    ],
  },
];

const typeColors: Record<string, { color: string; bg: string }> = {
  Planta: { color: "#ff8a1f", bg: "#fff4ea" },
  Área: { color: "#6366f1", bg: "#eef2ff" },
  Línea: { color: "#10b981", bg: "#ecfdf5" },
  Máquina: { color: "#9098b1", bg: "#f3f4f8" },
};

const statusBadge: Record<string, string> = {
  Activo: "badge-green", Operativo: "badge-green",
  Mantenimiento: "badge-yellow", Revisión: "badge-yellow",
  Inactivo: "badge-gray", "Fuera de servicio": "badge-gray",
};

function HierarchyNode({ node, depth = 0 }: { node: any; depth?: number }) {
  const [open, setOpen] = useState(depth < 2);
  const cfg = typeColors[node.type] || { color: "#9098b1", bg: "#f3f4f8" };
  const hasChildren = node.children?.length > 0;

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-2 px-3 rounded-xl hover:bg-[#f8f9fc] cursor-pointer transition-colors group ${depth === 0 ? "mb-1" : ""}`}
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
        onClick={() => hasChildren && setOpen(o => !o)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {hasChildren ? (
            <ChevronDown size={12} className={`text-[#9098b1] transition-transform flex-shrink-0 ${open ? "" : "-rotate-90"}`} />
          ) : <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cfg.color, opacity: 0.5 }} />}
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>
            {node.type}
          </span>
          <span className="text-xs font-semibold text-[#1a1a2e] truncate">{node.label}</span>
        </div>
        <span className="text-[10px] text-[#9098b1] font-mono opacity-0 group-hover:opacity-100 transition-opacity">{node.id}</span>
      </div>
      {open && hasChildren && (
        <div>
          {node.children.map((child: any) => (
            <HierarchyNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function TableCard({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#f8f9fc] border-b border-[#f0f1f7]">
              {headers.map(h => (
                <th key={h} className="text-left px-4 py-3 text-[#9098b1] font-bold uppercase tracking-wider text-[10px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-[#f0f1f7] hover:bg-[#fff4ea] transition-colors">
                {row.map((cell, j) => (
                  <td key={j} className="px-4 py-3">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const tabs: { key: AssetTab; label: string; icon: React.ComponentType<any>; emoji: string }[] = [
  { key: "medidores", label: "Medidores", icon: Activity, emoji: "⚡" },
  { key: "transformadores", label: "Transformadores", icon: Zap, emoji: "🔌" },
  { key: "tableros", label: "Tableros Eléctricos", icon: Layout, emoji: "🗄️" },
  { key: "instalaciones", label: "Instalaciones", icon: Building2, emoji: "🏭" },
  { key: "jerarquia", label: "Jerarquía de Equipos", icon: GitBranch, emoji: "🌲" },
];

export default function AssetManagement() {
  const [activeTab, setActiveTab] = useState<AssetTab>("medidores");
  const [search, setSearch] = useState("");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]" style={{ fontFamily: "Nunito, sans-serif" }}>
            Gestión de Activos Energéticos
          </h1>
          <p className="text-sm text-[#9098b1] mt-0.5">Catálogo y jerarquía de equipos en la red</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-full gradient-orange text-white text-xs font-bold hover:opacity-90 transition-opacity shadow-md">
          <Plus size={12} /> Agregar Activo
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
              activeTab === t.key
                ? "gradient-orange text-white shadow-md"
                : "bg-white border border-[#e5e7ef] text-[#9098b1] hover:text-[#1a1a2e] hover:border-[#ff8a1f]"
            }`}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      {activeTab !== "jerarquia" && (
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9098b1]" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar en catálogo…"
            className="w-full bg-white border border-[#e5e7ef] rounded-2xl pl-10 pr-4 py-2.5 text-sm text-[#1a1a2e] placeholder-[#9098b1] focus:outline-none focus:border-[#ff8a1f]"
          />
        </div>
      )}

      {/* Content */}
      {activeTab === "medidores" && (
        <TableCard
          headers={["ID", "Modelo", "Tipo", "Tensión", "Precisión", "Zona", "Instalación", "Estado", ""]}
          rows={medidoresCatalog.filter(m =>
            !search || m.id.toLowerCase().includes(search.toLowerCase()) || m.modelo.toLowerCase().includes(search.toLowerCase())
          ).map(m => [
            <span className="font-bold text-[#ff8a1f] font-mono">{m.id}</span>,
            <span className="font-semibold text-[#1a1a2e]">{m.modelo}</span>,
            <span className="text-[#9098b1]">{m.tipo}</span>,
            <span className="font-mono text-[#6366f1]">{m.tension}</span>,
            <span className="text-[#9098b1]">{m.precision}</span>,
            <span className="text-[#9098b1]">{m.zona}</span>,
            <span className="text-[#9098b1] font-mono">{m.instalacion}</span>,
            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${statusBadge[m.estado] || "badge-gray"}`}>{m.estado}</span>,
            <div className="flex gap-1">
              <button className="p-1 rounded hover:bg-[#fff4ea]"><Edit2 size={11} className="text-[#9098b1]" /></button>
              <button className="p-1 rounded hover:bg-[#fef2f2]"><Trash2 size={11} className="text-[#9098b1]" /></button>
            </div>,
          ])}
        />
      )}

      {activeTab === "transformadores" && (
        <TableCard
          headers={["ID", "Tipo", "Capacidad", "V. Primario", "V. Secundario", "Zona", "Instalación", "Estado"]}
          rows={transformadoresCatalog.filter(t =>
            !search || t.id.toLowerCase().includes(search.toLowerCase())
          ).map(t => [
            <span className="font-bold text-[#ff8a1f] font-mono">{t.id}</span>,
            <span className="font-semibold text-[#1a1a2e]">{t.tipo}</span>,
            <span className="font-mono text-[#6366f1] font-bold">{t.capacidad}</span>,
            <span className="font-mono text-[#9098b1]">{t.voltajePrim}</span>,
            <span className="font-mono text-[#9098b1]">{t.voltajeSec}</span>,
            <span className="text-[#9098b1]">{t.zona}</span>,
            <span className="text-[#9098b1] font-mono">{t.instalacion}</span>,
            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${statusBadge[t.estado] || "badge-gray"}`}>{t.estado}</span>,
          ])}
        />
      )}

      {activeTab === "tableros" && (
        <TableCard
          headers={["ID", "Tipo", "Circuitos", "Capacidad", "Zona", "Instalación", "Estado"]}
          rows={tablerosCatalog.filter(t =>
            !search || t.id.toLowerCase().includes(search.toLowerCase())
          ).map(t => [
            <span className="font-bold text-[#ff8a1f] font-mono">{t.id}</span>,
            <span className="font-semibold text-[#1a1a2e]">{t.tipo}</span>,
            <span className="font-mono text-[#1a1a2e]">{t.circuitos} circuitos</span>,
            <span className="font-mono text-[#6366f1] font-bold">{t.capacidad}</span>,
            <span className="text-[#9098b1]">{t.zona}</span>,
            <span className="text-[#9098b1] font-mono">{t.instalacion}</span>,
            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${statusBadge[t.estado] || "badge-gray"}`}>{t.estado}</span>,
          ])}
        />
      )}

      {activeTab === "instalaciones" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {instalaciones.map(inst => (
            <div key={inst.id} className="card p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-[10px] font-bold text-[#ff8a1f] bg-[#fff4ea] px-2 py-0.5 rounded-full">{inst.tipo}</span>
                  <h3 className="text-base font-bold text-[#1a1a2e] mt-1.5" style={{ fontFamily: "Nunito, sans-serif" }}>{inst.nombre}</h3>
                  <p className="text-xs text-[#9098b1] font-mono mt-0.5">{inst.id}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadge[inst.estado]}`}>{inst.estado}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: "Zona", value: inst.zona, color: "#ff8a1f" },
                  { label: "Áreas", value: inst.areas, color: "#6366f1" },
                  { label: "Equipos", value: inst.equipos, color: "#10b981" },
                ].map(s => (
                  <div key={s.label} className="rounded-xl bg-[#f8f9fc] py-2">
                    <p className="text-sm font-bold" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-[10px] text-[#9098b1]">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "jerarquia" && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {Object.entries(typeColors).map(([type, cfg]) => (
              <span key={type} className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>
                {type}
              </span>
            ))}
          </div>
          <div className="flex flex-col gap-0.5">
            {hierarchy.map(node => (
              <HierarchyNode key={node.id} node={node} depth={0} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
