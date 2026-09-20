import { useState } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line,
} from "recharts";
import { MapPin, Zap, Users, AlertTriangle, TrendingUp } from "lucide-react";
import { zoneData, alerts, Zone, monthlyData } from "../data/synthetic";

const fmt = (n: number) => n.toLocaleString("es-MX");

const ZONE_COLORS: Record<Zone, string> = {
  Norte: "#ff8a1f",
  Centro: "#6366f1",
  Sur: "#10b981",
  Industrial: "#f59e0b",
};

const ZONE_BG: Record<Zone, string> = {
  Norte: "#fff4ea",
  Centro: "#eef2ff",
  Sur: "#ecfdf5",
  Industrial: "#fffbeb",
};

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl px-3 py-2 text-xs shadow-lg border border-[#f0f1f7]">
      <p className="text-[#9098b1] mb-1 font-medium">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">{p.name}: {fmt(p.value)}</p>
      ))}
    </div>
  );
};

export default function Zones() {
  const [selected, setSelected] = useState<Zone>("Norte");
  const zone = zoneData.find(z => z.name === selected)!;
  const zoneAlerts = alerts.filter(a => a.zone === selected);
  const color = ZONE_COLORS[selected];
  const bg = ZONE_BG[selected];

  const hourlyData = zone.hourlyProfile.map((v, i) => ({
    hora: `${String(i).padStart(2, "0")}:00`,
    consumo: v,
  }));

  const monthly = monthlyData.map(m => ({
    month: m.month,
    consumo: m[selected as keyof typeof m] as number,
  }));

  const radarData = [
    { metric: "Consumo", value: Math.round((zone.totalConsumption / 303050) * 100) },
    { metric: "Alertas", value: Math.round((zone.alerts / alerts.length) * 100) },
    { metric: "Hogares", value: Math.round((zone.households / 80) * 100) },
    { metric: "Promedio", value: Math.round((zone.avgConsumption / 2345) * 100) },
    { metric: "Calidad", value: 82 },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a2e]" style={{ fontFamily: "Nunito, sans-serif" }}>Módulo de Zonas</h1>
        <p className="text-sm text-[#9098b1] mt-0.5">Comportamiento energético por sector de la ciudad</p>
      </div>

      {/* Zone tabs */}
      <div className="grid grid-cols-4 gap-3">
        {zoneData.map(z => {
          const c = ZONE_COLORS[z.name];
          const b = ZONE_BG[z.name];
          const active = selected === z.name;
          return (
            <button
              key={z.name}
              onClick={() => setSelected(z.name)}
              className={`card-sm p-4 text-left transition-all ${active ? "" : "hover:shadow-md"}`}
              style={active ? { boxShadow: `0 0 0 2px ${c}, 0 4px 20px ${c}35` } : undefined}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: active ? c : b }}>
                  <MapPin size={14} color={active ? "white" : c} />
                </div>
                <span className="text-xs font-bold" style={{ color: active ? c : "#9098b1" }}>Zona {z.name}</span>
              </div>
              <div className="text-lg font-bold text-[#1a1a2e]" style={{ fontFamily: "Nunito, sans-serif" }}>
                {(z.totalConsumption / 1000).toFixed(1)}k
              </div>
              <div className="text-[11px] text-[#9098b1]">kWh totales</div>
              {active && <div className="mt-2 h-1 rounded-full" style={{ background: c }} />}
            </button>
          );
        })}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Consumo Total", value: `${fmt(zone.totalConsumption)} kWh`, icon: Zap, clr: color, b: bg },
          { label: "Consumo Promedio", value: `${fmt(zone.avgConsumption)} kWh`, icon: TrendingUp, clr: "#10b981", b: "#ecfdf5" },
          { label: "Hogares", value: fmt(zone.households), icon: Users, clr: "#6366f1", b: "#eef2ff" },
          { label: "Alertas", value: fmt(zone.alerts), icon: AlertTriangle, clr: "#ef4444", b: "#fef2f2" },
        ].map(item => (
          <div key={item.label} className="card p-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: item.b }}>
              <item.icon size={16} color={item.clr} />
            </div>
            <p className="text-[11px] text-[#9098b1] font-medium">{item.label}</p>
            <p className="text-lg font-bold text-[#1a1a2e] mt-0.5" style={{ fontFamily: "Nunito, sans-serif" }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card p-5">
          <h3 className="text-sm font-semibold text-[#1a1a2e] mb-1">Perfil Horario — Zona {selected}</h3>
          <p className="text-[11px] text-[#9098b1] mb-4">Consumo promedio por hora (kWh)</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f1f7" />
              <XAxis dataKey="hora" tick={{ fill: "#9098b1", fontSize: 9 }} interval={3} />
              <YAxis tick={{ fill: "#9098b1", fontSize: 10 }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="consumo" fill={color} opacity={0.9} radius={[6, 6, 0, 0]} name="Consumo" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-[#1a1a2e] mb-1">Indicadores</h3>
          <p className="text-[11px] text-[#9098b1] mb-4">Análisis relativo (%)</p>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#f0f1f7" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: "#9098b1", fontSize: 10 }} />
              <Radar dataKey="value" stroke={color} fill={color} fillOpacity={0.15} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly trend */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-[#1a1a2e] mb-1">Tendencia Mensual — Zona {selected}</h3>
        <p className="text-[11px] text-[#9098b1] mb-4">Últimos 7 meses (kWh)</p>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f1f7" />
            <XAxis dataKey="month" tick={{ fill: "#9098b1", fontSize: 10 }} />
            <YAxis tick={{ fill: "#9098b1", fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<ChartTooltip />} />
            <Line type="monotone" dataKey="consumo" stroke={color} strokeWidth={2.5} dot={{ fill: color, r: 4, strokeWidth: 0 }} name="kWh" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Alerts */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-[#1a1a2e] mb-4">Alertas en Zona {selected}</h3>
        {zoneAlerts.length === 0 ? (
          <div className="text-center py-6">
            <div className="text-3xl mb-2">✅</div>
            <p className="text-sm text-[#9098b1]">Sin alertas registradas en esta zona</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {zoneAlerts.map(a => (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded-2xl bg-[#f8f9fc] text-xs">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  a.priority === "Alta" ? "bg-[#ef4444]" :
                  a.priority === "Media" ? "bg-[#f59e0b]" : "bg-[#9098b1]"
                }`} />
                <span className="flex-1 font-medium text-[#1a1a2e]">{a.type}</span>
                <span className="text-[#9098b1]">{a.meterId}</span>
                <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                  a.status === "Activa" ? "badge-red" :
                  a.status === "En revisión" ? "badge-yellow" : "badge-green"
                }`}>{a.status}</span>
                <span className="text-[#9098b1]">{a.detectedAt}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
