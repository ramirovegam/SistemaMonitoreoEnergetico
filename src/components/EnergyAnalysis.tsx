import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertCircle,
  CalendarRange,
  Check,
  ChevronRight,
  Clock3,
  Gauge,
  MapPin,
  RefreshCw,
  Search,
  Server,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import {
  obtenerLecturas,
  obtenerMedidoresAnalisis,
  obtenerPerfilHorario,
  obtenerPeriodos,
  obtenerResumenAnalisis,
  type LecturaEnergetica,
  type MedidorAnalisis,
  type PerfilHorario,
  type PeriodoFacturacion,
  type ResumenAnalisis,
} from "../services/analisisEnergeticoService";

const fmt = (value: number, digits = 2): string =>
  value.toLocaleString("es-MX", { maximumFractionDigits: digits });

const formatDateTime = (value: string | null): string =>
  value
    ? new Date(value).toLocaleString("es-MX", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Sin datos";

const formatDate = (value: string): string => {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const DAY_OPTIONS = [
  { value: "H", label: "Laboral" },
  { value: "S", label: "Sábado" },
  { value: "D", label: "Domingo" },
];

const tipoDiaLabel = (value: string): string =>
  DAY_OPTIONS.find((item) => item.value === value)?.label ?? `Tipo ${value}`;

interface TooltipPayloadItem {
  name?: string;
  value?: number;
  color?: string;
  dataKey?: string;
}
interface ChartTooltipProps {
  active?: boolean;
  label?: string;
  payload?: TooltipPayloadItem[];
  suffix?: string;
}

function ChartTooltip({
  active,
  label,
  payload,
  suffix = "kWh",
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const real = payload.find((item) => item.dataKey === "real")?.value;
  const estimated = payload.find((item) => item.dataKey === "estimado")?.value;
  const difference =
    real !== undefined && estimated !== undefined ? real - estimated : null;
  return (
    <div className="min-w-44 rounded-2xl border border-white/70 bg-[#171827]/95 p-3 text-white shadow-2xl backdrop-blur-xl">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/50">
        {label}
      </p>
      <div className="space-y-1.5">
        {payload.map((item) => (
          <div
            key={item.dataKey ?? item.name}
            className="flex items-center justify-between gap-5 text-xs"
          >
            <span className="flex items-center gap-2 text-white/65">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {item.name}
            </span>
            <strong>
              {fmt(Number(item.value ?? 0))} {suffix}
            </strong>
          </div>
        ))}
      </div>
      {difference !== null && (
        <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2 text-[11px]">
          <span className="text-white/55">Diferencia</span>
          <span
            className={difference > 0 ? "text-orange-300" : "text-emerald-300"}
          >
            {difference > 0 ? "+" : ""}
            {fmt(difference)} {suffix}
          </span>
        </div>
      )}
    </div>
  );
}

function SkeletonDashboard() {
  return (
    <div className="space-y-5" aria-label="Cargando análisis energético">
      <div className="h-40 animate-pulse rounded-3xl bg-white" />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-white" />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-3xl bg-white" />
    </div>
  );
}

export default function EnergyAnalysis() {
  const [medidores, setMedidores] = useState<MedidorAnalisis[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tipoDia, setTipoDia] = useState("H");
  const [meterSearch, setMeterSearch] = useState("");
  const [showMeterResults, setShowMeterResults] = useState(false);
  const [lecturas, setLecturas] = useState<LecturaEnergetica[]>([]);
  const [perfil, setPerfil] = useState<PerfilHorario[]>([]);
  const [periodos, setPeriodos] = useState<PeriodoFacturacion[]>([]);
  const [resumen, setResumen] = useState<ResumenAnalisis | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => medidores.find((item) => item.id_medidor === selectedId) ?? null,
    [medidores, selectedId],
  );

  const filteredMeters = useMemo(() => {
    const query = meterSearch.trim().toLowerCase();
    if (!query) return medidores.slice(0, 25);
    return medidores
      .filter((item) =>
        [
          item.numero_serie,
          item.servicio_rpu,
          item.servicio_nombre,
          item.zona_nombre,
          String(item.id_medidor),
        ].some((value) => value.toLowerCase().includes(query)),
      )
      .slice(0, 30);
  }, [medidores, meterSearch]);

  const cargarCatalogo = async (): Promise<void> => {
    try {
      setCatalogLoading(true);
      setError(null);
      const data = await obtenerMedidoresAnalisis();
      setMedidores(data);
      setSelectedId((current) => current ?? data[0]?.id_medidor ?? null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo cargar el catálogo.",
      );
    } finally {
      setCatalogLoading(false);
    }
  };

  useEffect(() => {
    void cargarCatalogo();
  }, []);

  useEffect(() => {
    const closeResults = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      )
        setShowMeterResults(false);
    };
    document.addEventListener("mousedown", closeResults);
    return () => document.removeEventListener("mousedown", closeResults);
  }, []);

  const cargarDatos = async (): Promise<void> => {
    if (!selected) return;
    try {
      setAnalysisLoading(true);
      setError(null);
      const [lecturasData, resumenData, perfilData, periodosData] =
        await Promise.all([
          obtenerLecturas(selected.id_medidor),
          obtenerResumenAnalisis(selected.id_medidor),
          obtenerPerfilHorario(selected.id_tipo_servicio, tipoDia),
          obtenerPeriodos(selected.id_servicio),
        ]);
      setLecturas(lecturasData);
      setResumen(resumenData);
      setPerfil(perfilData);
      setPeriodos(periodosData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudieron cargar los datos.",
      );
    } finally {
      setAnalysisLoading(false);
    }
  };

  useEffect(() => {
    void cargarDatos();
  }, [selected, tipoDia]);

  const lecturaChart = useMemo(
    () =>
      lecturas.map((item) => ({
        fecha: new Date(item.ts).toLocaleString("es-MX", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }),
        real: item.consumo_real_kwh,
        estimado: item.consumo_kwh,
      })),
    [lecturas],
  );

  const perfilChart = useMemo(
    () =>
      perfil.map((item) => ({
        hora: `${String(item.hora).padStart(2, "0")}:00`,
        factor: item.factor,
      })),
    [perfil],
  );
  const periodosChart = useMemo(
    () =>
      [...periodos]
        .reverse()
        .map((item, index) => ({
          periodo: item.folio,
          consumo: item.consumo_real_kwh,
          latest: index === periodos.length - 1,
        })),
    [periodos],
  );
  const averageReading = resumen?.consumo_promedio_kwh ?? 0;
  const maxReading = resumen?.consumo_maximo_kwh ?? 0;
  const maxRatio = averageReading > 0 ? maxReading / averageReading : 0;
  const latestConsumption = periodosChart.at(-1)?.consumo ?? 0;
  const previousConsumption = periodosChart.at(-2)?.consumo ?? 0;
  const periodChange = previousConsumption
    ? ((latestConsumption - previousConsumption) / previousConsumption) * 100
    : 0;

  if (catalogLoading && medidores.length === 0) return <SkeletonDashboard />;

  const kpis = [
    {
      label: "Consumo total",
      value: `${fmt(resumen?.consumo_total_kwh ?? 0)} kWh`,
      icon: Zap,
      color: "#f97316",
      soft: "#fff1e7",
      accent: "from-orange-400 to-orange-600",
      note: "Energía acumulada",
    },
    {
      label: "Promedio por lectura",
      value: `${fmt(averageReading)} kWh`,
      icon: Gauge,
      color: "#10b981",
      soft: "#ecfdf5",
      accent: "from-emerald-400 to-emerald-600",
      note: "Comportamiento medio",
    },
    {
      label: "Consumo máximo",
      value: `${fmt(maxReading)} kWh`,
      icon: TrendingUp,
      color: "#ef4444",
      soft: "#fef2f2",
      accent: "from-red-400 to-red-600",
      note: formatDateTime(resumen?.hora_maximo ?? null),
    },
    {
      label: "Lecturas analizadas",
      value: fmt(resumen?.total_lecturas ?? 0, 0),
      icon: Activity,
      color: "#6366f1",
      soft: "#eef2ff",
      accent: "from-indigo-400 to-indigo-600",
      note: "Registros procesados",
    },
  ];

  return (
    <div className="relative flex flex-col gap-6">
      <div className="pointer-events-none absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full bg-orange-100/50 blur-3xl" />

      <section className="relative overflow-hidden rounded-3xl bg-[#171827] p-5 text-white shadow-xl sm:p-7">
        <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-28 w-28 rounded-full bg-indigo-500/15 blur-2xl" />
        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-950/30">
              <Zap size={22} fill="currentColor" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">
                Inteligencia energética
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                Análisis Energético
              </h1>
              {selected ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/65">
                  <span className="rounded-full bg-white/10 px-3 py-1.5 font-semibold text-white">
                    {selected.numero_serie}
                  </span>
                  <span>RPU {selected.servicio_rpu}</span>
                  <span className="text-white/25">•</span>
                  <span>{selected.tipo_servicio_nombre}</span>
                  <span className="text-white/25">•</span>
                  <span className="flex items-center gap-1">
                    <MapPin size={11} />
                    {selected.zona_nombre}
                  </span>
                </div>
              ) : (
                <p className="mt-2 text-sm text-white/50">
                  Selecciona un medidor para comenzar.
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void cargarDatos()}
            disabled={!selected || analysisLoading}
            className="flex w-fit items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-bold backdrop-blur transition hover:bg-white/15 disabled:opacity-50"
          >
            <RefreshCw
              size={14}
              className={analysisLoading ? "animate-spin" : ""}
            />
            {analysisLoading ? "Actualizando" : "Actualizar datos"}
          </button>
        </div>
      </section>

      {error && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-xs text-red-700">
          <span className="flex items-center gap-2">
            <AlertCircle size={15} />
            {error}
          </span>
          <button type="button" onClick={() => setError(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      <section className="rounded-3xl border border-[#e8eaf1] bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div ref={searchRef} className="relative">
            <label
              htmlFor="meter-search"
              className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-[#9098b1]"
            >
              Medidor a analizar
            </label>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9098b1]"
              />
              <input
                id="meter-search"
                value={meterSearch}
                onFocus={() => setShowMeterResults(true)}
                onChange={(e) => {
                  setMeterSearch(e.target.value);
                  setShowMeterResults(true);
                }}
                placeholder={
                  selected?.numero_serie ??
                  "Buscar por serie, RPU, servicio o zona..."
                }
                className="w-full rounded-xl border border-[#e5e7ef] bg-[#fafbfc] py-3 pl-10 pr-10 text-sm outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-50"
              />
              {meterSearch && (
                <button
                  type="button"
                  onClick={() => setMeterSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a3a9ba]"
                >
                  <X size={15} />
                </button>
              )}
            </div>
            {showMeterResults && (
              <div className="absolute left-0 right-0 z-40 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-[#e5e7ef] bg-white p-2 shadow-2xl">
                <div className="flex items-center justify-between px-2 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#9098b1]">
                    Medidores disponibles
                  </span>
                  <span className="rounded-full bg-[#f2f3f7] px-2 py-0.5 text-[9px] font-bold text-[#747b91]">
                    {filteredMeters.length}
                  </span>
                </div>
                {filteredMeters.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#9098b1]">
                    No se encontraron medidores
                  </div>
                ) : (
                  filteredMeters.map((item) => {
                    const active = item.id_medidor === selectedId;
                    return (
                      <button
                        type="button"
                        key={item.id_medidor}
                        onClick={() => {
                          setSelectedId(item.id_medidor);
                          setMeterSearch("");
                          setShowMeterResults(false);
                        }}
                        className={`group flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${active ? "bg-orange-50" : "hover:bg-[#f8f9fc]"}`}
                      >
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${active ? "bg-orange-500 text-white" : "bg-indigo-50 text-indigo-600"}`}
                        >
                          <Server size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-xs font-bold text-[#1a1a2e]">
                              {item.numero_serie}
                            </p>
                            {active && (
                              <Check size={13} className="text-orange-500" />
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-[10px] text-[#747b91]">
                            RPU {item.servicio_rpu} · {item.servicio_nombre}
                          </p>
                          <p className="mt-0.5 truncate text-[10px] text-[#adb2c1]">
                            {item.zona_nombre} · {item.tipo_servicio_nombre}
                          </p>
                        </div>
                        <ChevronRight
                          size={14}
                          className="text-[#c2c6d2] transition group-hover:translate-x-0.5 group-hover:text-orange-500"
                        />
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#9098b1]">
              Perfil del día
            </p>
            <div className="inline-flex w-full rounded-xl border border-[#e5e7ef] bg-[#fafbfc] p-1 lg:w-auto">
              {DAY_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => setTipoDia(option.value)}
                  className={`flex-1 rounded-lg px-4 py-2 text-xs font-bold transition lg:flex-none ${tipoDia === option.value ? "bg-[#171827] text-white shadow-sm" : "text-[#9098b1] hover:text-[#1a1a2e]"}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        className={`grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 ${analysisLoading ? "pointer-events-none opacity-55" : ""}`}
      >
        {kpis.map((item) => (
          <article
            key={item.label}
            className="group relative overflow-hidden rounded-2xl border border-[#e8eaf1] bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
          >
            <div
              className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${item.accent}`}
            />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium text-[#9098b1]">
                  {item.label}
                </p>
                <p className="mt-2 text-xl font-bold tracking-tight text-[#1a1a2e]">
                  {item.value}
                </p>
              </div>
              <div
                className="flex h-10 w-10 items-center justify-center rounded-2xl transition group-hover:scale-110"
                style={{ backgroundColor: item.soft, color: item.color }}
              >
                <item.icon size={17} />
              </div>
            </div>
            <p className="mt-3 truncate border-t border-[#f0f1f5] pt-3 text-[10px] text-[#a0a6b7]">
              {item.note}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="rounded-3xl border border-[#e8eaf1] bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-orange-500 shadow-[0_0_0_4px_#fff1e7]" />
                <h2 className="text-sm font-bold text-[#1a1a2e]">
                  Lecturas de consumo
                </h2>
              </div>
              <p className="mt-1 text-[11px] text-[#9098b1]">
                Comparación entre consumo real y estimado
              </p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-semibold text-[#747b91]">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-orange-500" />
                Real
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 bg-indigo-500" />
                Estimado
              </span>
            </div>
          </div>
          {lecturaChart.length ? (
            <ResponsiveContainer width="100%" height={330}>
              <AreaChart data={lecturaChart} margin={{ left: -18, right: 8 }}>
                <defs>
                  <linearGradient id="realGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.34} />
                    <stop
                      offset="100%"
                      stopColor="#f97316"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#f0f1f7" />
                <XAxis
                  dataKey="fecha"
                  tick={{ fontSize: 9, fill: "#9098b1" }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={34}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "#9098b1" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <ReferenceLine
                  y={averageReading}
                  stroke="#10b981"
                  strokeDasharray="4 5"
                />
                <Area
                  type="monotone"
                  dataKey="real"
                  stroke="#f97316"
                  strokeWidth={3}
                  fill="url(#realGradient)"
                  name="Consumo real"
                  activeDot={{
                    r: 5,
                    fill: "#f97316",
                    stroke: "white",
                    strokeWidth: 3,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="estimado"
                  stroke="#6366f1"
                  strokeWidth={2}
                  strokeDasharray="6 5"
                  fill="transparent"
                  name="Estimado"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[330px] items-center justify-center rounded-2xl bg-[#fafbfc] text-xs text-[#9098b1]">
              No hay lecturas disponibles
            </div>
          )}
        </div>

        <aside className="rounded-3xl border border-[#e8eaf1] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1a1a2e]">
                Resumen del análisis
              </h3>
              <p className="text-[10px] text-[#9098b1]">
                Indicadores destacados
              </p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            <div
              className={`rounded-2xl border p-3 ${maxRatio > 2 ? "border-amber-100 bg-amber-50" : "border-emerald-100 bg-emerald-50"}`}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#747b91]">
                Pico de consumo
              </p>
              <p className="mt-1 text-xs font-semibold text-[#30364a]">
                El máximo es {fmt(maxRatio, 1)}× el promedio.
              </p>
            </div>
            <div
              className={`rounded-2xl border p-3 ${periodChange > 0 ? "border-orange-100 bg-orange-50" : "border-emerald-100 bg-emerald-50"}`}
            >
              <div className="flex items-center gap-2">
                {periodChange > 0 ? (
                  <TrendingUp size={14} className="text-orange-500" />
                ) : (
                  <TrendingDown size={14} className="text-emerald-500" />
                )}
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#747b91]">
                  Último periodo
                </p>
              </div>
              <p className="mt-1 text-xs font-semibold text-[#30364a]">
                {periodChange > 0 ? "Aumentó" : "Disminuyó"}{" "}
                {fmt(Math.abs(periodChange), 1)}% respecto al anterior.
              </p>
            </div>
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-3">
              <div className="flex items-center gap-2">
                <Clock3 size={14} className="text-indigo-500" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#747b91]">
                  Máximo registrado
                </p>
              </div>
              <p className="mt-1 text-xs font-semibold text-[#30364a]">
                {formatDateTime(resumen?.hora_maximo ?? null)}
              </p>
            </div>
          </div>
        </aside>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-[#e8eaf1] bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-[#1a1a2e]">Perfil horario</h3>
            <p className="mt-1 text-[11px] text-[#9098b1]">
              Patrón esperado para un día {tipoDiaLabel(tipoDia).toLowerCase()}
            </p>
          </div>
          {perfilChart.length === 0 ? (
            <div className="flex h-[250px] flex-col items-center justify-center rounded-2xl bg-[#fafbfc] text-center">
              <Gauge size={28} className="text-[#b0b6c8]" />
              <p className="mt-3 text-sm font-semibold text-[#606881]">
                Sin perfil disponible
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={perfilChart} margin={{ left: -20, right: 8 }}>
                <CartesianGrid vertical={false} stroke="#f0f1f7" />
                <XAxis
                  dataKey="hora"
                  tick={{ fontSize: 9, fill: "#9098b1" }}
                  interval={2}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "#9098b1" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<ChartTooltip suffix="" />} />
                <Line
                  type="monotone"
                  dataKey="factor"
                  stroke="#6366f1"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{
                    r: 5,
                    fill: "#6366f1",
                    stroke: "white",
                    strokeWidth: 3,
                  }}
                  name="Factor"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="rounded-3xl border border-[#e8eaf1] bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-[#1a1a2e]">
              Comparación de periodos
            </h3>
            <p className="mt-1 text-[11px] text-[#9098b1]">
              Consumo real por periodo de facturación
            </p>
          </div>
          {periodosChart.length ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={periodosChart} margin={{ left: -18, right: 8 }}>
                <CartesianGrid vertical={false} stroke="#f0f1f7" />
                <XAxis
                  dataKey="periodo"
                  tick={{ fontSize: 9, fill: "#9098b1" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "#9098b1" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="consumo" name="Consumo" radius={[7, 7, 0, 0]}>
                  {periodosChart.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.latest ? "#f97316" : "#a5b4fc"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[250px] items-center justify-center rounded-2xl bg-[#fafbfc] text-xs text-[#9098b1]">
              No hay periodos disponibles
            </div>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-[#e8eaf1] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#f0f1f7] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <CalendarRange size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1a1a2e]">
                Periodos de facturación
              </h3>
              <p className="text-[10px] text-[#9098b1]">
                Histórico de consumo y clasificación
              </p>
            </div>
          </div>
          <span className="rounded-full bg-[#f2f3f7] px-2.5 py-1 text-[10px] font-bold text-[#747b91]">
            {periodos.length} periodos
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-xs">
            <thead className="bg-[#fafbfc] text-[10px] font-bold uppercase tracking-wider text-[#9098b1]">
              <tr>
                <th className="px-5 py-3">Folio</th>
                <th>Periodo</th>
                <th>Tarifa</th>
                <th className="text-right">Consumo</th>
                <th className="px-5 text-right">Clasificación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f1f7]">
              {periodos.map((item) => (
                <tr
                  key={item.id_periodo}
                  className="transition hover:bg-[#fafaff]"
                >
                  <td className="px-5 py-4 font-bold text-[#30364a]">
                    {item.folio}
                  </td>
                  <td>
                    <p className="font-semibold text-[#606881]">
                      {formatDate(item.fecha_inicio)}{" "}
                      <span className="mx-1 text-[#c2c6d2]">→</span>{" "}
                      {formatDate(item.fecha_fin)}
                    </p>
                  </td>
                  <td>
                    <span className="rounded-lg bg-indigo-50 px-2.5 py-1 font-bold text-indigo-700">
                      {item.tarifa_codigo}
                    </span>
                  </td>
                  <td className="text-right">
                    <span className="font-bold text-[#1a1a2e]">
                      {fmt(item.consumo_real_kwh)}
                    </span>{" "}
                    <span className="text-[10px] text-[#9098b1]">kWh</span>
                  </td>
                  <td className="px-5 text-right">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${item.clasificacion_dac ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${item.clasificacion_dac ? "bg-red-500" : "bg-emerald-500"}`}
                      />
                      {item.clasificacion_dac ? "DAC" : "Normal"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
