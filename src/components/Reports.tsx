import { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { FileText, Calendar, Download, Mail, Clock, CheckCircle, Settings } from "lucide-react";

type ReportTab = "diario" | "semanal" | "mensual" | "instalacion" | "exportar" | "programar";

const dailyReport = Array.from({ length: 24 }, (_, i) => ({
  hora: `${String(i).padStart(2,"0")}:00`,
  consumo: Math.round(180 + Math.sin(i * 0.5) * 60 + Math.random() * 20),
  costo: Math.round(250 + Math.sin(i * 0.5) * 80),
}));

const weeklyReport = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map((d, i) => ({
  dia: d,
  norte: Math.round(8500 + Math.sin(i) * 1000),
  centro: Math.round(9200 + Math.cos(i) * 800),
  sur: Math.round(7800 + Math.sin(i*1.2) * 900),
  industrial: Math.round(42000 + Math.cos(i*0.8) * 3000),
}));

const monthlyReport = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep"].map((m, i) => ({
  mes: m,
  consumo: Math.round(290000 + Math.sin(i * 0.5) * 15000),
  costo: Math.round(380000 + Math.sin(i * 0.5) * 20000),
  anomalias: Math.round(8 + Math.sin(i) * 4),
}));

const instReport = [
  { nombre: "Planta Norte", consumo: 38450, costo: 48200, eficiencia: 92, estado: "Normal" },
  { nombre: "Centro Comercial", consumo: 42300, costo: 55800, eficiencia: 88, estado: "Alerta" },
  { nombre: "Sucursal Sur", consumo: 34700, costo: 41300, eficiencia: 95, estado: "Normal" },
  { nombre: "Zona Industrial", consumo: 187600, costo: 244800, eficiencia: 78, estado: "Crítico" },
];

const scheduledReports = [
  { id: "RPT-001", nombre: "Reporte Diario Operativo", frecuencia: "Diario 08:00", destinatarios: "ops@simet.mx", formato: "PDF", activo: true },
  { id: "RPT-002", nombre: "Reporte Semanal Ejecutivo", frecuencia: "Lunes 07:00", destinatarios: "gerencia@simet.mx", formato: "Excel", activo: true },
  { id: "RPT-003", nombre: "Reporte Mensual CFE", frecuencia: "Día 1 del mes 06:00", destinatarios: "cfe@simet.mx", formato: "PDF", activo: true },
  { id: "RPT-004", nombre: "Alertas en Tiempo Real", frecuencia: "Inmediato", destinatarios: "alertas@simet.mx", formato: "Email", activo: false },
];

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface rounded-2xl px-3 py-2 shadow-lg border border-[var(--color-border)] text-xs">
      <p className="font-bold text-[var(--color-muted)] mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">{p.name}: {Number(p.value).toLocaleString("es-MX")}</p>
      ))}
    </div>
  );
};

function ExportButton({ format, icon }: { format: string; icon: string }) {
  return (
    <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-surface hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] text-[var(--color-muted)] text-xs font-semibold transition-all">
      <span className="text-base">{icon}</span>
      Exportar {format}
    </button>
  );
}

const tabs: { key: ReportTab; label: string; emoji: string }[] = [
  { key: "diario", label: "Reporte Diario", emoji: "📅" },
  { key: "semanal", label: "Reporte Semanal", emoji: "📆" },
  { key: "mensual", label: "Reporte Mensual", emoji: "🗓️" },
  { key: "instalacion", label: "Por Instalación", emoji: "🏭" },
  { key: "exportar", label: "Exportar", emoji: "📤" },
  { key: "programar", label: "Programar Reportes", emoji: "⏰" },
];

export default function Reports() {
  const [activeTab, setActiveTab] = useState<ReportTab>("diario");
  const [dateRange, setDateRange] = useState({ from: "2026-09-09", to: "2026-09-09" });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-fg)]" style={{ fontFamily: "Nunito, sans-serif" }}>Reportes Operativos</h1>
          <p className="text-sm text-[var(--color-muted)] mt-0.5">Generación, exportación y programación de reportes energéticos</p>
        </div>
        <div className="flex gap-2">
          <ExportButton format="Excel" icon="📊" />
          <ExportButton format="PDF" icon="📄" />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
              activeTab === t.key ? "gradient-accent text-[var(--accent-contrast)] shadow-md" : "bg-surface border border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-accent)]"
            }`}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {activeTab === "diario" && (
        <div className="flex flex-col gap-5">
          {/* Header stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Consumo Total", value: "4,320 kWh", color: "var(--color-accent)", bg: "var(--color-accent-soft)" },
              { label: "Costo del Día", value: "$6,480", color: "var(--chart-2)", bg: "var(--color-info-soft)" },
              { label: "Lecturas Recibidas", value: "76 / 80", color: "var(--color-success)", bg: "var(--color-success-soft)" },
              { label: "Anomalías", value: "3", color: "var(--color-danger)", bg: "var(--color-danger-soft)" },
            ].map(s => (
              <div key={s.label} className="card p-4 text-center">
                <p className="text-xl font-bold" style={{ color: s.color, fontFamily: "Nunito, sans-serif" }}>{s.value}</p>
                <p className="text-[11px] text-[var(--color-muted)] font-medium mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="card p-5">
            <h3 className="text-sm font-bold text-[var(--color-fg)] mb-4">Consumo por Hora — Hoy</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={dailyReport}>
                <defs>
                  <linearGradient id="dg1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="hora" tick={{ fill: "var(--color-muted)", fontSize: 9 }} interval={3} />
                <YAxis tick={{ fill: "var(--color-muted)", fontSize: 10 }} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="consumo" stroke="var(--color-accent)" fill="url(#dg1)" strokeWidth={2.5} name="kWh" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === "semanal" && (
        <div className="flex flex-col gap-5">
          <div className="card p-5">
            <h3 className="text-sm font-bold text-[var(--color-fg)] mb-4">Consumo por Día y Zona — Esta Semana</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={weeklyReport}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="dia" tick={{ fill: "var(--color-muted)", fontSize: 10 }} />
                <YAxis tick={{ fill: "var(--color-muted)", fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="norte" fill="var(--color-accent)" radius={[4,4,0,0]} name="Norte" />
                <Bar dataKey="centro" fill="var(--chart-2)" radius={[4,4,0,0]} name="Centro" />
                <Bar dataKey="sur" fill="var(--color-success)" radius={[4,4,0,0]} name="Sur" />
                <Bar dataKey="industrial" fill="var(--color-warning)" radius={[4,4,0,0]} name="Industrial" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === "mensual" && (
        <div className="flex flex-col gap-5">
          <div className="card p-5">
            <h3 className="text-sm font-bold text-[var(--color-fg)] mb-4">Consumo y Costo Mensual</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyReport}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="mes" tick={{ fill: "var(--color-muted)", fontSize: 10 }} />
                <YAxis tick={{ fill: "var(--color-muted)", fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="consumo" stroke="var(--color-accent)" strokeWidth={2.5} dot={{ fill: "var(--color-accent)", r: 4 }} name="kWh" />
                <Line type="monotone" dataKey="costo" stroke="var(--chart-2)" strokeWidth={2.5} dot={{ fill: "var(--chart-2)", r: 4 }} name="Costo $" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[var(--color-surface-2)] border-b border-[var(--color-border)]">
                  {["Mes", "Consumo (kWh)", "Costo (MXN)", "Anomalías"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[var(--color-muted)] font-bold uppercase text-[10px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthlyReport.map(m => (
                  <tr key={m.mes} className="border-b border-[var(--color-border)] hover:bg-[var(--color-accent-soft)] transition-colors">
                    <td className="px-4 py-3 font-bold text-[var(--color-fg)]">{m.mes} 2026</td>
                    <td className="px-4 py-3 font-semibold text-[var(--color-accent)]">{m.consumo.toLocaleString("es-MX")}</td>
                    <td className="px-4 py-3 font-semibold text-[var(--chart-2)]">${m.costo.toLocaleString("es-MX")}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${m.anomalias > 10 ? "badge-red" : m.anomalias > 6 ? "badge-yellow" : "badge-green"}`}>
                        {m.anomalias}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "instalacion" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {instReport.map(inst => (
            <div key={inst.nombre} className="card p-5">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-sm font-bold text-[var(--color-fg)]">{inst.nombre}</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  inst.estado === "Normal" ? "badge-green" :
                  inst.estado === "Alerta" ? "badge-yellow" : "badge-red"
                }`}>{inst.estado}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[var(--color-accent-soft)] p-3">
                  <p className="text-[10px] text-[var(--color-muted)] font-medium">Consumo</p>
                  <p className="text-sm font-bold text-[var(--color-accent)]">{inst.consumo.toLocaleString("es-MX")} kWh</p>
                </div>
                <div className="rounded-2xl bg-[var(--color-info-soft)] p-3">
                  <p className="text-[10px] text-[var(--color-muted)] font-medium">Costo</p>
                  <p className="text-sm font-bold text-[var(--chart-2)]">${inst.costo.toLocaleString("es-MX")}</p>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--color-muted)] font-medium">Eficiencia</span>
                  <span className="font-bold" style={{ color: inst.eficiencia >= 90 ? "var(--color-success)" : inst.eficiencia >= 80 ? "var(--color-warning)" : "var(--color-danger)" }}>
                    {inst.eficiencia}%
                  </span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{
                    width: `${inst.eficiencia}%`,
                    background: inst.eficiencia >= 90 ? "var(--color-success)" : inst.eficiencia >= 80 ? "var(--color-warning)" : "var(--color-danger)",
                  }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "exportar" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { title: "Excel (.xlsx)", desc: "Datos tabulares completos, hojas múltiples por zona y período", icon: "📊", badge: "Recomendado" },
            { title: "PDF Ejecutivo", desc: "Reporte formateado con gráficas, tablas y resumen ejecutivo", icon: "📄", badge: "Presentaciones" },
            { title: "CSV Datos Crudos", desc: "Exportación de lecturas raw para análisis externo", icon: "📋", badge: "Análisis" },
            { title: "JSON API", desc: "Formato estructurado para integración con otros sistemas", icon: "🔗", badge: "Integración" },
          ].map(f => (
            <div key={f.title} className="card p-5 hover:shadow-lg transition-all cursor-pointer group">
              <div className="flex items-start gap-4">
                <div className="text-4xl">{f.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-bold text-[var(--color-fg)]">{f.title}</p>
                    <span className="badge-orange text-[10px] font-bold px-2 py-0.5">{f.badge}</span>
                  </div>
                  <p className="text-xs text-[var(--color-muted)] mb-3">{f.desc}</p>
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-full gradient-accent text-[var(--accent-contrast)] text-[11px] font-bold group-hover:opacity-90 transition-opacity">
                    <Download size={11} /> Exportar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "programar" && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <button className="flex items-center gap-2 px-4 py-2 rounded-full gradient-accent text-[var(--accent-contrast)] text-xs font-bold hover:opacity-90">
              <Settings size={12} /> Nuevo Reporte Programado
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {scheduledReports.map(r => (
              <div key={r.id} className={`card p-4 ${!r.activo ? "opacity-60" : ""}`}>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${r.activo ? "bg-[var(--color-success-soft)]" : "bg-[var(--color-surface-3)]"}`}>
                    {r.activo ? <CheckCircle size={18} color="var(--color-success)" /> : <Clock size={18} color="var(--color-muted)" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="text-xs font-bold text-[var(--color-fg)]">{r.nombre}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.activo ? "badge-green" : "badge-gray"}`}>
                        {r.activo ? "Activo" : "Inactivo"}
                      </span>
                      <span className="badge-orange text-[10px] font-bold px-2 py-0.5">{r.formato}</span>
                    </div>
                    <div className="flex gap-4 text-[11px] text-[var(--color-muted)]">
                      <span>⏰ {r.frecuencia}</span>
                      <span>📧 {r.destinatarios}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 rounded-full text-[11px] font-semibold border border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors">
                      Editar
                    </button>
                    <button className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
                      r.activo ? "bg-[var(--color-danger-soft)] text-[var(--color-danger)]" : "bg-[var(--color-success-soft)] text-[var(--color-success)]"
                    }`}>
                      {r.activo ? "Pausar" : "Activar"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


