import { useCallback, useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import {
  Activity,
  BookOpen,
  CalendarDays,
  Home,
  MapPin,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";
import { obtenerDashboard, type DashboardData } from "../services/dashboardService";
import { obtenerZonas, type Zona } from "../services/zonasService";
import { obtenerCalendario, type CalendarioDia } from "../services/calendarioService";
import MapModule from "./MapModule";

const COLORS = ["#ff8a1f", "#6366f1", "#10b981", "#f59e0b", "#06b6d4"];
const fmt = (n: number, digits = 2): string =>
  n.toLocaleString("es-MX", { maximumFractionDigits: digits });

function fechaLocal(valor: string): Date {
  const [anio, mes, dia] = valor.slice(0, 10).split("-").map(Number);
  return new Date(anio, mes - 1, dia);
}

function formatearFecha(valor: string): string {
  if (!valor) return "Sin fecha";
  return fechaLocal(valor).toLocaleDateString("es-MX", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric",
  });
}

function normalizarNombre(nombre: string): string {
  return nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim().toUpperCase();
}

function descripcionDia(dia: CalendarioDia): string {
  const etiquetas: string[] = [];
  if (dia.es_festivo) etiquetas.push("Festivo");
  if (dia.es_vacacional) etiquetas.push("Vacacional");
  if (!etiquetas.length) etiquetas.push(`Tipo ${dia.tipo_dia.trim()}`);
  return etiquetas.join(" · ");
}

function StatCard({ label, value, sub, icon: Icon, color, bg, trend }: {
  label: string; value: string; sub: string;
  icon: ComponentType<{ size?: number; color?: string }>;
  color: string; bg: string; trend?: number | null;
}) {
  return <div className="card relative flex flex-col gap-3 overflow-hidden p-5">
    <div className="blob h-24 w-24 opacity-40" style={{ background: bg, top: -20, right: -20 }} />
    <div className="relative flex items-start justify-between">
      <div className="rounded-2xl p-3" style={{ background: bg }}><Icon size={20} color={color} /></div>
      {trend !== undefined && trend !== null && <div className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium ${trend >= 0 ? "bg-[#ecfdf5] text-[#10b981]" : "bg-[#fef2f2] text-[#ef4444]"}`}>
        {trend >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}{trend >= 0 ? "+" : ""}{fmt(trend)}%
      </div>}
    </div>
    <div className="relative"><p className="mb-1 text-[11px] font-medium text-[#9098b1]">{label}</p><p className="text-2xl font-bold text-[#1a1a2e]">{value}</p><p className="mt-0.5 text-[11px] text-[#9098b1]">{sub}</p></div>
  </div>;
}

function ModalZona({ zona, onClose }: { zona: Zona; onClose: () => void }) {
  const densidad = zona.poblacion_total !== null && zona.superficie_km2 > 0
    ? zona.poblacion_total / zona.superficie_km2 : null;
  return <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-[#1a1a2e]/40 p-4 backdrop-blur-sm" onMouseDown={onClose}>
    <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff4ea]"><MapPin size={20} color="#ff8a1f" /></div><div><p className="text-[11px] text-[#9098b1]">Información territorial</p><h2 className="text-xl font-bold text-[#1a1a2e]">{zona.nombre}</h2></div></div>
        <button type="button" onClick={onClose} className="rounded-full bg-[#f2f3f7] p-2"><X size={15} /></button>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-[#f8f9fc] p-4"><Users size={16} color="#6366f1" /><p className="mt-2 text-[10px] text-[#9098b1]">Población</p><p className="font-bold">{zona.poblacion_total?.toLocaleString("es-MX") ?? "Sin dato"}</p></div>
        <div className="rounded-2xl bg-[#f8f9fc] p-4"><Home size={16} color="#10b981" /><p className="mt-2 text-[10px] text-[#9098b1]">Viviendas habitadas</p><p className="font-bold">{zona.viviendas_habitadas?.toLocaleString("es-MX") ?? "Sin dato"}</p></div>
        <div className="rounded-2xl bg-[#f8f9fc] p-4"><MapPin size={16} color="#ff8a1f" /><p className="mt-2 text-[10px] text-[#9098b1]">Superficie</p><p className="font-bold">{fmt(zona.superficie_km2, 3)} km²</p></div>
        <div className="rounded-2xl bg-[#f8f9fc] p-4"><TrendingUp size={16} color="#f59e0b" /><p className="mt-2 text-[10px] text-[#9098b1]">Factor socioeconómico</p><p className="font-bold">{fmt(zona.factor_socioeconomico, 3)}</p></div>
      </div>
      <div className="mt-3 rounded-2xl bg-[#f8f9fc] p-4 text-xs"><div className="flex justify-between"><span className="text-[#9098b1]">Tipo urbano</span><b>{zona.tipo_urbano.replaceAll("_", " ")}</b></div><div className="mt-3 flex justify-between"><span className="text-[#9098b1]">Grado de rezago</span><b>{zona.grado_rezago_representativo ?? "Sin información"}</b></div><div className="mt-3 flex justify-between"><span className="text-[#9098b1]">Densidad</span><b>{densidad === null ? "Sin dato" : `${fmt(densidad, 0)} hab/km²`}</b></div></div>
    </div>
  </div>;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [calendario, setCalendario] = useState<CalendarioDia[]>([]);
  const [fecha, setFecha] = useState("");
  const [idZona, setIdZona] = useState("");
  const [zonaModal, setZonaModal] = useState<Zona | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingFiltros, setLoadingFiltros] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const diaSeleccionado = useMemo(() => calendario.find((d) => d.fecha.slice(0, 10) === fecha), [calendario, fecha]);

  const cargarFiltros = useCallback(async () => {
    try {
      setLoadingFiltros(true); setError(null);
      const [listaZonas, listaCalendario] = await Promise.all([obtenerZonas(), obtenerCalendario()]);
      const ordenado = [...listaCalendario].sort((a, b) => a.fecha.localeCompare(b.fecha));
      setZonas(listaZonas); setCalendario(ordenado);
      if (ordenado.length) setFecha((actual) => actual || ordenado[ordenado.length - 1].fecha.slice(0, 10));
      else setError("El calendario no contiene fechas disponibles.");
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudieron cargar los filtros."); }
    finally { setLoadingFiltros(false); }
  }, []);

  const cargar = useCallback(async (signal?: AbortSignal) => {
    if (!fecha) return;
    try {
      setLoading(true); setError(null);
      setData(await obtenerDashboard({ fecha, idZona: idZona ? Number(idZona) : undefined, limiteTop: 10 }, signal));
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "No se pudo cargar el dashboard.");
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [fecha, idZona]);

  useEffect(() => { void cargarFiltros(); }, [cargarFiltros]);
  useEffect(() => { if (!fecha) return; const controller = new AbortController(); void cargar(controller.signal); return () => controller.abort(); }, [cargar, fecha]);

  const abrirModalPorNombre = useCallback((nombre: string) => {
    const buscado = normalizarNombre(nombre);
    const zona = zonas.find((item) => normalizarNombre(item.nombre) === buscado);
    if (zona) setZonaModal(zona);
    else setError(`No se encontró la zona "${nombre}" en PostgreSQL.`);
  }, [zonas]);

  if (loadingFiltros && !calendario.length) return <div className="card p-8 text-center text-sm text-[#9098b1]">Cargando zonas y calendario...</div>;
  if (loading && !data) return <div className="card p-8 text-center text-sm text-[#9098b1]">Cargando dashboard...</div>;
  if (!data) return <div className="card p-8 text-center"><p className="text-sm text-[#ef4444]">{error ?? "No hay datos disponibles."}</p><button onClick={() => void cargarFiltros()} className="mt-3 rounded-xl bg-[#ff8a1f] px-4 py-2 text-xs text-white">Reintentar</button></div>;

  const i = data.indicadores;
  return <div className="relative flex flex-col gap-6">
    {zonaModal && <ModalZona zona={zonaModal} onClose={() => setZonaModal(null)} />}
    {loading && data && <div className="pointer-events-none fixed right-5 top-5 z-[4000] flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold shadow-lg"><RefreshCw size={14} className="animate-spin" />Actualizando...</div>}

    <div className="card relative overflow-hidden p-6" style={{ background: "linear-gradient(135deg, #ff8a1f 0%, #ffb347 100%)" }}>
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-sm text-white/80">Sistema de Monitoreo Energético</p><h1 className="text-2xl font-bold text-white">Resumen del Sistema</h1><p className="mt-1 text-sm text-white/70">Toluca Smart City · {formatearFecha(fecha)}</p></div>
        <div className="flex flex-wrap gap-2"><select value={fecha} onChange={(e) => setFecha(e.target.value)} className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold">{calendario.map((d) => <option key={d.fecha} value={d.fecha.slice(0, 10)}>{formatearFecha(d.fecha)} · {descripcionDia(d)}</option>)}</select><select value={idZona} onChange={(e) => setIdZona(e.target.value)} className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold"><option value="">Todas las zonas ({zonas.length})</option>{zonas.map((z) => <option key={z.id_zona} value={z.id_zona}>{z.nombre}</option>)}</select></div>
      </div>
      {diaSeleccionado && <div className="relative mt-4 flex flex-wrap gap-2 text-[11px] text-white"><span className="rounded-full bg-white/15 px-3 py-1.5">{descripcionDia(diaSeleccionado)}</span><span className="rounded-full bg-white/15 px-3 py-1.5">{fmt(Number(diaSeleccionado.temp_min_c), 1)}°C a {fmt(Number(diaSeleccionado.temp_max_c), 1)}°C</span></div>}
    </div>

    {error && <div className="rounded-2xl bg-[#fef2f2] p-3 text-xs text-[#b91c1c]">{error}</div>}
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Consumo del Día" value={`${fmt(i.consumo_dia_kwh)} kWh`} sub={formatearFecha(fecha)} icon={Zap} color="#ff8a1f" bg="#fff4ea" trend={data.comparacion_periodo.variacion_porcentual} />
      <StatCard label="Medidores Monitoreados" value={fmt(i.total_medidores, 0)} sub="Registros totales" icon={Home} color="#6366f1" bg="#eef2ff" />
      <StatCard label="Medidores Activos" value={fmt(i.medidores_activos, 0)} sub={`de ${i.total_medidores} totales`} icon={Activity} color="#10b981" bg="#ecfdf5" />
      <StatCard label="Lecturas del Día" value={fmt(i.lecturas_dia, 0)} sub={formatearFecha(fecha)} icon={BookOpen} color="#f59e0b" bg="#fffbeb" />
    </div>

    <MapModule onZonaSeleccionada={abrirModalPorNombre} />

    <div className="card p-5"><h3 className="text-sm font-semibold">Consumo por Zona</h3><p className="mb-4 text-[11px] text-[#9098b1]">Haz clic para consultar datos territoriales ya cargados.</p><div className="flex max-h-96 flex-col gap-3 overflow-y-auto">{data.consumo_por_zona.map((z, index) => <button key={z.id_zona} onClick={() => setZonaModal(zonas.find((x) => x.id_zona === z.id_zona) ?? null)} className="rounded-xl p-2 text-left hover:bg-[#f8f9fc]"><div className="mb-1 flex justify-between text-xs"><b>{z.zona_nombre}</b><span>{fmt(z.consumo_kwh)} kWh · {z.porcentaje.toFixed(1)}%</span></div><div className="progress-bar"><div className="progress-fill" style={{ width: `${z.porcentaje}%`, background: COLORS[index % COLORS.length] }} /></div></button>)}</div></div>
  </div>;
}
