import { useState } from "react";
import { Users, Bell, Sliders, Database, Plus, Edit2, Trash2, Save, RefreshCw, User, Eye } from "lucide-react";

type Tab = "usuarios" | "alertas" | "simulacion" | "historial";

const mockUsers = [
  { id: "USR-001", name: "Ana García López", email: "ana.garcia@simet.mx", role: "Admin", status: "Activo", lastLogin: "2026-09-09" },
  { id: "USR-002", name: "Carlos Mendoza R.", email: "c.mendoza@simet.mx", role: "Analista", status: "Activo", lastLogin: "2026-09-08" },
  { id: "USR-003", name: "Laura Pérez T.", email: "l.perez@simet.mx", role: "Operador", status: "Activo", lastLogin: "2026-09-07" },
  { id: "USR-004", name: "Roberto Sánchez M.", email: "r.sanchez@simet.mx", role: "Analista", status: "Inactivo", lastLogin: "2026-08-30" },
  { id: "USR-005", name: "Patricia Flores V.", email: "p.flores@simet.mx", role: "Operador", status: "Activo", lastLogin: "2026-09-09" },
];

const roleStyle: Record<string, string> = {
  Admin: "badge-red",
  Analista: "badge-blue",
  Operador: "badge-green",
};

const historialGen = [
  { id: "GEN-007", date: "2026-09-09 08:00", records: 4800, zones: "Todas", status: "Completado", duration: "2m 14s" },
  { id: "GEN-006", date: "2026-09-08 08:00", records: 4800, zones: "Todas", status: "Completado", duration: "2m 08s" },
  { id: "GEN-005", date: "2026-09-07 08:00", records: 4800, zones: "Todas", status: "Completado", duration: "2m 31s" },
  { id: "GEN-004", date: "2026-09-06 08:00", records: 2400, zones: "Norte, Centro", status: "Completado", duration: "1m 12s" },
  { id: "GEN-003", date: "2026-09-05 14:30", records: 4800, zones: "Todas", status: "Error parcial", duration: "3m 02s" },
  { id: "GEN-002", date: "2026-09-04 08:00", records: 4800, zones: "Todas", status: "Completado", duration: "2m 19s" },
  { id: "GEN-001", date: "2026-09-03 08:00", records: 4800, zones: "Todas", status: "Completado", duration: "2m 05s" },
];

function UsersTab() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#9098b1] font-medium">{mockUsers.length} usuarios en el sistema</p>
        <button className="flex items-center gap-2 px-4 py-2 rounded-full gradient-orange text-white text-xs font-bold hover:opacity-90 transition-opacity shadow-sm">
          <Plus size={12} /> Nuevo Usuario
        </button>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#f0f1f7] bg-[#f8f9fc]">
              {["Usuario", "Correo", "Rol", "Estado", "Último acceso", ""].map(h => (
                <th key={h} className="text-left px-4 py-3.5 text-[#9098b1] font-semibold uppercase tracking-wider text-[10px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mockUsers.map(u => (
              <tr key={u.id} className="border-b border-[#f0f1f7] hover:bg-[#fff4ea] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full gradient-orange flex items-center justify-center text-[10px] font-bold text-white">
                      {u.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                    </div>
                    <div>
                      <p className="font-semibold text-[#1a1a2e]">{u.name}</p>
                      <p className="text-[10px] text-[#9098b1]">{u.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-[#9098b1]">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${roleStyle[u.role]}`}>{u.role}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`flex items-center gap-1.5 font-semibold text-[11px] ${u.status === "Activo" ? "text-[#10b981]" : "text-[#9098b1]"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${u.status === "Activo" ? "bg-[#10b981]" : "bg-[#9098b1]"}`} />
                    {u.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#9098b1] font-medium">{u.lastLogin}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button className="p-1.5 rounded-lg hover:bg-[#fff4ea] transition-colors"><Edit2 size={12} className="text-[#9098b1] hover:text-[#ff8a1f]" /></button>
                    <button className="p-1.5 rounded-lg hover:bg-[#eef2ff] transition-colors"><Eye size={12} className="text-[#9098b1] hover:text-[#6366f1]" /></button>
                    <button className="p-1.5 rounded-lg hover:bg-[#fef2f2] transition-colors"><Trash2 size={12} className="text-[#9098b1] hover:text-[#ef4444]" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AlertsConfigTab() {
  const [thresholds, setThresholds] = useState({
    demandPeak: 200,
    commLoss: 4,
    measureError: 20,
    missingPct: 5,
  });

  return (
    <div className="flex flex-col gap-4">
      {[
        { key: "demandPeak", label: "Umbral Pico de Demanda", desc: "Porcentaje sobre el promedio histórico", unit: "%", min: 10, max: 500, color: "#f59e0b" },
        { key: "commLoss", label: "Pérdida de Comunicación", desc: "Horas sin respuesta del medidor", unit: "h", min: 1, max: 24, color: "#9098b1" },
        { key: "measureError", label: "Error de Medición", desc: "Porcentaje de diferencia entre lecturas", unit: "%", min: 5, max: 50, color: "#ef4444" },
        { key: "missingPct", label: "Lecturas Faltantes", desc: "Porcentaje del total de lecturas", unit: "%", min: 1, max: 20, color: "#6366f1" },
      ].map(f => (
        <div key={f.key} className="card p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-[#1a1a2e]">{f.label}</p>
              <p className="text-[11px] text-[#9098b1] mt-0.5">{f.desc}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <input type="number" value={thresholds[f.key as keyof typeof thresholds]}
                onChange={e => setThresholds(t => ({ ...t, [f.key]: +e.target.value }))}
                min={f.min} max={f.max}
                className="w-20 bg-[#f8f9fc] border border-[#e5e7ef] rounded-xl px-3 py-2 text-sm font-bold text-center focus:outline-none focus:border-[#ff8a1f]"
                style={{ color: f.color }}
              />
              <span className="text-xs text-[#9098b1] font-semibold">{f.unit}</span>
            </div>
          </div>
          <input type="range" min={f.min} max={f.max}
            value={thresholds[f.key as keyof typeof thresholds]}
            onChange={e => setThresholds(t => ({ ...t, [f.key]: +e.target.value }))}
            className="w-full" style={{ accentColor: f.color }}
          />
          <div className="flex justify-between text-[10px] text-[#9098b1] font-medium mt-1">
            <span>{f.min}{f.unit}</span><span>{f.max}{f.unit}</span>
          </div>
        </div>
      ))}
      <button className="flex items-center gap-2 px-5 py-2.5 rounded-full gradient-orange text-white text-sm font-bold hover:opacity-90 transition-opacity w-fit shadow-md">
        <Save size={14} /> Guardar Configuración
      </button>
    </div>
  );
}

function SimulationTab() {
  const [params, setParams] = useState({
    households: 80, days: 30, noiseLevel: 12,
    anomalyRate: 3.5, fraudRate: 0.8, missingRate: 3.2,
  });
  const [running, setRunning] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="card p-5" style={{ background: "linear-gradient(135deg,#fff4ea,#ffecd6)" }}>
        <h3 className="text-sm font-bold text-[#1a1a2e] mb-1">Generador de Datos HSD</h3>
        <p className="text-[11px] text-[#9098b1] mb-4">Hyper-Synthetic Data — configura los parámetros de la simulación</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Lecturas totales", value: (params.households * params.days * 24).toLocaleString(), color: "#ff8a1f" },
            { label: "Anomalías esperadas", value: Math.round(params.households * params.days * 24 * params.anomalyRate / 100).toLocaleString(), color: "#f59e0b" },
            { label: "Hogares con fraude", value: Math.round(params.households * params.fraudRate / 100), color: "#ef4444" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-3 text-center shadow-sm">
              <p className="text-xl font-bold" style={{ color: s.color, fontFamily: "Nunito, sans-serif" }}>{s.value}</p>
              <p className="text-[10px] text-[#9098b1] font-medium mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { key: "households", label: "Número de Hogares", min: 10, max: 500, step: 10, unit: "hogares" },
          { key: "days", label: "Días de Historial", min: 7, max: 365, step: 1, unit: "días" },
          { key: "noiseLevel", label: "Nivel de Ruido Gaussiano", min: 0, max: 30, step: 1, unit: "% σ" },
          { key: "anomalyRate", label: "Tasa de Anomalías", min: 0, max: 20, step: 0.5, unit: "%" },
          { key: "fraudRate", label: "Tasa de Fraude", min: 0, max: 5, step: 0.1, unit: "%" },
          { key: "missingRate", label: "Lecturas Faltantes", min: 0, max: 15, step: 0.5, unit: "%" },
        ].map(f => (
          <div key={f.key} className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-[#1a1a2e]">{f.label}</p>
              <span className="text-sm font-bold text-[#ff8a1f]" style={{ fontFamily: "Nunito, sans-serif" }}>
                {params[f.key as keyof typeof params]} {f.unit}
              </span>
            </div>
            <input type="range" min={f.min} max={f.max} step={f.step}
              value={params[f.key as keyof typeof params]}
              onChange={e => setParams(p => ({ ...p, [f.key]: +e.target.value }))}
              className="w-full" style={{ accentColor: "#ff8a1f" }}
            />
            <div className="flex justify-between text-[10px] text-[#9098b1] mt-1">
              <span>{f.min}</span><span>{f.max}</span>
            </div>
          </div>
        ))}
      </div>

      <button onClick={() => { setRunning(true); setTimeout(() => setRunning(false), 2500); }}
        disabled={running}
        className="flex items-center gap-2 px-6 py-3 rounded-full gradient-orange text-white text-sm font-bold hover:opacity-90 transition-opacity w-fit shadow-lg disabled:opacity-60"
        style={{ boxShadow: "0 6px 20px rgba(255,138,31,0.4)" }}>
        <RefreshCw size={15} className={running ? "animate-spin" : ""} />
        {running ? "Generando datos HSD…" : "Ejecutar Simulación HSD"}
      </button>
    </div>
  );
}

function HistorialTab() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[#9098b1] font-medium">{historialGen.length} ejecuciones registradas</p>
      <div className="card overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#f0f1f7] bg-[#f8f9fc]">
              {["ID", "Fecha y Hora", "Registros", "Zonas", "Duración", "Estado"].map(h => (
                <th key={h} className="text-left px-4 py-3.5 text-[#9098b1] font-semibold uppercase tracking-wider text-[10px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {historialGen.map(g => (
              <tr key={g.id} className="border-b border-[#f0f1f7] hover:bg-[#fff4ea] transition-colors">
                <td className="px-4 py-3 font-bold text-[#ff8a1f]">{g.id}</td>
                <td className="px-4 py-3 text-[#9098b1] font-medium">{g.date}</td>
                <td className="px-4 py-3 font-bold text-[#1a1a2e]">{g.records.toLocaleString()}</td>
                <td className="px-4 py-3 text-[#9098b1]">{g.zones}</td>
                <td className="px-4 py-3 text-[#9098b1] font-medium">{g.duration}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                    g.status === "Completado" ? "badge-green" : "badge-yellow"
                  }`}>{g.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const tabs: { key: Tab; label: string; icon: React.ComponentType<any>; emoji: string }[] = [
  { key: "usuarios", label: "Usuarios", icon: Users, emoji: "👥" },
  { key: "alertas", label: "Config. Alertas", icon: Bell, emoji: "🔔" },
  { key: "simulacion", label: "Simulación HSD", icon: Sliders, emoji: "⚙️" },
  { key: "historial", label: "Historial", icon: Database, emoji: "📋" },
];

export default function Admin() {
  const [activeTab, setActiveTab] = useState<Tab>("usuarios");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a2e]" style={{ fontFamily: "Nunito, sans-serif" }}>Panel de Administración</h1>
        <p className="text-sm text-[#9098b1] mt-0.5">Configuración y gestión completa del sistema SIMET</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold transition-all ${
              activeTab === t.key
                ? "gradient-orange text-white shadow-md"
                : "bg-white border border-[#e5e7ef] text-[#9098b1] hover:text-[#1a1a2e] hover:border-[#ff8a1f]"
            }`}>
            <span>{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "usuarios" && <UsersTab />}
      {activeTab === "alertas" && <AlertsConfigTab />}
      {activeTab === "simulacion" && <SimulationTab />}
      {activeTab === "historial" && <HistorialTab />}
    </div>
  );
}
