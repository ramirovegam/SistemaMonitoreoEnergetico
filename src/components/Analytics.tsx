import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Legend,
} from "recharts";
import { monthlyData, dailyData, zoneData, missingReadings, alerts } from "../data/synthetic";

const fmt = (n: number) => n.toLocaleString("es-MX");

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-2xl px-3 py-2.5 text-xs shadow-lg border border-[#f0f1f7]">
      <p className="text-[#9098b1] mb-1.5 font-semibold">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">{p.name}: {fmt(Math.round(p.value))}</p>
      ))}
    </div>
  );
};

const ZONE_COLORS = ["#ff8a1f", "#6366f1", "#10b981", "#f59e0b"];

const hourPeak = [
  { hora: "06-09", pct: 68 }, { hora: "09-12", pct: 72 },
  { hora: "12-15", pct: 80 }, { hora: "15-18", pct: 76 },
  { hora: "18-21", pct: 95 }, { hora: "21-24", pct: 72 },
  { hora: "00-03", pct: 18 }, { hora: "03-06", pct: 12 },
];

const anomalyByType = [
  { name: "Pico demanda", value: alerts.filter(a => a.type === "Pico de demanda").length, color: "#f59e0b" },
  { name: "Pérd. comunicación", value: alerts.filter(a => a.type === "Pérdida de comunicación").length, color: "#9098b1" },
  { name: "Falla medición", value: alerts.filter(a => a.type === "Falla de medición").length, color: "#ef4444" },
  { name: "Fraude simulado", value: alerts.filter(a => a.type === "Fraude simulado").length, color: "#6366f1" },
  { name: "Mantenimiento", value: alerts.filter(a => a.type === "Mantenimiento").length, color: "#10b981" },
];

const anomalyHistory = [...alerts].sort((a, b) => a.detectedAt.localeCompare(b.detectedAt));

export default function Analytics() {
  const [view, setView] = useState<"dia" | "mes">("mes");

  const daily30 = dailyData.slice(-30).map(d => ({
    day: d.day.slice(5),
    total: d.total,
  }));

  const zoneCompare = zoneData.map(z => ({
    zona: z.name,
    total: z.totalConsumption,
  }));

  const pieData = zoneData.map((z, i) => ({
    name: z.name,
    value: z.totalConsumption,
    color: ZONE_COLORS[i],
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]" style={{ fontFamily: "Nunito, sans-serif" }}>Análisis y Reportes</h1>
          <p className="text-sm text-[#9098b1] mt-0.5">Inteligencia de negocio sobre datos Hyper-Synthetic</p>
        </div>
        <div className="flex rounded-full bg-[#f2f3f7] p-1">
          {(["dia", "mes"] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-5 py-2 rounded-full text-xs font-semibold transition-all ${
                view === v ? "bg-white text-[#1a1a2e] shadow-sm" : "text-[#9098b1]"
              }`}>
              {v === "dia" ? "Por Día" : "Por Mes"}
            </button>
          ))}
        </div>
      </div>

      {/* Main chart */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-[#1a1a2e] mb-1">
          {view === "dia" ? "Consumo Diario — Últimos 30 días" : "Consumo Mensual — Últimas 7 meses"}
        </h3>
        <p className="text-[11px] text-[#9098b1] mb-4">Total del sistema (kWh)</p>
        <ResponsiveContainer width="100%" height={230}>
          {view === "dia" ? (
            <AreaChart data={daily30}>
              <defs>
                <linearGradient id="ag1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff8a1f" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ff8a1f" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f1f7" />
              <XAxis dataKey="day" tick={{ fill: "#9098b1", fontSize: 9 }} interval={4} />
              <YAxis tick={{ fill: "#9098b1", fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="total" stroke="#ff8a1f" fill="url(#ag1)" strokeWidth={2.5} name="Total kWh" />
            </AreaChart>
          ) : (
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f1f7" />
              <XAxis dataKey="month" tick={{ fill: "#9098b1", fontSize: 10 }} />
              <YAxis tick={{ fill: "#9098b1", fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="Norte" fill="#ff8a1f" radius={[6, 6, 0, 0]} name="Norte" />
              <Bar dataKey="Centro" fill="#6366f1" radius={[6, 6, 0, 0]} name="Centro" />
              <Bar dataKey="Sur" fill="#10b981" radius={[6, 6, 0, 0]} name="Sur" />
              <Bar dataKey="Industrial" fill="#f59e0b" radius={[6, 6, 0, 0]} name="Industrial" />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Zone compare + pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-[#1a1a2e] mb-4">Comparación entre Zonas</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={zoneCompare} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f1f7" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#9098b1", fontSize: 9 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <YAxis dataKey="zona" type="category" tick={{ fill: "#9098b1", fontSize: 11 }} width={65} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="total" name="kWh" radius={[0, 8, 8, 0]}>
                {zoneCompare.map((_, i) => <Cell key={i} fill={ZONE_COLORS[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-[#1a1a2e] mb-4">Distribución del Consumo</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "white", border: "1px solid #f0f1f7", borderRadius: 12, fontSize: 12 }}
                formatter={(v) => [`${fmt(Number(v))} kWh`, ""]} />
              <Legend formatter={(v) => <span style={{ color: "#9098b1", fontSize: 11, fontWeight: 600 }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Peak hours */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-[#1a1a2e] mb-2">Horas de Mayor Demanda</h3>
        <p className="text-[11px] text-[#9098b1] mb-5">Porcentaje de carga máxima del sistema</p>
        <div className="flex items-end gap-3 justify-between">
          {hourPeak.map(h => (
            <div key={h.hora} className="flex-1 flex flex-col items-center gap-2">
              <span className={`text-xs font-bold ${h.pct >= 90 ? "text-[#ef4444]" : h.pct >= 70 ? "text-[#f59e0b]" : "text-[#9098b1]"}`}>
                {h.pct}%
              </span>
              <div className="w-full rounded-xl overflow-hidden bg-[#f2f3f7]" style={{ height: 80 }}>
                <div className="w-full rounded-xl transition-all" style={{
                  height: `${h.pct}%`,
                  marginTop: `${100 - h.pct}%`,
                  background: h.pct >= 90 ? "linear-gradient(180deg,#ef4444,#f87171)" :
                    h.pct >= 70 ? "linear-gradient(180deg,#ff8a1f,#ffb347)" :
                    "linear-gradient(180deg,#d1d5db,#e5e7ef)",
                }} />
              </div>
              <span className="text-[9px] text-[#9098b1] font-semibold text-center leading-tight">{h.hora}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-[#9098b1] mt-4 text-center">⚡ El rango 18:00–21:00 concentra la demanda máxima del sistema</p>
      </div>

      {/* Missing readings */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-[#1a1a2e] mb-4">Porcentaje de Lecturas Faltantes por Zona</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {missingReadings.map(mr => (
            <div key={mr.zone} className="rounded-2xl bg-[#f8f9fc] p-4">
              <p className="text-[11px] text-[#9098b1] font-semibold mb-2">Zona {mr.zone}</p>
              <div className="text-2xl font-bold mb-2" style={{
                fontFamily: "Nunito, sans-serif",
                color: mr.pct > 4 ? "#ef4444" : mr.pct > 2.5 ? "#f59e0b" : "#10b981"
              }}>{mr.pct}%</div>
              <div className="progress-bar">
                <div className="progress-fill" style={{
                  width: `${Math.min(mr.pct * 10, 100)}%`,
                  background: mr.pct > 4 ? "#ef4444" : mr.pct > 2.5 ? "#f59e0b" : "#10b981",
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Anomaly types + history */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-[#1a1a2e] mb-4">Historial de Anomalías</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
          {anomalyByType.map(a => (
            <div key={a.name} className="rounded-2xl p-3 text-center" style={{ background: `${a.color}10` }}>
              <div className="text-2xl font-bold" style={{ color: a.color, fontFamily: "Nunito, sans-serif" }}>{a.value}</div>
              <div className="text-[10px] font-semibold mt-1" style={{ color: a.color }}>{a.name}</div>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto rounded-2xl bg-[#f8f9fc]">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#f0f1f7]">
                {["Fecha", "Tipo", "Zona", "Prioridad"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[#9098b1] font-semibold uppercase tracking-wider text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {anomalyHistory.slice(0, 10).map((a, i) => (
                <tr key={i} className="border-b border-[#f0f1f7] hover:bg-[#f2f3f7] transition-colors">
                  <td className="px-4 py-2.5 text-[#9098b1] font-medium">{a.detectedAt}</td>
                  <td className="px-4 py-2.5 font-semibold text-[#1a1a2e]">{a.type}</td>
                  <td className="px-4 py-2.5 text-[#9098b1]">{a.zone}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                      a.priority === "Alta" ? "badge-red" :
                      a.priority === "Media" ? "badge-yellow" : "badge-gray"
                    }`}>{a.priority}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
