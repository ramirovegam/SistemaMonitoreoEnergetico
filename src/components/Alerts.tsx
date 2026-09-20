import { useState } from "react";
import { Zap, WifiOff, AlertCircle, Shield, Wrench, Filter, ChevronDown } from "lucide-react";
import { alerts, Alert, AlertType } from "../data/synthetic";

const typeConfig: Record<AlertType, { icon: React.ComponentType<any>; color: string; bg: string; emoji: string }> = {
  "Pico de demanda": { icon: Zap, color: "#f59e0b", bg: "#fffbeb", emoji: "⚡" },
  "Pérdida de comunicación": { icon: WifiOff, color: "#9098b1", bg: "#f3f4f8", emoji: "📡" },
  "Falla de medición": { icon: AlertCircle, color: "#ef4444", bg: "#fef2f2", emoji: "📊" },
  "Fraude simulado": { icon: Shield, color: "#6366f1", bg: "#eef2ff", emoji: "🔍" },
  "Mantenimiento": { icon: Wrench, color: "#10b981", bg: "#ecfdf5", emoji: "🔧" },
};

const priorityBadge = {
  Alta: "badge-red",
  Media: "badge-yellow",
  Baja: "badge-gray",
};
const statusBadge = {
  Activa: "badge-red",
  "En revisión": "badge-yellow",
  Resuelta: "badge-green",
};
const priorityOrder = { Alta: 0, Media: 1, Baja: 2 };

function AlertCard({ a }: { a: Alert }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = typeConfig[a.type];
  const Icon = cfg.icon;

  return (
    <div className={`card transition-all ${a.status === "Activa" ? "ring-1 ring-[#ef444440]" : ""}`}>
      <button className="w-full text-left p-4" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: cfg.bg }}>
            <Icon size={18} color={cfg.color} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1 flex-wrap">
              <span className="text-sm font-semibold text-[#1a1a2e]">{a.type}</span>
              <div className="flex gap-1.5 flex-shrink-0">
                <span className={`text-[10px] font-bold px-2.5 py-1 ${priorityBadge[a.priority]}`}>{a.priority}</span>
                <span className={`text-[10px] font-bold px-2.5 py-1 ${statusBadge[a.status]}`}>{a.status}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] text-[#9098b1]">
              <span className="font-medium">Zona {a.zone}</span>
              <span>·</span>
              <span className="text-[#ff8a1f] font-semibold">{a.meterId}</span>
              <span>·</span>
              <span>{a.detectedAt}</span>
            </div>
          </div>
          <ChevronDown size={14} className={`text-[#9098b1] transition-transform flex-shrink-0 mt-1 ${expanded ? "rotate-180" : ""}`} />
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[#f0f1f7] pt-3">
          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            {[
              { label: "ID Alerta", value: a.id, color: "#9098b1" },
              { label: "Medidor", value: a.meterId, color: "#ff8a1f" },
              { label: "Detectada", value: a.detectedAt, color: "#9098b1" },
              ...(a.resolvedAt ? [{ label: "Resuelta", value: a.resolvedAt, color: "#10b981" }] : []),
            ].map(item => (
              <div key={item.label} className="rounded-2xl bg-[#f8f9fc] p-3">
                <p className="text-[10px] text-[#9098b1] font-medium mb-0.5">{item.label}</p>
                <p className="font-semibold" style={{ color: item.color }}>{item.value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-2xl bg-[#f8f9fc] p-3 text-xs">
            <p className="text-[10px] text-[#9098b1] font-medium mb-1">Descripción del evento</p>
            <p className="text-[#1a1a2e] font-medium leading-relaxed">{a.description}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Alerts() {
  const [filterType, setFilterType] = useState<AlertType | "Todas">("Todas");
  const [filterPriority, setFilterPriority] = useState("Todas");
  const [filterStatus, setFilterStatus] = useState("Todas");
  const [filterZone, setFilterZone] = useState("Todas");

  const filtered = alerts.filter(a => {
    return (filterType === "Todas" || a.type === filterType)
      && (filterPriority === "Todas" || a.priority === filterPriority)
      && (filterStatus === "Todas" || a.status === filterStatus)
      && (filterZone === "Todas" || a.zone === filterZone);
  }).sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  const typeCounts = (Object.keys(typeConfig) as AlertType[]).map(t => ({
    type: t, count: alerts.filter(a => a.type === t).length,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a2e]" style={{ fontFamily: "Nunito, sans-serif" }}>Módulo de Alertas</h1>
        <p className="text-sm text-[#9098b1] mt-0.5">Gestión de eventos y anomalías detectadas por el sistema</p>
      </div>

      {/* Type cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {typeCounts.map(({ type, count }) => {
          const cfg = typeConfig[type];
          const Icon = cfg.icon;
          const active = filterType === type;
          return (
            <button key={type} onClick={() => setFilterType(t => t === type ? "Todas" : type)}
              className={`card p-4 text-left transition-all ${active ? "" : "hover:shadow-md"}`}
              style={active ? { boxShadow: `0 0 0 2px ${cfg.color}, 0 4px 20px ${cfg.color}30` } : undefined}>
              <div className="text-2xl mb-2">{cfg.emoji}</div>
              <div className="text-2xl font-bold text-[#1a1a2e]" style={{ fontFamily: "Nunito, sans-serif" }}>{count}</div>
              <div className="text-[10px] font-medium leading-tight mt-1" style={{ color: cfg.color }}>{type}</div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-[#9098b1] font-medium">
          <Filter size={13} />
          Filtrar por:
        </div>
        {[
          { label: "Prioridad", value: filterPriority, onChange: setFilterPriority, options: ["Todas", "Alta", "Media", "Baja"] },
          { label: "Estado", value: filterStatus, onChange: setFilterStatus, options: ["Todas", "Activa", "En revisión", "Resuelta"] },
          { label: "Zona", value: filterZone, onChange: setFilterZone, options: ["Todas", "Norte", "Centro", "Sur", "Industrial"] },
        ].map(f => (
          <select key={f.label} value={f.value} onChange={e => f.onChange(e.target.value)}
            className="bg-white border border-[#e5e7ef] rounded-full px-3 py-1.5 text-xs text-[#1a1a2e] font-medium focus:outline-none focus:border-[#ff8a1f]">
            {f.options.map(o => <option key={o}>{o}</option>)}
          </select>
        ))}
        <span className="ml-auto text-xs text-[#9098b1] font-medium">{filtered.length} alertas</span>
      </div>

      {/* Alert cards */}
      <div className="flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <p className="text-sm font-semibold text-[#1a1a2e]">Sin alertas</p>
            <p className="text-xs text-[#9098b1] mt-1">No hay alertas con los filtros seleccionados</p>
          </div>
        ) : filtered.map(a => <AlertCard key={a.id} a={a} />)}
      </div>
    </div>
  );
}
