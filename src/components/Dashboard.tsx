import { useCallback, useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import {
  Activity,
  BarChart3,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Home,
  MapPin,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { obtenerDashboard, type DashboardData } from "../services/dashboardService";
import { obtenerZonas, type Zona } from "../services/zonasService";
import { obtenerCalendario, type CalendarioDia } from "../services/calendarioService";
import { PageHeader } from "./ui/PageHeader";
import MapModule from "./MapModule";

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

type ChartTooltipEntry = {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string;
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ChartTooltipEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-surface px-3 py-2 text-[11px] shadow-lg">
      {label ? <p className="mb-1 font-semibold text-[var(--color-muted)]">{label}</p> : null}
      {payload.map((entry, index) => (
        <p
          key={`${entry.dataKey ?? entry.name ?? "serie"}-${index}`}
          className="font-semibold"
          style={{ color: entry.color ?? "var(--color-fg)" }}
        >
          {entry.name ?? "Consumo"}: {fmt(Number(entry.value ?? 0))} kWh
        </p>
      ))}
    </div>
  );
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
      {trend !== undefined && trend !== null && <div className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium ${trend >= 0 ? "bg-[var(--color-success-soft)] text-[var(--color-success)]" : "bg-[var(--color-danger-soft)] text-[var(--color-danger)]"}`}>
        {trend >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}{trend >= 0 ? "+" : ""}{fmt(trend)}%
      </div>}
    </div>
    <div className="relative"><p className="mb-1 text-xs font-medium text-[var(--color-muted)]">{label}</p><p className="text-2xl font-bold tabular-nums text-[var(--color-fg)]">{value}</p><p className="mt-0.5 text-xs text-[var(--color-muted)]">{sub}</p></div>
  </div>;
}

function ModalZona({ zona, onClose }: { zona: Zona; onClose: () => void }) {
  const densidad = zona.poblacion_total !== null && zona.superficie_km2 > 0
    ? zona.poblacion_total / zona.superficie_km2 : null;
  return <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-[var(--overlay)] p-4 backdrop-blur-sm" onMouseDown={onClose}>
    <div className="w-full max-w-xl rounded-3xl bg-surface p-6 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-accent-soft)]"><MapPin size={20} color="var(--color-accent)" /></div><div><p className="text-[11px] text-[var(--color-muted)]">Información territorial</p><h2 className="text-xl font-bold text-[var(--color-fg)]">{zona.nombre}</h2></div></div>
        <button type="button" onClick={onClose} className="rounded-full bg-[var(--color-bg)] p-2"><X size={15} /></button>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-[var(--color-surface-2)] p-4"><Users size={16} color="var(--chart-2)" /><p className="mt-2 text-[10px] text-[var(--color-muted)]">Población</p><p className="font-bold">{zona.poblacion_total?.toLocaleString("es-MX") ?? "Sin dato"}</p></div>
        <div className="rounded-2xl bg-[var(--color-surface-2)] p-4"><Home size={16} color="var(--color-success)" /><p className="mt-2 text-[10px] text-[var(--color-muted)]">Viviendas habitadas</p><p className="font-bold">{zona.viviendas_habitadas?.toLocaleString("es-MX") ?? "Sin dato"}</p></div>
        <div className="rounded-2xl bg-[var(--color-surface-2)] p-4"><MapPin size={16} color="var(--color-accent)" /><p className="mt-2 text-[10px] text-[var(--color-muted)]">Superficie</p><p className="font-bold">{fmt(zona.superficie_km2, 3)} km²</p></div>
        <div className="rounded-2xl bg-[var(--color-surface-2)] p-4"><TrendingUp size={16} color="var(--color-warning)" /><p className="mt-2 text-[10px] text-[var(--color-muted)]">Factor socioeconómico</p><p className="font-bold">{fmt(zona.factor_socioeconomico, 3)}</p></div>
      </div>
      <div className="mt-3 rounded-2xl bg-[var(--color-surface-2)] p-4 text-xs"><div className="flex justify-between"><span className="text-[var(--color-muted)]">Tipo urbano</span><b>{zona.tipo_urbano.replaceAll("_", " ")}</b></div><div className="mt-3 flex justify-between"><span className="text-[var(--color-muted)]">Grado de rezago</span><b>{zona.grado_rezago_representativo ?? "Sin información"}</b></div><div className="mt-3 flex justify-between"><span className="text-[var(--color-muted)]">Densidad</span><b>{densidad === null ? "Sin dato" : `${fmt(densidad, 0)} hab/km²`}</b></div></div>
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
  const fechas = useMemo(() => calendario.map((d) => d.fecha.slice(0, 10)), [calendario]);
  const indiceFecha = fechas.indexOf(fecha);
  const cambiarDia = (delta: number) => {
    const siguiente = fechas[indiceFecha + delta];
    if (siguiente) setFecha(siguiente);
  };

  const perfilHorario = useMemo(() => {
    if (!data) return { filas: [], zonas: [] as string[] };

    const filas = new Map<string, Record<string, string | number>>();
    const zonas = new Set<string>();

    for (const punto of data.perfil_horario_zonas) {
      const hora = new Date(punto.periodo).toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const fila = filas.get(hora) ?? { hora };
      fila[punto.zona_nombre] = punto.consumo_kwh;
      filas.set(hora, fila);
      zonas.add(punto.zona_nombre);
    }

    return { filas: [...filas.values()], zonas: [...zonas] };
  }, [data]);

  const serieDiaria = useMemo(
    () =>
      (data?.consumo_diario_mes ?? []).map((punto) => ({
        dia: fechaLocal(punto.periodo).toLocaleDateString("es-MX", {
          day: "2-digit",
          month: "short",
        }),
        consumo: punto.consumo_kwh,
      })),
    [data],
  );

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

  if (loadingFiltros && !calendario.length) return <div className="card p-8 text-center text-sm text-[var(--color-muted)]">Cargando zonas y calendario...</div>;
  if (loading && !data) return <div className="card p-8 text-center text-sm text-[var(--color-muted)]">Cargando dashboard...</div>;
  if (!data) return <div className="card p-8 text-center"><p className="text-sm text-[var(--color-danger)]">{error ?? "No hay datos disponibles."}</p><button onClick={() => void cargarFiltros()} className="mt-3 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-xs text-[var(--accent-contrast)]">Reintentar</button></div>;

  const i = data.indicadores;
  return <div className="relative flex flex-col gap-6">
    {zonaModal && <ModalZona zona={zonaModal} onClose={() => setZonaModal(null)} />}
    {loading && data && <div className="pointer-events-none fixed right-5 top-5 z-[4000] flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-xs font-semibold shadow-lg"><RefreshCw size={14} className="animate-spin" />Actualizando...</div>}

    <PageHeader
      title="Resumen del sistema"
      description={
        <>
          Consumo, medidores y alertas de{" "}
          <strong className="font-semibold text-fg-secondary">{formatearFecha(fecha)}</strong>{" "}
          en Toluca.
        </>
      }
      actions={
        <>
          <div className="flex items-center rounded-xl border border-border bg-surface p-1">
            <button
              type="button"
              onClick={() => cambiarDia(-1)}
              disabled={indiceFecha <= 0}
              aria-label="Día anterior"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 disabled:opacity-35"
            >
              <ChevronLeft aria-hidden="true" size={17} />
            </button>
            <label htmlFor="fecha-resumen" className="sr-only">
              Fecha del resumen
            </label>
            <input
              id="fecha-resumen"
              type="date"
              value={fecha}
              min={fechas[0]}
              max={fechas[fechas.length - 1]}
              onChange={(event) => event.target.value && setFecha(event.target.value)}
              className="h-10 rounded-lg bg-transparent px-2 text-xs font-semibold text-fg outline-none"
            />
            <button
              type="button"
              onClick={() => cambiarDia(1)}
              disabled={indiceFecha < 0 || indiceFecha >= fechas.length - 1}
              aria-label="Día siguiente"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 disabled:opacity-35"
            >
              <ChevronRight aria-hidden="true" size={17} />
            </button>
          </div>

          <label htmlFor="zona-resumen" className="sr-only">
            Zona
          </label>
          <select
            id="zona-resumen"
            value={idZona}
            onChange={(event) => setIdZona(event.target.value)}
            className="h-12 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-fg"
          >
            <option value="">Todas las zonas ({zonas.length})</option>
            {zonas.map((z) => (
              <option key={z.id_zona} value={z.id_zona}>
                {z.nombre}
              </option>
            ))}
          </select>
        </>
      }
      meta={
        diaSeleccionado ? (
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full border border-border bg-surface px-3 py-1 font-medium text-fg-secondary">
              {descripcionDia(diaSeleccionado)}
            </span>
            <span className="rounded-full border border-border bg-surface px-3 py-1 font-medium text-fg-secondary">
              {fmt(Number(diaSeleccionado.temp_min_c), 1)}°C a {fmt(Number(diaSeleccionado.temp_max_c), 1)}°C
            </span>
            <span className="rounded-full border border-border bg-surface px-3 py-1 font-medium text-fg-secondary">
              {fmt(i.lecturas_dia, 0)} lecturas
            </span>
          </div>
        ) : undefined
      }
    />

    {error && <div className="rounded-2xl bg-[var(--color-danger-soft)] p-3 text-xs text-[var(--color-danger-strong)]">{error}</div>}

    <section aria-label="Gráficas de monitoreo energético" className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
      <div className="card flex min-w-0 flex-col p-5" data-testid="grafica-perfil-horario">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-fg)]">
              <Activity aria-hidden="true" size={16} className="text-[var(--color-accent)]" />
              Perfil horario de demanda
            </h2>
            <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">
              {fecha ? formatearFecha(fecha) : "Día seleccionado"} · cinco zonas con mayor consumo
            </p>
          </div>
          <span className="rounded-full bg-[var(--color-accent-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--color-accent-strong)]">
            {perfilHorario.zonas.length} zonas
          </span>
        </div>

        <div
          className="mt-3 h-[210px] min-w-0"
          role="img"
          aria-label={`Perfil horario de demanda con ${perfilHorario.zonas.length} zonas para el día seleccionado`}
        >
          {perfilHorario.filas.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={perfilHorario.filas} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="hora"
                  tick={{ fill: "var(--chart-axis)", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  minTickGap={28}
                />
                <YAxis
                  tick={{ fill: "var(--chart-axis)", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  tickFormatter={(value) => fmt(Number(value), 0)}
                />
                <Tooltip content={<ChartTooltip />} />
                {perfilHorario.zonas.map((zona, index) => (
                  <Line
                    key={zona}
                    type="monotone"
                    dataKey={zona}
                    name={zona}
                    stroke={`var(--chart-${(index % 8) + 1})`}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl bg-[var(--color-surface-2)] text-xs text-[var(--color-muted)]">
              Sin lecturas horarias para el día seleccionado
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {perfilHorario.zonas.map((zona, index) => (
            <span
              key={zona}
              className="flex min-w-0 items-center gap-1.5 text-[10px] text-[var(--color-muted)]"
            >
              <span
                className="h-1 w-3 shrink-0 rounded-full"
                style={{ background: `var(--chart-${(index % 8) + 1})` }}
              />
              <span className="max-w-[14rem] truncate">{zona}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="card flex min-w-0 flex-col p-5" data-testid="grafica-consumo-diario">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-fg)]">
              <BarChart3 aria-hidden="true" size={16} className="text-[var(--chart-2)]" />
              Consumo diario
            </h2>
            <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">
              Últimos 14 días hasta la fecha seleccionada · total del sistema
            </p>
          </div>
          <span className="rounded-full bg-[var(--color-info-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--chart-2)]">
            {serieDiaria.length} días
          </span>
        </div>

        <div
          className="mt-3 h-[210px] min-w-0"
          role="img"
          aria-label={`Consumo diario de los últimos ${serieDiaria.length} días`}
        >
          {serieDiaria.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serieDiaria} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="dia"
                  tick={{ fill: "var(--chart-axis)", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={14}
                />
                <YAxis
                  tick={{ fill: "var(--chart-axis)", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  tickFormatter={(value) => fmt(Number(value), 0)}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-surface-2)" }} />
                <Bar
                  dataKey="consumo"
                  name="Consumo total"
                  fill="var(--chart-2)"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl bg-[var(--color-surface-2)] text-xs text-[var(--color-muted)]">
              Sin consumo diario disponible
            </div>
          )}
        </div>

        <p className="mt-3 text-[10px] text-[var(--color-muted)]">
          {serieDiaria.length
            ? `Promedio diario: ${fmt(
                serieDiaria.reduce((total, dia) => total + dia.consumo, 0) / serieDiaria.length,
              )} kWh`
            : "La serie se habilitará cuando existan lecturas en el periodo."}
        </p>
      </div>
    </section>

    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Consumo del Día" value={`${fmt(i.consumo_dia_kwh)} kWh`} sub={formatearFecha(fecha)} icon={Zap} color="var(--color-accent)" bg="var(--color-accent-soft)" trend={data.comparacion_periodo.variacion_porcentual} />
      <StatCard label="Medidores Monitoreados" value={fmt(i.total_medidores, 0)} sub="Registros totales" icon={Home} color="var(--chart-2)" bg="var(--color-info-soft)" />
      <StatCard label="Medidores Activos" value={fmt(i.medidores_activos, 0)} sub={`de ${i.total_medidores} totales`} icon={Activity} color="var(--color-success)" bg="var(--color-success-soft)" />
      <StatCard label="Lecturas del Día" value={fmt(i.lecturas_dia, 0)} sub={formatearFecha(fecha)} icon={BookOpen} color="var(--color-warning)" bg="var(--color-warning-soft)" />
    </div>

    <MapModule onZonaSeleccionada={abrirModalPorNombre} />
  </div>;
}



