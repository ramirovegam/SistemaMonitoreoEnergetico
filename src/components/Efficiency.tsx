import { useState } from "react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";
import { Leaf, Target, TrendingDown, ClipboardCheck, Award, Plus, ChevronDown, ChevronRight } from "lucide-react";

type EfTab = "proyectos" | "ahorros" | "comparacion" | "acciones" | "metas";

const proyectos = [
  { id: "PRY-001", nombre: "Iluminación LED Zona Norte", meta: 15, alcanzado: 12.4, inicio: "2026-01-15", fin: "2026-06-30", estado: "En curso", inversion: 145000, ahorro_anual: 48000 },
  { id: "PRY-002", nombre: "Variadores de Frecuencia Industrial", meta: 22, alcanzado: 22, inicio: "2025-10-01", fin: "2026-03-31", estado: "Completado", inversion: 380000, ahorro_anual: 112000 },
  { id: "PRY-003", nombre: "Sistema HVAC Eficiente", meta: 18, alcanzado: 8.2, inicio: "2026-04-01", fin: "2026-12-31", estado: "En curso", inversion: 620000, ahorro_anual: 95000 },
  { id: "PRY-004", nombre: "Compensación de Reactivos", meta: 8, alcanzado: 8, inicio: "2025-08-01", fin: "2025-12-31", estado: "Completado", inversion: 85000, ahorro_anual: 32000 },
  { id: "PRY-005", nombre: "Gestión Inteligente de Carga", meta: 12, alcanzado: 2.1, inicio: "2026-07-01", fin: "2027-01-31", estado: "Planeado", inversion: 290000, ahorro_anual: 78000 },
];

const ahorrosData = [
  { mes: "Ene", real: 18400, meta: 20000 },
  { mes: "Feb", real: 21200, meta: 20000 },
  { mes: "Mar", real: 19800, meta: 21000 },
  { mes: "Abr", real: 22100, meta: 21000 },
  { mes: "May", real: 24300, meta: 22000 },
  { mes: "Jun", real: 25800, meta: 22000 },
  { mes: "Jul", real: 26400, meta: 23000 },
  { mes: "Ago", real: 24900, meta: 23000 },
  { mes: "Sep", real: 22600, meta: 24000 },
];

const comparacionData = [
  { mes: "Oct 25", antes: 312000, despues: 290000 },
  { mes: "Nov 25", antes: 328000, despues: 301000 },
  { mes: "Dic 25", antes: 298000, despues: 271000 },
  { mes: "Ene 26", antes: 315000, despues: 284000 },
  { mes: "Feb 26", antes: 309000, despues: 275000 },
  { mes: "Mar 26", antes: 322000, despues: 285000 },
  { mes: "Abr 26", antes: 334000, despues: 292000 },
  { mes: "May 26", antes: 341000, despues: 296000 },
  { mes: "Jun 26", antes: 356000, despues: 306000 },
];

const acciones = [
  { id: "ACC-001", tipo: "Correctiva", desc: "Reparación de aislamiento en transformador TRF-003", zona: "Industrial", fecha: "2026-09-02", estado: "Completada", impacto: 2.1 },
  { id: "ACC-002", tipo: "Preventiva", desc: "Calibración de medidores zona norte", zona: "Norte", fecha: "2026-09-05", estado: "Completada", impacto: 0.8 },
  { id: "ACC-003", tipo: "Mejora", desc: "Instalación de variador VFD-12 en bomba principal", zona: "Industrial", fecha: "2026-09-08", estado: "En proceso", impacto: 4.2 },
  { id: "ACC-004", tipo: "Correctiva", desc: "Corrección factor de potencia sector sur", zona: "Sur", fecha: "2026-09-10", estado: "Pendiente", impacto: 1.5 },
  { id: "ACC-005", tipo: "Mejora", desc: "Optimización horario de carga en área de producción", zona: "Industrial", fecha: "2026-09-12", estado: "Pendiente", impacto: 3.8 },
];

const metas = [
  { nombre: "Reducción Consumo Anual", meta: 15, actual: 11.2, unidad: "%", color: "#ff8a1f" },
  { nombre: "Ahorro Económico Anual", meta: 500000, actual: 365000, unidad: "MXN", color: "#6366f1" },
  { nombre: "Proyectos Completados", meta: 8, actual: 4, unidad: "proyectos", color: "#10b981" },
  { nombre: "Factor de Potencia Promedio", meta: 0.95, actual: 0.91, unidad: "FP", color: "#f59e0b" },
  { nombre: "Lecturas Exitosas", meta: 98, actual: 95.8, unidad: "%", color: "#3b82f6" },
  { nombre: "Medidores Operativos", meta: 95, actual: 87.5, unidad: "%", color: "#10b981" },
];

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-2xl px-3 py-2 shadow-lg border border-[#f0f1f7] text-xs">
      <p className="font-bold text-[#9098b1] mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">{p.name}: {Number(p.value).toLocaleString("es-MX")}</p>
      ))}
    </div>
  );
};

const accionColors: Record<string, string> = {
  Correctiva: "#ef4444",
  Preventiva: "#f59e0b",
  Mejora: "#10b981",
};
const accionEstado: Record<string, string> = {
  Completada: "badge-green",
  "En proceso": "badge-yellow",
  Pendiente: "badge-gray",
};

const tabs: { key: EfTab; label: string; emoji: string }[] = [
  { key: "proyectos", label: "Proyectos de Ahorro", emoji: "🚀" },
  { key: "ahorros", label: "Ahorros Obtenidos", emoji: "💚" },
  { key: "comparacion", label: "Antes / Después", emoji: "📊" },
  { key: "acciones", label: "Acciones Correctivas", emoji: "🔧" },
  { key: "metas", label: "Metas Energéticas", emoji: "🎯" },
];

export default function Efficiency() {
  const [activeTab, setActiveTab] = useState<EfTab>("proyectos");

  const totalAhorro = ahorrosData.reduce((s, d) => s + d.real, 0);
  const totalMeta = ahorrosData.reduce((s, d) => s + d.meta, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]" style={{ fontFamily: "Nunito, sans-serif" }}>
            Módulo de Eficiencia Energética
          </h1>
          <p className="text-sm text-[#9098b1] mt-0.5">Seguimiento de proyectos, ahorros y metas de eficiencia</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-full gradient-orange text-white text-xs font-bold hover:opacity-90 shadow-md">
          <Plus size={12} /> Nuevo Proyecto
        </button>
      </div>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Ahorro Total YTD", value: `$${(totalAhorro/1000).toFixed(0)}k MXN`, icon: "💰", color: "#10b981", bg: "#ecfdf5" },
          { label: "Proyectos Activos", value: "3 en curso", icon: "🚀", color: "#ff8a1f", bg: "#fff4ea" },
          { label: "Reducción Consumo", value: "11.2%", icon: "📉", color: "#6366f1", bg: "#eef2ff" },
          { label: "Acciones Pendientes", value: "2", icon: "📋", color: "#f59e0b", bg: "#fffbeb" },
        ].map(s => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <div className="text-2xl">{s.icon}</div>
            <div>
              <p className="text-sm font-bold" style={{ color: s.color, fontFamily: "Nunito, sans-serif" }}>{s.value}</p>
              <p className="text-[11px] text-[#9098b1] font-medium">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
              activeTab === t.key ? "gradient-orange text-white shadow-md" : "bg-white border border-[#e5e7ef] text-[#9098b1] hover:border-[#ff8a1f]"
            }`}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {activeTab === "proyectos" && (
        <div className="flex flex-col gap-4">
          {proyectos.map(p => {
            const pct = Math.min(100, Math.round((p.alcanzado / p.meta) * 100));
            const payback = (p.inversion / p.ahorro_anual).toFixed(1);
            return (
              <div key={p.id} className="card p-5">
                <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-[#9098b1] font-mono">{p.id}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        p.estado === "Completado" ? "badge-green" :
                        p.estado === "En curso" ? "badge-orange" : "badge-gray"
                      }`}>{p.estado}</span>
                    </div>
                    <h3 className="text-sm font-bold text-[#1a1a2e]">{p.nombre}</h3>
                    <p className="text-[11px] text-[#9098b1] mt-0.5">{p.inicio} → {p.fin}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black" style={{ color: pct >= 100 ? "#10b981" : "#ff8a1f", fontFamily: "Nunito, sans-serif" }}>
                      {pct}%
                    </p>
                    <p className="text-[11px] text-[#9098b1]">{p.alcanzado}% / {p.meta}% meta</p>
                  </div>
                </div>
                <div className="progress-bar mb-4">
                  <div className="progress-fill" style={{
                    width: `${pct}%`,
                    background: pct >= 100 ? "#10b981" : "linear-gradient(90deg,#ff8a1f,#ffb347)",
                  }} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-[#f8f9fc] p-3 text-center">
                    <p className="text-xs font-bold text-[#6366f1]">${p.inversion.toLocaleString("es-MX")}</p>
                    <p className="text-[10px] text-[#9098b1]">Inversión</p>
                  </div>
                  <div className="rounded-xl bg-[#f8f9fc] p-3 text-center">
                    <p className="text-xs font-bold text-[#10b981]">${p.ahorro_anual.toLocaleString("es-MX")}/año</p>
                    <p className="text-[10px] text-[#9098b1]">Ahorro Anual</p>
                  </div>
                  <div className="rounded-xl bg-[#f8f9fc] p-3 text-center">
                    <p className="text-xs font-bold text-[#ff8a1f]">{payback} años</p>
                    <p className="text-[10px] text-[#9098b1]">Retorno de inversión</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "ahorros" && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-5 text-center">
              <p className="text-3xl font-black text-[#10b981]" style={{ fontFamily: "Nunito, sans-serif" }}>
                ${(totalAhorro/1000).toFixed(0)}k
              </p>
              <p className="text-xs text-[#9098b1] font-medium mt-1">Ahorro Total YTD (MXN)</p>
            </div>
            <div className="card p-5 text-center">
              <p className="text-3xl font-black text-[#ff8a1f]" style={{ fontFamily: "Nunito, sans-serif" }}>
                ${(totalMeta/1000).toFixed(0)}k
              </p>
              <p className="text-xs text-[#9098b1] font-medium mt-1">Meta Total YTD (MXN)</p>
            </div>
            <div className="card p-5 text-center">
              <p className="text-3xl font-black" style={{ fontFamily: "Nunito, sans-serif", color: totalAhorro >= totalMeta ? "#10b981" : "#f59e0b" }}>
                {Math.round((totalAhorro/totalMeta)*100)}%
              </p>
              <p className="text-xs text-[#9098b1] font-medium mt-1">Cumplimiento de meta</p>
            </div>
          </div>
          <div className="card p-5">
            <h3 className="text-sm font-bold text-[#1a1a2e] mb-4">Ahorro Mensual Real vs Meta</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={ahorrosData}>
                <defs>
                  <linearGradient id="ag2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f1f7" />
                <XAxis dataKey="mes" tick={{ fill: "#9098b1", fontSize: 10 }} />
                <YAxis tick={{ fill: "#9098b1", fontSize: 10 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="real" stroke="#10b981" fill="url(#ag2)" strokeWidth={2.5} name="Ahorro Real $" />
                <Line type="monotone" dataKey="meta" stroke="#ff8a1f" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Meta $" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === "comparacion" && (
        <div className="flex flex-col gap-5">
          <div className="card p-5">
            <h3 className="text-sm font-bold text-[#1a1a2e] mb-1">Consumo Antes vs Después</h3>
            <p className="text-[11px] text-[#9098b1] mb-4">Desde la implementación de proyectos de eficiencia (kWh)</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={comparacionData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f1f7" />
                <XAxis dataKey="mes" tick={{ fill: "#9098b1", fontSize: 9 }} />
                <YAxis tick={{ fill: "#9098b1", fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="antes" fill="#fca5a5" radius={[6,6,0,0]} name="Antes" />
                <Bar dataKey="despues" fill="#10b981" radius={[6,6,0,0]} name="Después" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-8 flex-wrap">
              <div>
                <p className="text-[11px] text-[#9098b1] font-medium">Consumo Promedio Antes</p>
                <p className="text-2xl font-black text-[#ef4444]" style={{ fontFamily: "Nunito, sans-serif" }}>324k kWh/mes</p>
              </div>
              <div className="text-3xl">→</div>
              <div>
                <p className="text-[11px] text-[#9098b1] font-medium">Consumo Promedio Después</p>
                <p className="text-2xl font-black text-[#10b981]" style={{ fontFamily: "Nunito, sans-serif" }}>289k kWh/mes</p>
              </div>
              <div className="ml-auto text-center">
                <p className="text-[11px] text-[#9098b1] font-medium">Reducción</p>
                <p className="text-3xl font-black text-[#ff8a1f]" style={{ fontFamily: "Nunito, sans-serif" }}>−10.8%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "acciones" && (
        <div className="flex flex-col gap-3">
          {acciones.map(a => (
            <div key={a.id} className="card p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                  style={{ background: accionColors[a.tipo] }}>
                  {a.tipo[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: accionColors[a.tipo] }}>
                      {a.tipo}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${accionEstado[a.estado]}`}>{a.estado}</span>
                    <span className="text-[10px] text-[#9098b1] font-mono ml-auto">{a.id}</span>
                  </div>
                  <p className="text-xs font-semibold text-[#1a1a2e] mb-1">{a.desc}</p>
                  <div className="flex gap-4 text-[11px] text-[#9098b1]">
                    <span>📍 Zona {a.zona}</span>
                    <span>📅 {a.fecha}</span>
                    <span className="text-[#10b981] font-semibold">↓ {a.impacto}% consumo</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "metas" && (
        <div className="flex flex-col gap-4">
          {metas.map(m => {
            const pct = Math.min(100, Math.round((m.actual / m.meta) * 100));
            const onTrack = pct >= 85;
            return (
              <div key={m.nombre} className="card p-5">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div>
                    <p className="text-sm font-bold text-[#1a1a2e]">{m.nombre}</p>
                    <p className="text-[11px] text-[#9098b1] mt-0.5">
                      Actual: <strong style={{ color: m.color }}>{typeof m.actual === "number" && m.actual > 100 ? m.actual.toLocaleString("es-MX") : m.actual} {m.unidad}</strong>
                      {" "}/ Meta: <strong className="text-[#1a1a2e]">{typeof m.meta === "number" && m.meta > 100 ? m.meta.toLocaleString("es-MX") : m.meta} {m.unidad}</strong>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${onTrack ? "badge-green" : "badge-yellow"}`}>
                      {onTrack ? "✓ En meta" : "⚠ Rezago"}
                    </span>
                    <span className="text-xl font-black" style={{ color: m.color, fontFamily: "Nunito, sans-serif" }}>{pct}%</span>
                  </div>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${pct}%`, background: m.color }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
