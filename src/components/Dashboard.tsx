import { useCallback, useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  Bell,
  BookOpen,
  CalendarDays,
  Home,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  obtenerDashboard,
  type DashboardData,
} from "../services/dashboardService";
import { obtenerZonas, type Zona } from "../services/zonasService";
import {
  obtenerCalendario,
  type CalendarioDia,
} from "../services/calendarioService";
import MapModule from "./MapModule";

const COLORS = ["#ff8a1f", "#6366f1", "#10b981", "#f59e0b", "#06b6d4"];

const fmt = (numero: number, digitos = 2): string =>
  numero.toLocaleString("es-MX", { maximumFractionDigits: digitos });

function fechaLocal(valor: string): Date {
  const [anio, mes, dia] = valor.slice(0, 10).split("-").map(Number);
  return new Date(anio, mes - 1, dia);
}

function formatearFecha(valor: string): string {
  if (!valor) return "Sin fecha";
  return fechaLocal(valor).toLocaleDateString("es-MX", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function descripcionDia(dia: CalendarioDia): string {
  const etiquetas: string[] = [];
  if (dia.es_festivo) etiquetas.push("Festivo");
  if (dia.es_vacacional) etiquetas.push("Vacacional");
  if (!etiquetas.length) etiquetas.push(`Tipo ${dia.tipo_dia.trim()}`);
  return etiquetas.join(" · ");
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  bg,
  trend,
}: {
  label: string;
  value: string;
  sub: string;
  icon: ComponentType<{ size?: number; color?: string }>;
  color: string;
  bg: string;
  trend?: number | null;
}) {
  return (
    <div className="card relative flex flex-col gap-3 overflow-hidden p-5">
      <div
        className="blob h-24 w-24 opacity-40"
        style={{ background: bg, top: -20, right: -20 }}
      />
      <div className="relative flex items-start justify-between">
        <div className="rounded-2xl p-3" style={{ background: bg }}>
          <Icon size={20} color={color} />
        </div>
        {trend !== undefined && trend !== null && (
          <div
            className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium ${
              trend >= 0
                ? "bg-[#ecfdf5] text-[#10b981]"
                : "bg-[#fef2f2] text-[#ef4444]"
            }`}
          >
            {trend >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {trend >= 0 ? "+" : ""}
            {fmt(trend)}%
          </div>
        )}
      </div>
      <div className="relative">
        <p className="mb-1 text-[11px] font-medium text-[#9098b1]">{label}</p>
        <p
          className="text-2xl font-bold text-[#1a1a2e]"
          style={{ fontFamily: "Nunito, sans-serif" }}
        >
          {value}
        </p>
        <p className="mt-0.5 text-[11px] text-[#9098b1]">{sub}</p>
      </div>
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-[#f0f1f7] bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-[#9098b1]">{label}</p>
      {payload.map((item, index) => (
        <p
          key={`${item.name}-${index}`}
          style={{ color: item.color }}
          className="font-medium"
        >
          {item.name}: {fmt(Number(item.value ?? 0))}
        </p>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [calendario, setCalendario] = useState<CalendarioDia[]>([]);
  const [fecha, setFecha] = useState("");
  const [idZona, setIdZona] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingFiltros, setLoadingFiltros] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const diaSeleccionado = useMemo(
    () => calendario.find((dia) => dia.fecha.slice(0, 10) === fecha),
    [calendario, fecha],
  );

  const cargarFiltros = useCallback(async (): Promise<void> => {
    try {
      setLoadingFiltros(true);
      setError(null);

      const [listaZonas, listaCalendario] = await Promise.all([
        obtenerZonas(),
        obtenerCalendario(),
      ]);

      const ordenado = [...listaCalendario].sort((a, b) =>
        a.fecha.localeCompare(b.fecha),
      );

      setZonas(listaZonas);
      setCalendario(ordenado);

      if (ordenado.length) {
        setFecha(
          (actual) =>
            actual || ordenado[ordenado.length - 1].fecha.slice(0, 10),
        );
      } else {
        setError("El calendario no contiene fechas disponibles.");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los filtros.",
      );
    } finally {
      setLoadingFiltros(false);
    }
  }, []);

  const cargar = useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      if (!fecha) return;

      try {
        setLoading(true);
        setError(null);

        const respuesta = await obtenerDashboard(
          {
            fecha,
            idZona: idZona ? Number(idZona) : undefined,
            limiteTop: 10,
          },
          signal,
        );

        setData(respuesta);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo cargar el dashboard.",
        );
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [fecha, idZona],
  );

  useEffect(() => {
    void cargarFiltros();
  }, [cargarFiltros]);

  useEffect(() => {
    if (!fecha) return;
    const controller = new AbortController();
    void cargar(controller.signal);
    return () => controller.abort();
  }, [cargar, fecha]);

  const hourlyData = useMemo(() => {
    if (!data) return [];
    const mapa = new Map<string, Record<string, string | number>>();

    for (const item of data.perfil_horario_zonas) {
      const hora = new Date(item.periodo).toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const fila = mapa.get(hora) ?? { hora };
      fila[item.zona_nombre] = item.consumo_kwh;
      mapa.set(hora, fila);
    }

    return [...mapa.values()];
  }, [data]);

  if (loadingFiltros && !calendario.length) {
    return (
      <div className="card p-8 text-center text-sm text-[#9098b1]">
        Cargando zonas y calendario...
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="card p-8 text-center text-sm text-[#9098b1]">
        Cargando dashboard...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-[#ef4444]">
          {error ?? "No hay datos disponibles."}
        </p>
        <button
          type="button"
          onClick={() => void cargarFiltros()}
          className="mt-3 rounded-xl bg-[#ff8a1f] px-4 py-2 text-xs text-white"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const indicadores = data.indicadores;
  const zoneNames = [
    ...new Set(data.perfil_horario_zonas.map((item) => item.zona_nombre)),
  ];
  const consumoDiario = data.consumo_diario_mes.map((item) => ({
    day: new Date(item.periodo).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "2-digit",
    }),
    total: item.consumo_kwh,
  }));
  const promedioZona = data.consumo_por_zona.length
    ? data.consumo_por_zona.reduce(
        (suma, item) => suma + item.consumo_kwh,
        0,
      ) / data.consumo_por_zona.length
    : 0;

  return (
    <div className="relative flex flex-col gap-6">
      {loading && data && (
        <div className="pointer-events-none absolute inset-0 z-[2000] flex items-start justify-center bg-white/20 pt-5 backdrop-blur-[1px]">
          <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#606881] shadow-lg">
            <RefreshCw size={14} className="animate-spin" />
            Actualizando datos...
          </div>
        </div>
      )}

      <div
        className="card relative overflow-hidden p-6"
        style={{
          background: "linear-gradient(135deg, #ff8a1f 0%, #ffb347 100%)",
        }}
      >
        <div
          className="blob h-40 w-40 bg-white opacity-10"
          style={{ top: -30, right: -20 }}
        />
        <div
          className="blob h-24 w-24 bg-white opacity-10"
          style={{ bottom: -10, right: 80 }}
        />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="mb-1 text-sm font-medium text-white/80">
              Sistema de Monitoreo Energético
            </p>
            <h1
              className="text-2xl font-bold text-white"
              style={{ fontFamily: "Nunito, sans-serif" }}
            >
              Resumen del Sistema
            </h1>
            <p className="mt-1 text-sm text-white/70">
              Toluca Smart City · {formatearFecha(fecha)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <CalendarDays
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#ff8a1f]"
              />
              <select
                value={fecha}
                onChange={(event) => setFecha(event.target.value)}
                disabled={loadingFiltros || !calendario.length}
                aria-label="Fecha del calendario"
                className="min-w-[245px] rounded-xl border border-white/70 bg-white py-2.5 pl-9 pr-4 text-xs font-semibold text-[#1a1a2e] outline-none disabled:opacity-60"
              >
                {!calendario.length && (
                  <option value="">Sin fechas disponibles</option>
                )}
                {calendario.map((dia) => (
                  <option key={dia.fecha} value={dia.fecha.slice(0, 10)}>
                    {formatearFecha(dia.fecha)} · {descripcionDia(dia)}
                  </option>
                ))}
              </select>
            </div>

            <select
              value={idZona}
              onChange={(event) => setIdZona(event.target.value)}
              aria-label="Zona"
              className="min-w-[210px] rounded-xl border border-white/70 bg-white px-4 py-2.5 text-xs font-semibold text-[#1a1a2e] outline-none"
            >
              <option value="">Todas las zonas ({zonas.length})</option>
              {zonas.map((zona) => (
                <option key={zona.id_zona} value={zona.id_zona}>
                  {zona.nombre}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => void cargar()}
              disabled={loading || !fecha}
              aria-label="Actualizar dashboard"
              className="rounded-xl bg-white/20 p-2.5 text-white disabled:opacity-60"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {diaSeleccionado && (
          <div className="relative mt-4 flex flex-wrap gap-2 text-[11px] text-white/90">
            <span className="rounded-full bg-white/15 px-3 py-1.5">
              {descripcionDia(diaSeleccionado)}
            </span>
            <span className="rounded-full bg-white/15 px-3 py-1.5">
              Temperatura {fmt(Number(diaSeleccionado.temp_min_c), 1)}°C a{" "}
              {fmt(Number(diaSeleccionado.temp_max_c), 1)}°C
            </span>
            <span className="rounded-full bg-white/15 px-3 py-1.5">
              Factor estacional{" "}
              {fmt(Number(diaSeleccionado.factor_estacional), 4)}
            </span>
          </div>
        )}

        <div className="relative mt-4 flex flex-wrap gap-6">
          {[
            {
              label: "Consumo del día",
              value: `${fmt(indicadores.consumo_dia_kwh)} kWh`,
            },
            {
              label: "Medidores activos",
              value: String(indicadores.medidores_activos),
            },
            {
              label: "Alertas activas",
              value: String(indicadores.alertas_activas),
            },
          ].map((resumen) => (
            <div key={resumen.label}>
              <p className="text-xl font-bold text-white">{resumen.value}</p>
              <p className="text-xs text-white/70">{resumen.label}</p>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-[#fef2f2] p-3 text-xs text-[#b91c1c]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label="Consumo del Día"
          value={`${fmt(indicadores.consumo_dia_kwh)} kWh`}
          sub={formatearFecha(fecha)}
          icon={Zap}
          color="#ff8a1f"
          bg="#fff4ea"
          trend={data.comparacion_periodo.variacion_porcentual}
        />
        <StatCard
          label="Acumulado del Mes"
          value={`${fmt(indicadores.consumo_mes_kwh)} kWh`}
          sub={`Hasta ${formatearFecha(fecha)}`}
          icon={CalendarDays}
          color="#06b6d4"
          bg="#ecfeff"
        />
        <StatCard
          label="Medidores Monitoreados"
          value={fmt(indicadores.total_medidores, 0)}
          sub="Registros totales"
          icon={Home}
          color="#6366f1"
          bg="#eef2ff"
        />
        <StatCard
          label="Medidores Activos"
          value={fmt(indicadores.medidores_activos, 0)}
          sub={`de ${indicadores.total_medidores} totales`}
          icon={Activity}
          color="#10b981"
          bg="#ecfdf5"
        />
        <StatCard
          label="Alertas Activas"
          value={fmt(indicadores.alertas_activas, 0)}
          sub="A la fecha seleccionada"
          icon={Bell}
          color="#ef4444"
          bg="#fef2f2"
        />
        <StatCard
          label="Lecturas del Día"
          value={fmt(indicadores.lecturas_dia, 0)}
          sub={formatearFecha(fecha)}
          icon={BookOpen}
          color="#f59e0b"
          bg="#fffbeb"
        />
        <StatCard
          label="Consumo Prom./Zona"
          value={`${fmt(promedioZona)} kWh`}
          sub="Fecha y zona seleccionadas"
          icon={TrendingUp}
          color="#ff8a1f"
          bg="#fff4ea"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-[#1a1a2e]">
            Perfil Horario de Demanda
          </h3>
          <p className="mb-4 text-[11px] text-[#9098b1]">
            Zonas con mayor consumo · fecha seleccionada
          </p>
          {hourlyData.length ? (
            <>
              <ResponsiveContainer width="100%" height={190}>
                <LineChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f1f7" />
                  <XAxis
                    dataKey="hora"
                    tick={{ fill: "#9098b1", fontSize: 10 }}
                    interval={3}
                  />
                  <YAxis tick={{ fill: "#9098b1", fontSize: 10 }} />
                  <Tooltip content={<ChartTooltip />} />
                  {zoneNames.map((zona, index) => (
                    <Line
                      key={zona}
                      type="monotone"
                      dataKey={zona}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-2 flex flex-wrap gap-4">
                {zoneNames.map((zona, index) => (
                  <span
                    key={zona}
                    className="flex items-center gap-1.5 text-[11px] text-[#9098b1]"
                  >
                    <span
                      className="inline-block h-1 w-3 rounded-full"
                      style={{ background: COLORS[index % COLORS.length] }}
                    />
                    {zona}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-[190px] items-center justify-center text-xs text-[#9098b1]">
              Sin lecturas horarias para esta fecha
            </div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-[#1a1a2e]">
            Consumo Diario
          </h3>
          <p className="mb-4 text-[11px] text-[#9098b1]">
            Acumulado del mes hasta la fecha seleccionada
          </p>
          {consumoDiario.length ? (
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={consumoDiario}>
                <defs>
                  <linearGradient id="ogReal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff8a1f" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ff8a1f" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f1f7" />
                <XAxis
                  dataKey="day"
                  tick={{ fill: "#9098b1", fontSize: 10 }}
                />
                <YAxis tick={{ fill: "#9098b1", fontSize: 10 }} />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#ff8a1f"
                  fill="url(#ogReal)"
                  strokeWidth={2}
                  name="Total kWh"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[190px] items-center justify-center text-xs text-[#9098b1]">
              Sin consumo diario para esta fecha
            </div>
          )}
        </div>
      </div>

      <MapModule />

      <div className="card p-5">
        <h3 className="mb-4 text-sm font-semibold text-[#1a1a2e]">
          Consumo por Zona
        </h3>
        <div className="flex max-h-96 flex-col gap-4 overflow-y-auto pr-1">
          {data.consumo_por_zona.map((zona, index) => (
            <div key={zona.id_zona}>
              <div className="mb-1.5 flex justify-between text-xs">
                <span className="font-medium text-[#1a1a2e]">
                  Zona {zona.zona_nombre}
                </span>
                <span className="text-[#9098b1]">
                  {fmt(zona.consumo_kwh)} kWh ·{" "}
                  <span
                    className="font-semibold"
                    style={{ color: COLORS[index % COLORS.length] }}
                  >
                    {zona.porcentaje.toFixed(1)}%
                  </span>
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${zona.porcentaje}%`,
                    background: COLORS[index % COLORS.length],
                  }}
                />
              </div>
            </div>
          ))}
          {!data.consumo_por_zona.length && (
            <p className="py-6 text-center text-xs text-[#9098b1]">
              Sin consumo por zona para esta fecha
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
