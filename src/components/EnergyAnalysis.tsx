import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertCircle,
  BarChart3,
  CalendarDays,
  Clock3,
  Gauge,
  MapPin,
  RefreshCw,
  Search,
  Server,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const MONTHS = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
];

const DAY_TYPES = [
  { value: "todos", label: "Todos" },
  { value: "laborable", label: "Laborable" },
  { value: "fin_semana", label: "Fin de semana" },
  { value: "festivo", label: "Festivo" },
] as const;

type DayType = (typeof DAY_TYPES)[number]["value"];
type IconComponent = typeof Activity;

interface Meter {
  id_medidor: number;
  id_servicio: number;
  numero_serie: string;
  id_zona: number;
  zona_nombre: string;
  id_tipo_servicio: number;
  tipo_servicio_nombre: string;
  servicio_nombre: string;
  rpu: string;
}

interface HourPoint {
  hora: number;
  consumo_real_kwh: number;
  consumo_estimado_kwh: number;
  lecturas: number;
}

interface MonthPoint {
  mes: number;
  nombre_mes: string;
  consumo_total_kwh: number;
  promedio_diario_kwh: number;
  lecturas: number;
}

interface HeatCell {
  dia_semana: number;
  nombre_dia: string;
  hora: number;
  consumo_promedio_kwh: number;
  lecturas: number;
}

interface AnalysisSummary {
  consumo_total_kwh: number;
  consumo_anterior_kwh: number;
  variacion_pct: number;
  promedio_por_lectura_kwh: number;
  promedio_diario_kwh: number;
  pico_horario_kwh: number;
  hora_pico: number | null;
  lecturas: number;
  medidores: number;
  servicios: number;
}

interface AnalysisResponse {
  mes: number;
  anio: number;
  tipo_dia: DayType;
  resumen: AnalysisSummary;
  curva_horaria: HourPoint[];
  comparacion_mensual: MonthPoint[];
  mapa_calor: HeatCell[];
}

interface VariationStatus {
  color: string;
  soft: string;
  label: string;
  description: string;
  Icon: IconComponent;
  comparable: boolean;
}

interface ChartTooltipPayload {
  name?: string;
  value?: number;
  color?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayload[];
  label?: string;
}

function formatNumber(value: number, digits = 2): string {
  return value.toLocaleString("es-MX", {
    maximumFractionDigits: digits,
  });
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getVariationStatus(
  value: number,
  previousConsumption: number,
  selectedMonth: number,
): VariationStatus {
  if (previousConsumption <= 0) {
    return {
      color: "#64748b",
      soft: "#f1f5f9",
      label:
        selectedMonth === 1
          ? "Sin periodo anterior"
          : "Sin datos comparables",
      description:
        selectedMonth === 1
          ? "No existen datos de diciembre para realizar la comparación."
          : "El mes anterior no tiene consumo registrado.",
      Icon: Activity,
      comparable: false,
    };
  }

  if (value < 0) {
    return {
      color: "#059669",
      soft: "#ecfdf5",
      label: "Disminuyó",
      description: "El consumo fue menor que el del mes anterior.",
      Icon: TrendingDown,
      comparable: true,
    };
  }

  if (Math.abs(value) < 0.0001) {
    return {
      color: "#64748b",
      soft: "#f1f5f9",
      label: "Sin cambio",
      description: "El consumo fue igual al del mes anterior.",
      Icon: Activity,
      comparable: true,
    };
  }

  if (value <= 10) {
    return {
      color: "#d97706",
      soft: "#fffbeb",
      label: "Aumentó moderadamente",
      description: "El consumo aumentó hasta 10% frente al mes anterior.",
      Icon: TrendingUp,
      comparable: true,
    };
  }

  return {
    color: "#dc2626",
    soft: "#fef2f2",
    label: "Aumentó considerablemente",
    description: "El consumo aumentó más de 10% frente al mes anterior.",
    Icon: TrendingUp,
    comparable: true,
  };
}

function ChartTooltip({
  active,
  payload,
  label,
}: ChartTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-2xl bg-[#171827]/95 p-3 text-white shadow-xl">
      <p className="mb-2 text-[10px] text-white/50">{label}</p>

      {payload.map((item, index) => (
        <div
          key={`${item.name ?? "serie"}-${index}`}
          className="flex justify-between gap-5 text-xs"
        >
          <span style={{ color: item.color }}>{item.name}</span>
          <b>{formatNumber(Number(item.value ?? 0))} kWh</b>
        </div>
      ))}
    </div>
  );
}

function Heatmap({ data }: { data: HeatCell[] }) {
  const maximum = Math.max(
    0,
    ...data.map((item) => item.consumo_promedio_kwh),
  );

  const cells = new Map(
    data.map((item) => [
      `${item.dia_semana}-${item.hora}`,
      item,
    ]),
  );

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[900px]">
        <div className="grid grid-cols-[95px_repeat(24,1fr)] gap-1">
          <span />

          {Array.from({ length: 24 }, (_, hour) => (
            <span
              key={hour}
              className="text-center text-[8px] text-[#9098b1]"
            >
              {String(hour).padStart(2, "0")}
            </span>
          ))}

          {[1, 2, 3, 4, 5, 6, 7].map((day) => (
            <div key={day} className="contents">
              <span className="flex items-center text-[10px] font-semibold text-[#606881]">
                {cells.get(`${day}-0`)?.nombre_dia}
              </span>

              {Array.from({ length: 24 }, (_, hour) => {
                const cell = cells.get(`${day}-${hour}`);
                const value = cell?.consumo_promedio_kwh ?? 0;
                const intensity = maximum > 0 ? value / maximum : 0;

                return (
                  <div
                    key={hour}
                    className="h-7 rounded-md"
                    title={`${cell?.nombre_dia ?? "Día"} ${String(
                      hour,
                    ).padStart(2, "0")}:00 · ${formatNumber(
                      value,
                    )} kWh`}
                    style={{
                      background:
                        value > 0
                          ? `rgba(249,115,22,${
                              0.12 + intensity * 0.88
                            })`
                          : "#f1f2f6",
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-end gap-2 text-[9px] text-[#9098b1]">
          <span>Menor</span>
          {[0.15, 0.35, 0.55, 0.75, 1].map((opacity) => (
            <span
              key={opacity}
              className="h-3 w-6 rounded"
              style={{
                background: `rgba(249,115,22,${opacity})`,
              }}
            />
          ))}
          <span>Mayor</span>
        </div>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="space-y-5">
      <div className="h-28 animate-pulse rounded-3xl bg-[#171827]" />
      <div className="h-96 animate-pulse rounded-3xl bg-white" />
    </div>
  );
}

function UpdatingOverlay({ serial }: { serial?: string }) {
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-[#171827]/25 backdrop-blur-[2px]">
      <div className="rounded-3xl bg-white px-8 py-7 text-center shadow-2xl">
        <RefreshCw
          size={28}
          className="mx-auto animate-spin text-orange-500"
        />
        <p className="mt-4 text-sm font-bold">
          Actualizando análisis del medidor
        </p>
        <p className="mt-1 text-[11px] text-[#9098b1]">
          Procesando lecturas reales de {serial ?? "medidor"}...
        </p>
      </div>
    </div>
  );
}

interface InfoCardProps {
  icon: IconComponent;
  label: string;
  value: string;
  note?: string;
}

function InfoCard({ icon: Icon, label, value, note }: InfoCardProps) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <Icon size={17} className="text-orange-500" />
      <p className="mt-3 text-[10px] text-[#9098b1]">{label}</p>
      <p className="truncate font-bold">{value}</p>
      {note && <p className="text-[9px] text-[#9098b1]">{note}</p>}
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  icon: IconComponent;
  color: string;
  note: string;
}

function KpiCard({
  label,
  value,
  icon: Icon,
  color,
  note,
}: KpiCardProps) {
  return (
    <article className="rounded-2xl border bg-white p-4">
      <Icon size={17} style={{ color }} />
      <p className="mt-3 text-[11px] text-[#9098b1]">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      <p className="mt-2 text-[10px]" style={{ color }}>
        {note}
      </p>
    </article>
  );
}

interface SummaryCardProps {
  label: string;
  value: string;
  description?: string;
  color?: string;
  background?: string;
}

function SummaryCard({
  label,
  value,
  description,
  color = "#1a1a2e",
  background = "#f8f9fc",
}: SummaryCardProps) {
  return (
    <div className="rounded-2xl p-4" style={{ background }}>
      <p className="text-[10px] text-[#9098b1]">{label}</p>
      <p className="font-bold" style={{ color }}>
        {value}
      </p>
      {description && (
        <p className="mt-1 text-[9px] text-[#747b91]">
          {description}
        </p>
      )}
    </div>
  );
}

export default function EnergyAnalysis() {
  const [meters, setMeters] = useState<Meter[]>([]);
  const [meterId, setMeterId] = useState<number | null>(null);
  const [month, setMonth] = useState(3);
  const [dayType, setDayType] = useState<DayType>("todos");
  const [analysis, setAnalysis] =
    useState<AnalysisResponse | null>(null);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMeters = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `${API_URL}/api/analisis-energetico/medidores`,
        );

        if (!response.ok) {
          throw new Error(`Catálogo HTTP ${response.status}`);
        }

        const data = (await response.json()) as Meter[];
        setMeters(data);
        setMeterId(data[0]?.id_medidor ?? null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo cargar el catálogo de medidores.",
        );
      } finally {
        setLoading(false);
      }
    };

    void loadMeters();
  }, []);

  useEffect(() => {
    if (meterId === null) {
      return;
    }

    const loadAnalysis = async () => {
      try {
        setUpdating(true);
        setError(null);

        const params = new URLSearchParams({
          mes: String(month),
          nivel: "medidor",
          tipo_dia: dayType,
          id_medidor: String(meterId),
        });

        const response = await fetch(
          `${API_URL}/api/analisis-energetico/agregado?${params.toString()}`,
        );

        if (!response.ok) {
          throw new Error(
            `Análisis HTTP ${response.status}: ${await response.text()}`,
          );
        }

        const data = (await response.json()) as AnalysisResponse;
        setAnalysis(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo cargar el análisis del medidor.",
        );
      } finally {
        setUpdating(false);
      }
    };

    void loadAnalysis();
  }, [meterId, month, dayType]);

  const selectedMeter = useMemo(
    () =>
      meters.find((item) => item.id_medidor === meterId) ?? null,
    [meters, meterId],
  );

  const searchResults = useMemo(() => {
    const query = normalizeText(search.trim());

    if (!query) {
      return [];
    }

    return meters
      .filter((item) =>
        normalizeText(
          `${item.numero_serie} ${item.servicio_nombre} ${item.rpu} ` +
            `${item.zona_nombre} ${item.tipo_servicio_nombre}`,
        ).includes(query),
      )
      .slice(0, 15);
  }, [meters, search]);

  const hourlyChartData = useMemo(
    () =>
      analysis?.curva_horaria.map((item) => ({
        hora: `${String(item.hora).padStart(2, "0")}:00`,
        real: item.consumo_real_kwh,
        estimado: item.consumo_estimado_kwh,
      })) ?? [],
    [analysis],
  );

  const monthlyChartData = useMemo(
    () =>
      analysis?.comparacion_mensual.map((item) => ({
        ...item,
        active: item.mes === month,
      })) ?? [],
    [analysis, month],
  );

  const variationStatus = getVariationStatus(
    analysis?.resumen.variacion_pct ?? 0,
    analysis?.resumen.consumo_anterior_kwh ?? 0,
    month,
  );

  const VariationIcon = variationStatus.Icon;

  const variationValue = variationStatus.comparable
    ? `${
        (analysis?.resumen.variacion_pct ?? 0) > 0 ? "+" : ""
      }${formatNumber(analysis?.resumen.variacion_pct ?? 0, 1)}%`
    : "0%";

  const selectMeter = (meter: Meter) => {
    setMeterId(meter.id_medidor);
    setSearch("");
    setSearchOpen(false);
  };

  const resetFilters = () => {
    setMeterId(meters[0]?.id_medidor ?? null);
    setMonth(3);
    setDayType("todos");
    setSearch("");
    setSearchOpen(false);
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="relative flex flex-col gap-6">
      {updating && (
        <UpdatingOverlay serial={selectedMeter?.numero_serie} />
      )}

      <header className="rounded-3xl bg-[#171827] p-6 text-white">
        <p className="text-[10px] font-bold uppercase tracking-[.2em] text-orange-300">
          Inteligencia energética
        </p>

        <div className="mt-1 flex justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              Análisis Energético por Medidor
            </h1>
            <p className="mt-2 text-xs text-white/60">
              Selecciona un medidor; zona, servicio, RPU y tipo se
              cargan automáticamente.
            </p>
          </div>
          <Zap size={30} className="text-orange-400" />
        </div>
      </header>

      {error && (
        <div className="flex items-center justify-between rounded-2xl bg-red-50 p-4 text-xs text-red-700">
          <span className="flex gap-2">
            <AlertCircle size={15} />
            {error}
          </span>
          <button type="button" onClick={() => setError(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      <section className="rounded-3xl border bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold">
          Seleccionar medidor y periodo
        </h2>
        <p className="mb-4 text-[11px] text-[#9098b1]">
          Los únicos filtros del análisis son medidor, mes y tipo de
          día.
        </p>

        <div className="relative mb-4">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9098b1]"
          />
          <input
            value={search}
            onFocus={() => setSearchOpen(true)}
            onChange={(event) => {
              setSearch(event.target.value);
              setSearchOpen(true);
            }}
            placeholder="Buscar por serie, servicio, RPU, zona o tipo..."
            className="w-full rounded-2xl border bg-[#fafbfc] py-3 pl-10 pr-4 text-sm"
          />

          {searchOpen && searchResults.length > 0 && (
            <div className="absolute z-30 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border bg-white p-2 shadow-2xl">
              {searchResults.map((item) => (
                <button
                  type="button"
                  key={item.id_medidor}
                  onClick={() => selectMeter(item)}
                  className="flex w-full items-center justify-between rounded-xl p-3 text-left hover:bg-orange-50"
                >
                  <span>
                    <b className="block text-xs">
                      {item.numero_serie}
                    </b>
                    <small className="text-[#9098b1]">
                      {item.servicio_nombre} · RPU {item.rpu}
                    </small>
                  </span>
                  <span className="text-right text-[9px] text-[#9098b1]">
                    {item.zona_nombre}
                    <br />
                    {item.tipo_servicio_nombre}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-[10px] font-bold text-[#9098b1]">
            MEDIDOR
            <select
              value={meterId ?? ""}
              onChange={(event) =>
                setMeterId(Number(event.target.value))
              }
              className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm text-[#1a1a2e]"
            >
              {meters.map((item) => (
                <option
                  key={item.id_medidor}
                  value={item.id_medidor}
                >
                  {item.numero_serie} · {item.servicio_nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="text-[10px] font-bold text-[#9098b1]">
            MES
            <select
              value={month}
              onChange={(event) =>
                setMonth(Number(event.target.value))
              }
              className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm text-[#1a1a2e]"
            >
              {MONTHS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-[10px] font-bold text-[#9098b1]">
            TIPO DE DÍA
            <select
              value={dayType}
              onChange={(event) =>
                setDayType(event.target.value as DayType)
              }
              className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm text-[#1a1a2e]"
            >
              {DAY_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-xl bg-[#f2f3f7] px-4 py-2.5 text-xs font-bold"
          >
            Restablecer filtros
          </button>
        </div>
      </section>

      {selectedMeter && (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <InfoCard
            icon={Activity}
            label="Medidor"
            value={selectedMeter.numero_serie}
            note={`ID ${selectedMeter.id_medidor}`}
          />
          <InfoCard
            icon={Server}
            label="Servicio"
            value={selectedMeter.servicio_nombre}
            note={`RPU ${selectedMeter.rpu}`}
          />
          <InfoCard
            icon={MapPin}
            label="Zona"
            value={selectedMeter.zona_nombre}
          />
          <InfoCard
            icon={BarChart3}
            label="Tipo de servicio"
            value={selectedMeter.tipo_servicio_nombre}
          />
          <InfoCard
            icon={CalendarDays}
            label="Periodo"
            value={`${
              MONTHS.find((item) => item.value === month)?.label
            } ${analysis?.anio ?? ""}`}
          />
          <InfoCard
            icon={Clock3}
            label="Tipo de día"
            value={
              DAY_TYPES.find((item) => item.value === dayType)
                ?.label ?? "Todos"
            }
          />
        </section>
      )}

      {analysis && (
        <>
          <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <KpiCard
              label="Consumo total"
              value={`${formatNumber(
                analysis.resumen.consumo_total_kwh,
              )} kWh`}
              icon={Zap}
              color="#f97316"
              note="Energía real del mes"
            />
            <KpiCard
              label="Variación mensual"
              value={variationValue}
              icon={VariationIcon}
              color={variationStatus.color}
              note={variationStatus.label}
            />
            <KpiCard
              label="Promedio diario"
              value={`${formatNumber(
                analysis.resumen.promedio_diario_kwh,
              )} kWh`}
              icon={Gauge}
              color="#10b981"
              note={`${formatNumber(
                analysis.resumen.lecturas,
                0,
              )} lecturas`}
            />
            <KpiCard
              label="Pico horario"
              value={`${formatNumber(
                analysis.resumen.pico_horario_kwh,
              )} kWh`}
              icon={Clock3}
              color="#6366f1"
              note={
                analysis.resumen.hora_pico === null
                  ? "Sin dato"
                  : `${String(
                      analysis.resumen.hora_pico,
                    ).padStart(2, "0")}:00`
              }
            />
          </section>

          <section className="rounded-3xl border bg-white p-5">
            <h2 className="text-sm font-bold">
              Curva temporal horaria
            </h2>
            <p className="mb-4 text-[11px] text-[#9098b1]">
              Promedio de consumo real y estimado por hora.
            </p>
            <ResponsiveContainer width="100%" height={330}>
              <LineChart data={hourlyChartData}>
                <CartesianGrid
                  vertical={false}
                  stroke="#f0f1f7"
                />
                <XAxis dataKey="hora" interval={2} />
                <YAxis />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  dataKey="real"
                  name="Real"
                  stroke="#f97316"
                  strokeWidth={3}
                  dot={false}
                />
                <Line
                  dataKey="estimado"
                  name="Estimado"
                  stroke="#6366f1"
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-3xl border bg-white p-5">
              <h2 className="text-sm font-bold">
                Comparación enero, febrero y marzo
              </h2>
              <ResponsiveContainer width="100%" height={290}>
                <BarChart data={monthlyChartData}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="nombre_mes" />
                  <YAxis />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar
                    dataKey="consumo_total_kwh"
                    name="Consumo"
                    radius={[8, 8, 0, 0]}
                  >
                    {monthlyChartData.map((item, index) => (
                      <Cell
                        key={index}
                        fill={
                          item.active ? "#f97316" : "#a5b4fc"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-3xl border bg-white p-5">
              <h2 className="text-sm font-bold">
                Perfil horario promedio
              </h2>
              <p className="text-[11px] text-[#9098b1]">
                Comportamiento típico del medidor durante 24 horas.
              </p>
              <ResponsiveContainer width="100%" height={290}>
                <AreaChart data={hourlyChartData}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="hora" interval={2} />
                  <YAxis />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    dataKey="real"
                    name="Consumo"
                    stroke="#6366f1"
                    fill="#e0e7ff"
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-3xl border bg-white p-5">
            <h2 className="text-sm font-bold">
              Mapa de calor horario
            </h2>
            <p className="mb-5 text-[11px] text-[#9098b1]">
              Consumo promedio por día y hora; gris representa
              ausencia de lecturas.
            </p>
            <Heatmap data={analysis.mapa_calor} />
          </section>

          <section className="rounded-3xl border bg-white p-5">
            <h2 className="text-sm font-bold">
              Resumen del análisis
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                label="Consumo anterior"
                value={`${formatNumber(
                  analysis.resumen.consumo_anterior_kwh,
                )} kWh`}
                description={
                  variationStatus.comparable
                    ? "Consumo utilizado como base de comparación."
                    : variationStatus.description
                }
              />
              <SummaryCard
                label="Promedio por lectura"
                value={`${formatNumber(
                  analysis.resumen.promedio_por_lectura_kwh,
                )} kWh`}
              />
              <SummaryCard
                label="Lecturas procesadas"
                value={formatNumber(
                  analysis.resumen.lecturas,
                  0,
                )}
              />
              <SummaryCard
                label="Tendencia frente al mes anterior"
                value={variationStatus.label}
                description={variationStatus.description}
                color={variationStatus.color}
                background={variationStatus.soft}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
