import { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";
import { DollarSign, Clock, AlertTriangle, Calculator, FileText, Play } from "lucide-react";

type TariffTab = "tarifas" | "horarios" | "penalizaciones" | "costos" | "simulacion";

const TARIFF_CONFIGS = [
  { id: "DAC", nombre: "Doméstica Alto Consumo", cargo_fijo: 65.40, cargo_energia_base: 0.974, cargo_energia_intermedia: 2.948, cargo_energia_punta: 4.023, fpMin: 0.90, vigencia: "2026-01-01", activa: true },
  { id: "1C", nombre: "Doméstica 1C", cargo_fijo: 27.80, cargo_energia_base: 0.712, cargo_energia_intermedia: 1.640, cargo_energia_punta: 2.105, fpMin: 0.90, vigencia: "2026-01-01", activa: true },
  { id: "2", nombre: "Doméstica 2", cargo_fijo: 45.20, cargo_energia_base: 0.831, cargo_energia_intermedia: 1.822, cargo_energia_punta: 2.450, fpMin: 0.90, vigencia: "2026-01-01", activa: true },
  { id: "OM", nombre: "Servicios en Media Tensión", cargo_fijo: 1240.00, cargo_energia_base: 0.628, cargo_energia_intermedia: 1.204, cargo_energia_punta: 1.876, fpMin: 0.90, vigencia: "2026-01-01", activa: true },
  { id: "3", nombre: "Pequeña Industria", cargo_fijo: 380.00, cargo_energia_base: 0.743, cargo_energia_intermedia: 1.350, cargo_energia_punta: 2.180, fpMin: 0.90, vigencia: "2026-01-01", activa: false },
];

const HORARIOS_PUNTA = [
  { horario: "Punta", inicio: "18:00", fin: "22:00", color: "#ef4444", bg: "#fef2f2", descripcion: "Máxima demanda del sistema" },
  { horario: "Intermedia", inicio: "10:00", fin: "18:00", color: "#f59e0b", bg: "#fffbeb", descripcion: "Demanda moderada" },
  { horario: "Base", inicio: "00:00", fin: "10:00", color: "#10b981", bg: "#ecfdf5", descripcion: "Mínima demanda" },
];

const hourlyTariff = Array.from({ length: 24 }, (_, i) => ({
  hora: `${String(i).padStart(2,"0")}:00`,
  tipo: i >= 18 && i < 22 ? "Punta" : (i >= 10 && i < 18 ? "Intermedia" : "Base"),
  tarifa: i >= 18 && i < 22 ? 2.105 : (i >= 10 && i < 18 ? 1.640 : 0.712),
}));

const PENALIZACIONES = [
  { fp: "< 0.85", penalizacion: "+15% sobre cargo por demanda", riesgo: "Alto", color: "#ef4444" },
  { fp: "0.85 – 0.89", penalizacion: "+7% sobre cargo por demanda", riesgo: "Medio", color: "#f59e0b" },
  { fp: "0.90 – 0.94", penalizacion: "Sin penalización", riesgo: "Normal", color: "#10b981" },
  { fp: "≥ 0.95", penalizacion: "Bonificación del 2%", riesgo: "Óptimo", color: "#6366f1" },
];

const costosData = [
  { mes: "Mar", base: 4820, intermedia: 12400, punta: 8200, penalizacion: 320 },
  { mes: "Abr", base: 4980, intermedia: 13100, punta: 8600, penalizacion: 280 },
  { mes: "May", base: 5200, intermedia: 13800, punta: 9100, penalizacion: 210 },
  { mes: "Jun", base: 5800, intermedia: 15200, punta: 10400, penalizacion: 180 },
  { mes: "Jul", base: 6100, intermedia: 16000, punta: 11200, penalizacion: 150 },
  { mes: "Ago", base: 5900, intermedia: 15500, punta: 10800, penalizacion: 160 },
  { mes: "Sep", base: 5400, intermedia: 14200, punta: 9600, penalizacion: 190 },
];

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-2xl px-3 py-2 shadow-lg border border-[#f0f1f7] text-xs">
      <p className="font-bold text-[#9098b1] mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">${Number(p.value).toLocaleString("es-MX")}</p>
      ))}
    </div>
  );
};

function SimulacionTab() {
  const [kwh, setKwh] = useState(1800);
  const [kwBase, setKwBase] = useState(500);
  const [kwInt, setKwInt] = useState(900);
  const [kwPunta, setKwPunta] = useState(400);
  const [fp, setFp] = useState(0.92);
  const [tariff, setTariff] = useState("1C");

  const t = TARIFF_CONFIGS.find(t => t.id === tariff)!;
  const costoBase = kwBase * t.cargo_energia_base;
  const costoInt = kwInt * t.cargo_energia_intermedia;
  const costoPunta = kwPunta * t.cargo_energia_punta;
  const penPct = fp < 0.85 ? 0.15 : fp < 0.90 ? 0.07 : 0;
  const penMonto = (costoBase + costoInt + costoPunta) * penPct;
  const total = t.cargo_fijo + costoBase + costoInt + costoPunta + penMonto;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <h3 className="text-sm font-bold text-[#1a1a2e] mb-4">Parámetros de Simulación</h3>
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <label className="font-semibold text-[#1a1a2e]">Tarifa aplicable</label>
              </div>
              <select value={tariff} onChange={e => setTariff(e.target.value)}
                className="w-full bg-[#f8f9fc] border border-[#e5e7ef] rounded-xl px-3 py-2 text-sm text-[#1a1a2e] focus:outline-none focus:border-[#ff8a1f]">
                {TARIFF_CONFIGS.filter(t => t.activa).map(t => <option key={t.id} value={t.id}>{t.id} — {t.nombre}</option>)}
              </select>
            </div>
            {[
              { key: "kwBase", label: "kWh en horario base", max: 3000, value: kwBase, setter: setKwBase, color: "#10b981" },
              { key: "kwInt", label: "kWh en horario intermedio", max: 3000, value: kwInt, setter: setKwInt, color: "#f59e0b" },
              { key: "kwPunta", label: "kWh en horario punta", max: 2000, value: kwPunta, setter: setKwPunta, color: "#ef4444" },
              { key: "fp", label: `Factor de potencia: ${fp.toFixed(2)}`, max: 1, step: 0.01, value: fp, setter: setFp, color: "#6366f1" },
            ].map(f => (
              <div key={f.key}>
                <div className="flex justify-between text-xs mb-1.5">
                  <label className="font-semibold text-[#1a1a2e]">{f.label}</label>
                  {f.key !== "fp" && <span className="font-bold" style={{ color: f.color }}>{f.value} kWh</span>}
                </div>
                <input type="range" min={0} max={f.max} step={(f as any).step || 10}
                  value={f.value} onChange={e => f.setter(Number(e.target.value))}
                  className="w-full" style={{ accentColor: f.color }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="card p-5" style={{ background: "linear-gradient(135deg,#ff8a1f,#ffb347)" }}>
            <p className="text-white/80 text-xs font-semibold mb-1">Costo Total Estimado</p>
            <p className="text-4xl font-bold text-white" style={{ fontFamily: "Nunito, sans-serif" }}>
              ${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-white/70 text-xs mt-1">MXN · período mensual simulado</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Cargo Fijo", value: t.cargo_fijo, color: "#9098b1", bg: "#f3f4f8" },
              { label: "Cargo Base", value: costoBase, color: "#10b981", bg: "#ecfdf5" },
              { label: "Cargo Intermedia", value: costoInt, color: "#f59e0b", bg: "#fffbeb" },
              { label: "Cargo Punta", value: costoPunta, color: "#ef4444", bg: "#fef2f2" },
              { label: "Penalización FP", value: penMonto, color: "#6366f1", bg: "#eef2ff" },
              { label: "FP Actual", value: fp, color: fp >= 0.90 ? "#10b981" : "#ef4444", bg: fp >= 0.90 ? "#ecfdf5" : "#fef2f2", isFp: true },
            ].map(item => (
              <div key={item.label} className="rounded-2xl p-3" style={{ background: item.bg }}>
                <p className="text-[10px] text-[#9098b1] font-semibold mb-1">{item.label}</p>
                <p className="text-sm font-bold" style={{ color: item.color }}>
                  {(item as any).isFp ? item.value : `$${Number(item.value).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const tabs: { key: TariffTab; label: string; emoji: string }[] = [
  { key: "tarifas", label: "Tarifas Eléctricas", emoji: "💡" },
  { key: "horarios", label: "Horarios Punta / Base", emoji: "🕐" },
  { key: "penalizaciones", label: "Penalizaciones FP", emoji: "⚠️" },
  { key: "costos", label: "Cálculo de Costos", emoji: "💰" },
  { key: "simulacion", label: "Simulación de Facturación", emoji: "🧮" },
];

export default function Tariffs() {
  const [activeTab, setActiveTab] = useState<TariffTab>("tarifas");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a2e]" style={{ fontFamily: "Nunito, sans-serif" }}>Configuración Tarifaria</h1>
        <p className="text-sm text-[#9098b1] mt-0.5">Gestión de tarifas, horarios y cálculo automático de costos eléctricos</p>
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

      {activeTab === "tarifas" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4">
            {TARIFF_CONFIGS.map(t => (
              <div key={t.id} className={`card p-5 ${!t.activa ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-black text-[#ff8a1f]" style={{ fontFamily: "Nunito, sans-serif" }}>{t.id}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.activa ? "badge-green" : "badge-gray"}`}>
                        {t.activa ? "Vigente" : "Inactiva"}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-[#1a1a2e]">{t.nombre}</p>
                    <p className="text-[11px] text-[#9098b1]">Vigencia desde: {t.vigencia}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-[#9098b1] mb-0.5">Cargo fijo mensual</p>
                    <p className="text-xl font-bold text-[#1a1a2e]" style={{ fontFamily: "Nunito, sans-serif" }}>${t.cargo_fijo.toFixed(2)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Cargo Base", value: t.cargo_energia_base, color: "#10b981", bg: "#ecfdf5" },
                    { label: "Cargo Intermedia", value: t.cargo_energia_intermedia, color: "#f59e0b", bg: "#fffbeb" },
                    { label: "Cargo Punta", value: t.cargo_energia_punta, color: "#ef4444", bg: "#fef2f2" },
                  ].map(c => (
                    <div key={c.label} className="rounded-xl p-3 text-center" style={{ background: c.bg }}>
                      <p className="text-sm font-bold" style={{ color: c.color }}>${c.value.toFixed(3)}</p>
                      <p className="text-[10px] text-[#9098b1] font-medium mt-0.5">{c.label} /kWh</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "horarios" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4">
            {HORARIOS_PUNTA.map(h => (
              <div key={h.horario} className="card p-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: h.bg }}>
                  <Clock size={20} color={h.color} />
                </div>
                <p className="text-sm font-bold text-[#1a1a2e]">{h.horario}</p>
                <p className="text-2xl font-black mt-1 mb-1" style={{ color: h.color, fontFamily: "Nunito, sans-serif" }}>{h.inicio} – {h.fin}</p>
                <p className="text-xs text-[#9098b1]">{h.descripcion}</p>
              </div>
            ))}
          </div>
          <div className="card p-5">
            <h3 className="text-sm font-bold text-[#1a1a2e] mb-4">Perfil Tarifario por Hora</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={hourlyTariff}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f1f7" />
                <XAxis dataKey="hora" tick={{ fill: "#9098b1", fontSize: 9 }} interval={3} />
                <YAxis tick={{ fill: "#9098b1", fontSize: 10 }} tickFormatter={v => `$${v}`} />
                <Tooltip contentStyle={{ background: "white", border: "1px solid #f0f1f7", borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="tarifa" name="$/kWh" radius={[4, 4, 0, 0]}>
                  {hourlyTariff.map((entry, i) => (
                    <rect key={i} fill={entry.tipo === "Punta" ? "#ef4444" : entry.tipo === "Intermedia" ? "#f59e0b" : "#10b981"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === "penalizaciones" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            {PENALIZACIONES.map(p => (
              <div key={p.fp} className="card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{ background: p.color }}>
                    FP
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#1a1a2e]">Factor de Potencia {p.fp}</p>
                    <p className="text-[11px] font-bold" style={{ color: p.color }}>{p.riesgo}</p>
                  </div>
                </div>
                <div className="rounded-xl p-3" style={{ background: `${p.color}10` }}>
                  <p className="text-xs font-semibold" style={{ color: p.color }}>{p.penalizacion}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "costos" && (
        <div className="flex flex-col gap-5">
          <div className="card p-5">
            <h3 className="text-sm font-bold text-[#1a1a2e] mb-1">Desglose de Costos por Período</h3>
            <p className="text-[11px] text-[#9098b1] mb-4">Costos eléctricos mensuales (MXN)</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={costosData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f1f7" />
                <XAxis dataKey="mes" tick={{ fill: "#9098b1", fontSize: 10 }} />
                <YAxis tick={{ fill: "#9098b1", fontSize: 10 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="base" fill="#10b981" radius={[3,3,0,0]} name="Base" stackId="a" />
                <Bar dataKey="intermedia" fill="#f59e0b" radius={[0,0,0,0]} name="Intermedia" stackId="a" />
                <Bar dataKey="punta" fill="#ef4444" radius={[0,0,0,0]} name="Punta" stackId="a" />
                <Bar dataKey="penalizacion" fill="#6366f1" radius={[3,3,0,0]} name="Penalización" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Costo Base", value: "$5,400", color: "#10b981", bg: "#ecfdf5" },
              { label: "Costo Intermedia", value: "$14,200", color: "#f59e0b", bg: "#fffbeb" },
              { label: "Costo Punta", value: "$9,600", color: "#ef4444", bg: "#fef2f2" },
              { label: "Penalizaciones", value: "$190", color: "#6366f1", bg: "#eef2ff" },
            ].map(s => (
              <div key={s.label} className="card p-4 text-center">
                <p className="text-xl font-bold" style={{ color: s.color, fontFamily: "Nunito, sans-serif" }}>{s.value}</p>
                <p className="text-[11px] text-[#9098b1] font-medium mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "simulacion" && <SimulacionTab />}
    </div>
  );
}
