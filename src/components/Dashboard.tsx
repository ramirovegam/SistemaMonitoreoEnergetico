import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import {
  Area, AreaChart, CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Activity, ArrowUpRight, Bell, BookOpen, Home,
  RefreshCw, TrendingDown, TrendingUp, Zap,
} from "lucide-react";
import { obtenerDashboard, type DashboardData } from "../services/dashboardService";
import { obtenerZonas, type Zona } from "../services/zonasService";
import MapModule from "./MapModule";

const COLORS = ["#ff8a1f", "#6366f1", "#10b981", "#f59e0b", "#06b6d4"];
const fmt = (n: number, digits = 2): string => n.toLocaleString("es-MX", { maximumFractionDigits: digits });

function StatCard({ label, value, sub, icon: Icon, color, bg, trend }: {
  label: string; value: string; sub: string;
  icon: ComponentType<{ size?: number; color?: string }>;
  color: string; bg: string; trend?: number | null;
}) {
  return <div className="card p-5 flex flex-col gap-3 relative overflow-hidden">
    <div className="blob w-24 h-24 opacity-40" style={{ background: bg, top: -20, right: -20 }}/>
    <div className="flex items-start justify-between relative">
      <div className="rounded-2xl p-3" style={{ background: bg }}><Icon size={20} color={color}/></div>
      {trend !== undefined && trend !== null && <div className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full ${trend >= 0 ? "bg-[#ecfdf5] text-[#10b981]" : "bg-[#fef2f2] text-[#ef4444]"}`}>{trend >= 0 ? <TrendingUp size={10}/> : <TrendingDown size={10}/>} {trend >= 0 ? "+" : ""}{fmt(trend)}%</div>}
    </div>
    <div className="relative"><p className="text-[11px] font-medium text-[#9098b1] mb-1">{label}</p><p className="text-2xl font-bold text-[#1a1a2e]" style={{ fontFamily: "Nunito, sans-serif" }}>{value}</p><p className="text-[11px] text-[#9098b1] mt-0.5">{sub}</p></div>
  </div>;
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return <div className="bg-white rounded-xl px-3 py-2 text-xs shadow-lg border border-[#f0f1f7]"><p className="text-[#9098b1] mb-1 font-medium">{label}</p>{payload.map((p, i) => <p key={`${p.name}-${i}`} style={{ color: p.color }} className="font-medium">{p.name}: {fmt(Number(p.value ?? 0))}</p>)}</div>;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [periodo, setPeriodo] = useState<"hoy" | "7d" | "30d" | "mes">("30d");
  const [idZona, setIdZona] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = async (): Promise<void> => {
    try {
      setLoading(true); setError(null);
      setData(await obtenerDashboard({ periodo, idZona: idZona ? Number(idZona) : undefined, limiteTop: 10 }));
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo cargar el dashboard"); }
    finally { setLoading(false); }
  };

  useEffect(() => { void obtenerZonas().then(setZonas).catch(() => setZonas([])); }, []);
  useEffect(() => { void cargar(); }, [periodo, idZona]);

  const hourlyData = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, Record<string, string | number>>();
    for (const item of data.perfil_horario_zonas) {
      const hora = new Date(item.periodo).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
      const row = map.get(hora) ?? { hora };
      row[item.zona_nombre] = item.consumo_kwh;
      map.set(hora, row);
    }
    return [...map.values()];
  }, [data]);

  if (loading && !data) return <div className="card p-8 text-center text-sm text-[#9098b1]">Cargando dashboard...</div>;
  if (!data) return <div className="card p-8 text-center"><p className="text-sm text-[#ef4444]">{error}</p><button type="button" onClick={() => void cargar()} className="mt-3 rounded-xl bg-[#ff8a1f] px-4 py-2 text-xs text-white">Reintentar</button></div>;

  const i = data.indicadores;
  const zoneNames = [...new Set(data.perfil_horario_zonas.map((x) => x.zona_nombre))];
  const daily7 = data.consumo_diario_mes.slice(-7).map((x) => ({ day: new Date(x.periodo).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit" }), total: x.consumo_kwh }));
  const avgZone = data.consumo_por_zona.length ? data.consumo_por_zona.reduce((s, x) => s + x.consumo_kwh, 0) / data.consumo_por_zona.length : 0;

  return <div className="flex flex-col gap-6">
    <div className="card p-6 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #ff8a1f 0%, #ffb347 100%)" }}>
      <div className="blob w-40 h-40 bg-white opacity-10" style={{ top: -30, right: -20 }}/><div className="blob w-24 h-24 bg-white opacity-10" style={{ bottom: -10, right: 80 }}/>
      <div className="relative flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div><p className="text-white/80 text-sm font-medium mb-1">Sistema de Monitoreo Energético</p><h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Nunito, sans-serif" }}>Resumen del Sistema</h1><p className="text-white/70 text-sm mt-1">Monitoreo energético · Toluca Smart City · referencia {new Date(data.fecha_referencia).toLocaleDateString("es-MX")}</p></div>
        <div className="flex flex-wrap gap-2">
          <select value={periodo} onChange={(e) => setPeriodo(e.target.value as typeof periodo)} className="rounded-xl border border-white/70 bg-white px-4 py-2.5 text-xs font-semibold text-[#1a1a2e] outline-none"><option value="hoy">Día de última lectura</option><option value="7d">Últimos 7 días</option><option value="30d">Últimos 30 días</option><option value="mes">Mes de última lectura</option></select>
          <select value={idZona} onChange={(e) => setIdZona(e.target.value)} className="rounded-xl border border-white/70 bg-white px-4 py-2.5 text-xs font-semibold text-[#1a1a2e] outline-none"><option value="">Todas las zonas ({zonas.length})</option>{zonas.map((z) => <option key={z.id_zona} value={z.id_zona}>{z.nombre}</option>)}</select>
          <button type="button" onClick={() => void cargar()} className="rounded-xl bg-white/20 p-2.5 text-white"><RefreshCw size={15} className={loading ? "animate-spin" : ""}/></button>
        </div>
      </div>
      <div className="relative flex gap-6 mt-4 flex-wrap">{[{label:"Consumo total",value:`${fmt(i.consumo_mes_kwh)} kWh`},{label:"Medidores activos",value:String(i.medidores_activos)},{label:"Alertas activas",value:String(i.alertas_activas)}].map((s) => <div key={s.label}><p className="text-white text-xl font-bold">{s.value}</p><p className="text-white/70 text-xs">{s.label}</p></div>)}</div>
    </div>

    {error && <div className="rounded-2xl bg-[#fef2f2] p-3 text-xs text-[#b91c1c]">{error}</div>}

    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      <StatCard label="Consumo Total" value={`${fmt(i.consumo_mes_kwh)} kWh`} sub="Mes de última lectura" icon={Zap} color="#ff8a1f" bg="#fff4ea" trend={data.comparacion_periodo.variacion_porcentual}/>
      <StatCard label="Medidores Monitoreados" value={fmt(i.total_medidores, 0)} sub="Registros totales" icon={Home} color="#6366f1" bg="#eef2ff"/>
      <StatCard label="Medidores Activos" value={fmt(i.medidores_activos, 0)} sub={`de ${i.total_medidores} totales`} icon={Activity} color="#10b981" bg="#ecfdf5"/>
      <StatCard label="Alertas Activas" value={fmt(i.alertas_activas, 0)} sub="Requieren atención" icon={Bell} color="#ef4444" bg="#fef2f2"/>
      <StatCard label="Lecturas del Día" value={fmt(i.lecturas_dia, 0)} sub="Día de la última lectura" icon={BookOpen} color="#f59e0b" bg="#fffbeb"/>
      <StatCard label="Consumo Prom./Zona" value={`${fmt(avgZone)} kWh`} sub="Periodo seleccionado" icon={TrendingUp} color="#ff8a1f" bg="#fff4ea"/>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="card p-5"><h3 className="text-sm font-semibold text-[#1a1a2e]">Perfil Horario de Demanda</h3><p className="text-[11px] text-[#9098b1] mb-4">Tres zonas de mayor consumo · últimas 24 horas disponibles</p>{hourlyData.length ? <><ResponsiveContainer width="100%" height={190}><LineChart data={hourlyData}><CartesianGrid strokeDasharray="3 3" stroke="#f0f1f7"/><XAxis dataKey="hora" tick={{fill:"#9098b1",fontSize:10}} interval={3}/><YAxis tick={{fill:"#9098b1",fontSize:10}}/><Tooltip content={<ChartTooltip/>}/>{zoneNames.map((z, index) => <Line key={z} type="monotone" dataKey={z} stroke={COLORS[index%COLORS.length]} strokeWidth={2} dot={false}/>)}</LineChart></ResponsiveContainer><div className="flex gap-4 mt-2 flex-wrap">{zoneNames.map((z,index) => <span key={z} className="flex items-center gap-1.5 text-[11px] text-[#9098b1]"><span className="w-3 h-1 rounded-full inline-block" style={{background:COLORS[index%COLORS.length]}}/>{z}</span>)}</div></> : <div className="flex h-[190px] items-center justify-center text-xs text-[#9098b1]">Sin lecturas horarias disponibles</div>}</div>
      <div className="card p-5"><h3 className="text-sm font-semibold text-[#1a1a2e]">Consumo Diario</h3><p className="text-[11px] text-[#9098b1] mb-4">Últimos 7 días disponibles · total sistema</p>{daily7.length ? <ResponsiveContainer width="100%" height={190}><AreaChart data={daily7}><defs><linearGradient id="ogReal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ff8a1f" stopOpacity={0.2}/><stop offset="95%" stopColor="#ff8a1f" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#f0f1f7"/><XAxis dataKey="day" tick={{fill:"#9098b1",fontSize:10}}/><YAxis tick={{fill:"#9098b1",fontSize:10}}/><Tooltip content={<ChartTooltip/>}/><Area type="monotone" dataKey="total" stroke="#ff8a1f" fill="url(#ogReal)" strokeWidth={2} name="Total kWh"/></AreaChart></ResponsiveContainer> : <div className="flex h-[190px] items-center justify-center text-xs text-[#9098b1]">Sin consumo diario disponible</div>}</div>
    </div>

    <MapModule/>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="card p-5"><h3 className="text-sm font-semibold text-[#1a1a2e] mb-4">Consumo por Zona</h3><div className="flex flex-col gap-4 max-h-96 overflow-y-auto pr-1">{data.consumo_por_zona.map((z,i) => <div key={z.id_zona}><div className="flex justify-between text-xs mb-1.5"><span className="font-medium text-[#1a1a2e]">Zona {z.zona_nombre}</span><span className="text-[#9098b1]">{fmt(z.consumo_kwh)} kWh · <span className="font-semibold" style={{color:COLORS[i%COLORS.length]}}>{z.porcentaje.toFixed(1)}%</span></span></div><div className="progress-bar"><div className="progress-fill" style={{width:`${z.porcentaje}%`,background:COLORS[i%COLORS.length]}}/></div></div>)}</div></div>
      <div className="card p-5"><div className="flex items-center justify-between mb-4"><h3 className="text-sm font-semibold text-[#1a1a2e]">Alertas Recientes</h3><span className="badge-red text-[11px] font-semibold px-2.5 py-1">{i.alertas_activas} activas</span></div><div className="flex flex-col gap-2">{data.alertas_recientes.slice(0,5).map((a) => <div key={a.id_alerta} className="flex items-start gap-3 p-3 rounded-2xl bg-[#f8f9fc] hover:bg-[#f2f3f7]"><div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${a.prioridad >= 3 ? "bg-[#ef4444]" : a.prioridad === 2 ? "bg-[#f59e0b]" : "bg-[#9098b1]"}`}/><div className="flex-1 min-w-0"><div className="flex items-center gap-2"><span className="text-xs font-semibold text-[#1a1a2e]">Evento #{a.id_tipo_evento}</span><span className="text-[10px] badge-red px-2 py-0.5 rounded-full">Prioridad {a.prioridad}</span></div><p className="text-[11px] text-[#9098b1] mt-0.5">Zona {a.zona_nombre} · {a.numero_serie} · {new Date(a.ts_generacion).toLocaleString("es-MX")}</p></div><ArrowUpRight size={12} className="text-[#9098b1]"/></div>)}</div></div>
    </div>
  </div>;
}
