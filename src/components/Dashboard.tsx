import { useEffect } from "react";

import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";

import {
  Zap, Home, Activity, Bell, BookOpen,
  TrendingUp, TrendingDown, ArrowUpRight
} from "lucide-react";

import {
  summaryStats,
  zoneData,
  dailyData,
  alerts,
  meters
} from "../data/synthetic";

import MapModule from "./MapModule";
import { testBackend } from "../services/api";

const fmt = (n: number) => n.toLocaleString("es-MX");

function StatCard({ label, value, sub, icon: Icon, color, bg, trend }: {
  label: string; value: string; sub: string;
  icon: React.ComponentType<any>;
  color: string; bg: string; trend?: "up" | "down";
}) {
  return (
    <div className="card p-5 flex flex-col gap-3 relative overflow-hidden">
      <div className="blob w-24 h-24 opacity-40" style={{ background: bg, top: -20, right: -20 }} />
      <div className="flex items-start justify-between relative">
        <div className="rounded-2xl p-3" style={{ background: bg }}>
          <Icon size={20} color={color} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full ${
            trend === "up" ? "bg-[#ecfdf5] text-[#10b981]" : "bg-[#fef2f2] text-[#ef4444]"
          }`}>
            {trend === "up" ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {trend === "up" ? "+2.4%" : "-1.2%"}
          </div>
        )}
      </div>
      <div className="relative">
        <p className="text-[11px] font-medium text-[#9098b1] mb-1">{label}</p>
        <p className="text-2xl font-bold text-[#1a1a2e]" style={{ fontFamily: "Nunito, sans-serif" }}>{value}</p>
        <p className="text-[11px] text-[#9098b1] mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

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

export default function Dashboard() {

  useEffect(() => {
    testBackend()
      .then((data) => {
        console.log("Respuesta del backend:", data);
      })
      .catch((error) => {
        console.error("Error al conectar con el backend:", error);
      });
  }, []);

  const recentAlerts = alerts
    .filter(a => a.status === "Activa")
    .slice(0, 5);

  const hourlyData = zoneData[0].hourlyProfile.map((_, i) => ({
    hora: `${String(i).padStart(2, "0")}:00`,
    Norte: zoneData[0].hourlyProfile[i],
    Centro: zoneData[1].hourlyProfile[i],
    Sur: zoneData[2].hourlyProfile[i],
  }));

  const daily7 = dailyData.slice(-7).map(d => ({
    day: d.day.slice(5),
    total: d.total,
  }));

  return (
    <div className="flex flex-col gap-6">
      {/* Hero greeting */}
      <div className="card p-6 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #ff8a1f 0%, #ffb347 100%)" }}>
        <div className="blob w-40 h-40 bg-white opacity-10" style={{ top: -30, right: -20 }} />
        <div className="blob w-24 h-24 bg-white opacity-10" style={{ bottom: -10, right: 80 }} />
        <div className="relative">
          <p className="text-white/80 text-sm font-medium mb-1">Bienvenida, Ana García 👋</p>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Nunito, sans-serif" }}>
            Resumen del Sistema
          </h1>
          <p className="text-white/70 text-sm mt-1">Monitoreo energético en tiempo real · Toluca Smart City</p>
        </div>
        <div className="relative flex gap-6 mt-4 flex-wrap">
          {[
            { label: "Consumo total", value: `${(summaryStats.totalConsumption / 1000).toFixed(1)}k kWh` },
            { label: "Hogares activos", value: String(summaryStats.monitoredHouseholds) },
            { label: "Alertas activas", value: String(summaryStats.activeAlerts) },
          ].map(s => (
            <div key={s.label}>
              <p className="text-white text-xl font-bold" style={{ fontFamily: "Nunito, sans-serif" }}>{s.value}</p>
              <p className="text-white/70 text-xs">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Consumo Total" value={`${fmt(summaryStats.totalConsumption)} kWh`} sub="Este mes" icon={Zap} color="#ff8a1f" bg="#fff4ea" trend="up" />
        <StatCard label="Hogares Monitoreados" value={fmt(summaryStats.monitoredHouseholds)} sub="Registros activos" icon={Home} color="#6366f1" bg="#eef2ff" />
        <StatCard label="Medidores Activos" value={fmt(summaryStats.activeMeters)} sub={`de ${meters.length} totales`} icon={Activity} color="#10b981" bg="#ecfdf5" />
        <StatCard label="Alertas Activas" value={fmt(summaryStats.activeAlerts)} sub="Requieren atención" icon={Bell} color="#ef4444" bg="#fef2f2" />
        <StatCard label="Lecturas Hoy" value={fmt(summaryStats.todayReadings)} sub="de 80 esperadas" icon={BookOpen} color="#f59e0b" bg="#fffbeb" trend="down" />
        <StatCard label="Consumo Prom./Zona" value={`${fmt(summaryStats.avgConsumptionByZone)} kWh`} sub="Promedio mensual" icon={TrendingUp} color="#ff8a1f" bg="#fff4ea" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-[#1a1a2e]">Perfil Horario de Demanda</h3>
              <p className="text-[11px] text-[#9098b1]">Consumo por zona · hoy (kWh)</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f1f7" />
              <XAxis dataKey="hora" tick={{ fill: "#9098b1", fontSize: 10 }} interval={3} />
              <YAxis tick={{ fill: "#9098b1", fontSize: 10 }} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="Norte" stroke="#ff8a1f" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Centro" stroke="#6366f1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Sur" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 flex-wrap">
            {[["Norte","#ff8a1f"],["Centro","#6366f1"],["Sur","#10b981"]].map(([z,c]) => (
              <span key={z} className="flex items-center gap-1.5 text-[11px] text-[#9098b1]">
                <span className="w-3 h-1 rounded-full inline-block" style={{ background: c }} />{z}
              </span>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-[#1a1a2e]">Consumo Diario</h3>
              <p className="text-[11px] text-[#9098b1]">Últimos 7 días · total sistema (kWh)</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={daily7}>
              <defs>
                <linearGradient id="og1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff8a1f" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ff8a1f" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f1f7" />
              <XAxis dataKey="day" tick={{ fill: "#9098b1", fontSize: 10 }} />
              <YAxis tick={{ fill: "#9098b1", fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="total" stroke="#ff8a1f" fill="url(#og1)" strokeWidth={2} name="Total kWh" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Map */}
      <MapModule />

      {/* Zone bars + alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-[#1a1a2e] mb-4">Consumo por Zona</h3>
          <div className="flex flex-col gap-4">
            {zoneData.map((z, i) => {
              const pct = Math.round((z.totalConsumption / 303050) * 100);
              const colors = ["#ff8a1f", "#6366f1", "#10b981", "#f59e0b"];
              return (
                <div key={z.name}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-medium text-[#1a1a2e]">Zona {z.name}</span>
                    <span className="text-[#9098b1]">{fmt(z.totalConsumption)} kWh · <span className="font-semibold" style={{ color: colors[i] }}>{pct}%</span></span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${pct}%`, background: colors[i] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#1a1a2e]">Alertas Recientes</h3>
            <span className="badge-red text-[11px] font-semibold px-2.5 py-1">
              {summaryStats.activeAlerts} activas
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {recentAlerts.map(a => (
              <div key={a.id} className="flex items-start gap-3 p-3 rounded-2xl bg-[#f8f9fc] hover:bg-[#f2f3f7] transition-colors">
                <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                  a.priority === "Alta" ? "bg-[#ef4444]" :
                  a.priority === "Media" ? "bg-[#f59e0b]" : "bg-[#9098b1]"
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-[#1a1a2e] truncate">{a.type}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      a.priority === "Alta" ? "badge-red" :
                      a.priority === "Media" ? "badge-yellow" : "badge-gray"
                    }`}>{a.priority}</span>
                  </div>
                  <p className="text-[11px] text-[#9098b1] mt-0.5">Zona {a.zone} · {a.meterId} · {a.detectedAt}</p>
                </div>
                <ArrowUpRight size={12} className="text-[#9098b1] flex-shrink-0 mt-0.5" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
