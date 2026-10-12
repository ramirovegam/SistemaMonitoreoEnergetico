import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  Download,
  Eye,
  FileSearch,
  Gauge,
  MapPin,
  RefreshCw,
  Search,
  Server,
  X,
  Zap,
} from "lucide-react";
import {
  descargarHistorialCsv,
  detectarHuecos,
  obtenerHistorial,
  obtenerLecturaOriginal,
  obtenerLecturasAgrupadas,
  type AnalisisHuecos,
  type FiltrosHistorial,
  type GrupoLecturas,
  type HistorialPaginado,
  type LecturaHistorial,
} from "../services/historialLecturasService";

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const EMPTY_RESULT: HistorialPaginado = {
  items: [],
  total: 0,
  pagina: 1,
  por_pagina: 50,
  total_paginas: 1,
};

const MONTHS = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
];

const READING_STATES = [
  "Todas",
  "Válidas",
  "Estimadas",
  "En cero",
  "Atípicas",
  "Duplicadas",
  "Con datos faltantes",
] as const;

const DAY_TYPES = [
  "Todos",
  "Laborable",
  "Fin de semana",
  "Festivo",
] as const;

const VIEW_MODES = ["Diaria", "Semanal", "Mensual"] as const;

type ReadingState = (typeof READING_STATES)[number];
type DayType = (typeof DAY_TYPES)[number];
type ViewMode = (typeof VIEW_MODES)[number];
type Reading = LecturaHistorial & { clave_registro?: string };

interface MeterCatalogItem {
  id_medidor: number;
  id_servicio: number;
  numero_serie: string;
  id_zona: number;
  zona_nombre: string;
  id_tipo_servicio: number;
  tipo_servicio_nombre: string;
  servicio_nombre: string;
  rpu: string;
  estado?: string;
}

interface EvaluatedReading {
  reading: Reading;
  calculatedState: Exclude<ReadingState, "Todas" | "Con datos faltantes">;
  real: number;
  estimated: number | null;
  difference: number | null;
  errorPercent: number | null;
  previous: number | null;
  previousChange: number | null;
  hourlyAverage: number;
  hourlyDifference: number | null;
  dayType: Exclude<DayType, "Todos">;
  quality: number;
  observation: string;
}

function formatNumber(value: number | null, digits = 3): string {
  return value === null
    ? "Sin dato"
    : value.toLocaleString("es-MX", {
        maximumFractionDigits: digits,
      });
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function toApiDate(value: string, endOfDay = false): string | undefined {
  if (!value) return undefined;
  const suffix = endOfDay ? "T23:59:59" : "T00:00:00";
  return new Date(`${value}${suffix}`).toISOString();
}

function qualityPercent(value: number): number {
  return Math.max(0, Math.min(100, value <= 1 ? value * 100 : value));
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getDayType(timestamp: string): Exclude<DayType, "Todos"> {
  const day = new Date(timestamp).getDay();
  return day === 0 || day === 6 ? "Fin de semana" : "Laborable";
}

function getMonthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return { start: formatDate(start), end: formatDate(end) };
}

function getExpectedReadings(view: ViewMode, year: number, month: number) {
  if (view === "Diaria") return 24;
  if (view === "Semanal") return 168;
  return new Date(year, month, 0).getDate() * 24;
}

function downloadTextFile(
  filename: string,
  content: string,
  mime = "text/csv;charset=utf-8",
) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function statusClasses(status: string) {
  if (status === "Válidas") return "bg-emerald-50 text-emerald-700";
  if (status === "Estimadas") return "bg-indigo-50 text-indigo-700";
  if (status === "En cero") return "bg-slate-100 text-slate-600";
  if (status === "Duplicadas") return "bg-purple-50 text-purple-700";
  return "bg-red-50 text-red-700";
}

interface ReadingDetailProps {
  item: EvaluatedReading | null;
  original: Reading | null;
  meter: MeterCatalogItem | null;
  loading: boolean;
  onClose: () => void;
}

function ReadingDetail({
  item,
  original,
  meter,
  loading,
  onClose,
}: ReadingDetailProps) {
  if (!item && !loading) return null;

  const reading = original ?? item?.reading ?? null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#171827]/35 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <aside
        className="h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-orange-500">
              Detalle de lectura
            </p>
            <h2 className="text-lg font-bold text-[#1a1a2e]">
              {reading?.numero_serie ?? "Consultando PostgreSQL..."}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f2f3f7]"
          >
            <X size={15} />
          </button>
        </header>

        {loading || !reading || !item ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-[#9098b1]">
            <RefreshCw size={17} className="animate-spin text-orange-500" />
            Cargando registro original...
          </div>
        ) : (
          <div className="space-y-6 p-6">
            <DetailSection title="Identificación">
              <DetailCard label="Medidor" value={reading.numero_serie} />
              <DetailCard label="Fecha y hora" value={formatDateTime(reading.ts)} />
              <DetailCard label="Servicio" value={meter?.servicio_nombre ?? reading.servicio_nombre} />
              <DetailCard label="RPU" value={meter?.rpu ?? reading.servicio_rpu} />
              <DetailCard label="Zona" value={meter?.zona_nombre ?? reading.zona_nombre} />
              <DetailCard label="Tipo de servicio" value={meter?.tipo_servicio_nombre ?? "Sin información"} />
            </DetailSection>

            <DetailSection title="Valores">
              <DetailCard label="Consumo real" value={`${formatNumber(item.real)} kWh`} />
              <DetailCard label="Consumo estimado" value={item.estimated === null ? "Sin dato" : `${formatNumber(item.estimated)} kWh`} />
              <DetailCard label="Diferencia" value={item.difference === null ? "No calculable" : `${item.difference >= 0 ? "+" : ""}${formatNumber(item.difference)} kWh`} />
              <DetailCard label="Error porcentual" value={item.errorPercent === null ? "No calculable" : `${item.errorPercent >= 0 ? "+" : ""}${formatNumber(item.errorPercent, 2)}%`} />
              <DetailCard label="Voltaje" value={reading.voltaje === null ? "No disponible" : `${formatNumber(reading.voltaje)} V`} />
              <DetailCard label="Calidad" value={`${item.quality.toFixed(1)}%`} />
            </DetailSection>

            <DetailSection title="Comparaciones">
              <DetailCard label="Lectura anterior" value={item.previous === null ? "Sin lectura anterior" : `${formatNumber(item.previous)} kWh`} />
              <DetailCard label="Cambio respecto a la anterior" value={item.previousChange === null ? "No calculable" : `${item.previousChange >= 0 ? "+" : ""}${formatNumber(item.previousChange, 2)}%`} />
              <DetailCard label="Promedio de esa hora" value={`${formatNumber(item.hourlyAverage)} kWh`} />
              <DetailCard label="Diferencia contra promedio" value={item.hourlyDifference === null ? "No calculable" : `${item.hourlyDifference >= 0 ? "+" : ""}${formatNumber(item.hourlyDifference, 2)}%`} />
            </DetailSection>

            <section className="rounded-3xl bg-[#f8f9fc] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#9098b1]">
                Evaluación calculada
              </p>
              <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusClasses(item.calculatedState)}`}>
                {item.calculatedState}
              </span>
              <p className="mt-3 text-sm font-semibold text-[#30364a]">
                {item.observation}
              </p>
              <p className="mt-1 text-xs text-[#9098b1]">
                Tipo de día: {item.dayType}
              </p>
            </section>
          </div>
        )}
      </aside>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-3 text-xs font-bold uppercase tracking-[.14em] text-[#9098b1]">
        {title}
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#f8f9fc] p-4">
      <p className="text-[10px] text-[#9098b1]">{label}</p>
      <p className="mt-1 text-sm font-bold text-[#1a1a2e]">{value}</p>
    </div>
  );
}

export default function ReadingHistory() {
  const [data, setData] = useState<HistorialPaginado>(EMPTY_RESULT);
  const [meters, setMeters] = useState<MeterCatalogItem[]>([]);
  const [meterId, setMeterId] = useState<number | null>(null);
  const [month, setMonth] = useState(3);
  const [year, setYear] = useState(2026);
  const [customRange, setCustomRange] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [readingState, setReadingState] = useState<ReadingState>("Todas");
  const [dayType, setDayType] = useState<DayType>("Todos");
  const [viewMode, setViewMode] = useState<ViewMode>("Mensual");
  const [anchorDate, setAnchorDate] = useState(new Date(2026, 2, 1));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [grouped, setGrouped] = useState<GrupoLecturas[]>([]);
  const [gaps, setGaps] = useState<AnalisisHuecos | null>(null);
  const [showGaps, setShowGaps] = useState(false);
  const [selected, setSelected] = useState<EvaluatedReading | null>(null);
  const [original, setOriginal] = useState<Reading | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedMeter = useMemo(
    () => meters.find((item) => item.id_medidor === meterId) ?? null,
    [meters, meterId],
  );

  const selectedRange = useMemo(() => {
    if (customRange) {
      return { start: fromDate, end: toDate };
    }

    if (viewMode === "Mensual") {
      return getMonthRange(year, month);
    }

    const start = new Date(anchorDate);
    const end = new Date(anchorDate);

    if (viewMode === "Semanal") {
      const mondayOffset = (start.getDay() + 6) % 7;
      start.setDate(start.getDate() - mondayOffset);
      end.setTime(start.getTime());
      end.setDate(end.getDate() + 6);
    }

    return { start: formatDate(start), end: formatDate(end) };
  }, [customRange, fromDate, toDate, viewMode, anchorDate, year, month]);

  const filters = useMemo<FiltrosHistorial>(
    () => ({
      pagina: page,
      porPagina: pageSize,
      desde: toApiDate(selectedRange.start),
      hasta: toApiDate(selectedRange.end, true),
      busquedaMedidor: selectedMeter?.numero_serie,
      orden: "asc",
    }),
    [page, pageSize, selectedRange, selectedMeter],
  );

  useEffect(() => {
    const loadMeters = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/analisis-energetico/medidores`,
        );
        if (!response.ok) throw new Error(`Catálogo HTTP ${response.status}`);
        const result = (await response.json()) as MeterCatalogItem[];
        setMeters(result);
        setMeterId(result[0]?.id_medidor ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cargar el catálogo de medidores.");
      } finally {
        setLoading(false);
      }
    };

    void loadMeters();
  }, []);

  const loadReadings = async () => {
    if (!selectedMeter) return;

    try {
      setUpdating(true);
      setError(null);

      const [history, groups] = await Promise.all([
        obtenerHistorial(filters),
        obtenerLecturasAgrupadas(filters, "hora"),
      ]);

      setData(history);
      setGrouped(groups);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el historial.");
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    void loadReadings();
  }, [selectedMeter, filters]);

  useEffect(() => {
    setPage(1);
    setGaps(null);
    setShowGaps(false);
  }, [meterId, month, customRange, fromDate, toDate, viewMode, anchorDate]);

  const evaluated = useMemo<EvaluatedReading[]>(() => {
    const items = data.items as Reading[];
    const duplicateKeys = new Set<string>();
    const seen = new Set<string>();

    for (const item of items) {
      const key = `${item.id_medidor}-${item.ts}`;
      if (seen.has(key)) duplicateKeys.add(key);
      seen.add(key);
    }

    const values = items.map((item) => Number(item.consumo_real_kwh ?? 0));
    const mean = values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : 0;
    const variance = values.length
      ? values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
        values.length
      : 0;
    const deviation = Math.sqrt(variance);

    const hourGroups = new Map<number, number[]>();
    for (const item of items) {
      const hour = new Date(item.ts).getHours();
      hourGroups.set(hour, [
        ...(hourGroups.get(hour) ?? []),
        Number(item.consumo_real_kwh ?? 0),
      ]);
    }

    return items.map((reading, index) => {
      const real = Number(reading.consumo_real_kwh ?? 0);
      const estimated =
        reading.consumo_kwh === null
          ? null
          : Number(reading.consumo_kwh);
      const difference = estimated === null ? null : real - estimated;
      const errorPercent =
        estimated === null || estimated === 0
          ? null
          : ((real - estimated) / estimated) * 100;
      const previous =
        index > 0
          ? Number(items[index - 1].consumo_real_kwh ?? 0)
          : null;
      const previousChange =
        previous === null || previous === 0
          ? null
          : ((real - previous) / previous) * 100;
      const hour = new Date(reading.ts).getHours();
      const hourValues = hourGroups.get(hour) ?? [];
      const hourlyAverage = hourValues.length
        ? hourValues.reduce((sum, value) => sum + value, 0) /
          hourValues.length
        : 0;
      const hourlyDifference =
        hourlyAverage === 0
          ? null
          : ((real - hourlyAverage) / hourlyAverage) * 100;
      const isDuplicate = duplicateKeys.has(
        `${reading.id_medidor}-${reading.ts}`,
      );
      const isEstimated = reading.consumo_real_kwh === null;
      const isZero = real === 0;
      const isOutlier = deviation > 0 && Math.abs(real - mean) > deviation * 2;

      let calculatedState: EvaluatedReading["calculatedState"] = "Válidas";
      let observation = "Dentro del rango habitual.";

      if (isDuplicate) {
        calculatedState = "Duplicadas";
        observation = "Existe más de un registro para el mismo medidor y hora.";
      } else if (isEstimated) {
        calculatedState = "Estimadas";
        observation = "No existe consumo real; se utiliza el valor estimado.";
      } else if (isZero) {
        calculatedState = "En cero";
        observation = "La lectura real es cero y requiere revisión contextual.";
      } else if (isOutlier) {
        calculatedState = "Atípicas";
        observation = "El valor se aleja más de dos desviaciones estándar del promedio.";
      }

      return {
        reading,
        calculatedState,
        real,
        estimated,
        difference,
        errorPercent,
        previous,
        previousChange,
        hourlyAverage,
        hourlyDifference,
        dayType: getDayType(reading.ts),
        quality: qualityPercent(reading.calidad_enlace),
        observation,
      };
    });
  }, [data.items]);

  const visibleReadings = useMemo(() => {
    if (readingState === "Con datos faltantes") return [];

    return evaluated.filter((item) => {
      const matchesState =
        readingState === "Todas" ||
        item.calculatedState === readingState;
      const matchesDay =
        dayType === "Todos" || item.dayType === dayType;
      return matchesState && matchesDay;
    });
  }, [evaluated, readingState, dayType]);

  const metrics = useMemo(() => {
    const total = visibleReadings.length;
    const realReadings = visibleReadings.filter(
      (item) => item.calculatedState !== "Estimadas",
    ).length;
    const estimatedReadings = visibleReadings.filter(
      (item) => item.calculatedState === "Estimadas",
    ).length;
    const consumption = visibleReadings.reduce(
      (sum, item) => sum + item.real,
      0,
    );
    const average = total ? consumption / total : 0;
    const maximum = visibleReadings.reduce<EvaluatedReading | null>(
      (current, item) =>
        !current || item.real > current.real ? item : current,
      null,
    );
    const expected = getExpectedReadings(viewMode, year, month);
    const missing = Math.max(0, expected - data.total);
    const completeness = expected
      ? Math.min(100, (data.total / expected) * 100)
      : 0;

    return {
      total,
      realReadings,
      estimatedReadings,
      missing,
      consumption,
      average,
      maximum,
      completeness,
    };
  }, [visibleReadings, data.total, viewMode, year, month]);

  const chartData = grouped.map((item) => ({
    period: new Date(item.periodo).toLocaleString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
    }),
    total: item.consumo_total_kwh,
    average: item.consumo_promedio_kwh,
  }));

  const loadGaps = async () => {
    try {
      setUpdating(true);
      const result = await detectarHuecos(filters, 60);
      setGaps(result);
      setShowGaps(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron detectar huecos.");
    } finally {
      setUpdating(false);
    }
  };

  const openDetail = async (item: EvaluatedReading) => {
    try {
      setSelected(item);
      setOriginal(null);
      setDetailLoading(true);
      const result = await obtenerLecturaOriginal(
        item.reading.id_medidor,
        item.reading.ts,
      );
      setOriginal(result as Reading);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo consultar el registro original.");
    } finally {
      setDetailLoading(false);
    }
  };

  const movePeriod = (direction: number) => {
    const next = new Date(anchorDate);
    next.setDate(
      next.getDate() + direction * (viewMode === "Semanal" ? 7 : 1),
    );
    setAnchorDate(next);
  };

  const exportFiltered = () => {
    const rows = [
      [
        "id_medidor",
        "numero_serie",
        "fecha",
        "hora",
        "consumo_real_kwh",
        "consumo_estimado_kwh",
        "diferencia_kwh",
        "error_pct",
        "tipo_dia",
        "estado_calculado",
      ],
      ...visibleReadings.map((item) => {
        const date = new Date(item.reading.ts);
        return [
          item.reading.id_medidor,
          item.reading.numero_serie,
          date.toLocaleDateString("es-MX"),
          date.toLocaleTimeString("es-MX"),
          item.real,
          item.estimated ?? "",
          item.difference ?? "",
          item.errorPercent ?? "",
          item.dayType,
          item.calculatedState,
        ];
      }),
    ];

    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
      .join("\n");

    downloadTextFile(
      `lecturas_filtradas_${selectedMeter?.numero_serie ?? "medidor"}.csv`,
      csv,
    );
  };

  const exportGaps = () => {
    if (!gaps) return;
    const rows = [
      ["id_medidor", "numero_serie", "inicio", "fin", "minutos", "faltantes"],
      ...gaps.huecos.map((gap) => [
        gap.id_medidor,
        gap.numero_serie,
        gap.inicio_hueco,
        gap.fin_hueco,
        gap.minutos_sin_datos,
        gap.lecturas_estimadas_faltantes,
      ]),
    ];
    const csv = rows.map((row) => row.join(",")).join("\n");
    downloadTextFile("huecos_lecturas.csv", csv);
  };

  const copySummary = async () => {
    const summary = [
      `Medidor: ${selectedMeter?.numero_serie ?? "Sin selección"}`,
      `Servicio: ${selectedMeter?.servicio_nombre ?? "Sin información"}`,
      `Periodo: ${selectedRange.start} a ${selectedRange.end}`,
      `Lecturas encontradas: ${data.total}`,
      `Consumo acumulado: ${formatNumber(metrics.consumption)} kWh`,
      `Promedio: ${formatNumber(metrics.average)} kWh`,
      `Completitud: ${metrics.completeness.toFixed(2)}%`,
    ].join("\n");
    await navigator.clipboard.writeText(summary);
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-24 animate-pulse rounded-3xl bg-[#171827]" />
        <div className="h-96 animate-pulse rounded-3xl bg-white" />
      </div>
    );
  }

  return (
    <div className="relative flex flex-col gap-6">
      {updating && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-[#171827]/25 backdrop-blur-[2px]">
          <div className="rounded-3xl bg-white px-8 py-7 text-center shadow-2xl">
            <RefreshCw size={28} className="mx-auto animate-spin text-orange-500" />
            <p className="mt-4 text-sm font-bold">Actualizando lecturas</p>
            <p className="mt-1 text-[11px] text-[#9098b1]">
              Consultando registros de {selectedMeter?.numero_serie ?? "medidor"}...
            </p>
          </div>
        </div>
      )}

      <header className="rounded-3xl bg-[#171827] p-6 text-white">
        <p className="text-[10px] font-bold uppercase tracking-[.18em] text-orange-300">
          Explorador técnico
        </p>
        <h1 className="text-3xl font-bold">Historial de Lecturas</h1>
        <p className="mt-2 text-xs text-white/60">
          Inspección de registros individuales, calidad y huecos de información.
        </p>
      </header>

      {error && (
        <div className="rounded-2xl bg-red-50 p-4 text-xs text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-3xl border bg-white p-5">
        <h2 className="text-sm font-bold">Filtros principales</h2>
        <p className="mb-4 text-[11px] text-[#9098b1]">
          Elige un medidor; su servicio, RPU, zona, tipo y estado se cargan automáticamente.
        </p>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-[10px] font-bold text-[#9098b1]">
            MEDIDOR
            <select
              disabled={updating}
              value={meterId ?? ""}
              onChange={(event) => setMeterId(Number(event.target.value))}
              className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm disabled:opacity-50"
            >
              {meters.map((item) => (
                <option key={item.id_medidor} value={item.id_medidor}>
                  {item.numero_serie} · {item.servicio_nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="text-[10px] font-bold text-[#9098b1]">
            PERIODO
            <select
              disabled={updating || customRange}
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
              className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm disabled:opacity-50"
            >
              {MONTHS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>

          <label className="text-[10px] font-bold text-[#9098b1]">
            ESTADO DE LECTURA
            <select
              disabled={updating}
              value={readingState}
              onChange={(event) => setReadingState(event.target.value as ReadingState)}
              className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm disabled:opacity-50"
            >
              {READING_STATES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>

          <label className="text-[10px] font-bold text-[#9098b1]">
            TIPO DE DÍA
            <select
              disabled={updating}
              value={dayType}
              onChange={(event) => setDayType(event.target.value as DayType)}
              className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm disabled:opacity-50"
            >
              {DAY_TYPES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3 border-t pt-4">
          <label className="flex items-center gap-2 text-xs font-semibold">
            <input
              type="checkbox"
              checked={customRange}
              onChange={(event) => setCustomRange(event.target.checked)}
            />
            Rango personalizado
          </label>
          {customRange && (
            <>
              <label className="text-[10px] font-bold text-[#9098b1]">
                DESDE
                <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="ml-2 rounded-lg border px-2 py-1.5" />
              </label>
              <label className="text-[10px] font-bold text-[#9098b1]">
                HASTA
                <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="ml-2 rounded-lg border px-2 py-1.5" />
              </label>
            </>
          )}
          <div className="ml-auto flex gap-2">
            {VIEW_MODES.map((mode) => (
              <button
                type="button"
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`rounded-xl px-3 py-2 text-xs font-bold ${viewMode === mode ? "bg-[#171827] text-white" : "bg-[#f2f3f7] text-[#606881]"}`}
              >
                Vista {mode.toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </section>

      {selectedMeter && (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <ContextCard icon={Activity} label="Medidor" value={selectedMeter.numero_serie} />
          <ContextCard icon={Server} label="Servicio" value={selectedMeter.servicio_nombre} note={`RPU ${selectedMeter.rpu}`} />
          <ContextCard icon={MapPin} label="Zona" value={selectedMeter.zona_nombre} />
          <ContextCard icon={BarChart3} label="Tipo de servicio" value={selectedMeter.tipo_servicio_nombre} />
          <ContextCard icon={Gauge} label="Estado" value={selectedMeter.estado ?? "Registrado"} />
        </section>
      )}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard label="Lecturas encontradas" value={formatNumber(data.total, 0)} icon={CalendarDays} color="#6366f1" />
        <MetricCard label="Lecturas reales" value={formatNumber(metrics.realReadings, 0)} icon={Activity} color="#10b981" />
        <MetricCard label="Lecturas estimadas" value={formatNumber(metrics.estimatedReadings, 0)} icon={FileSearch} color="#8b5cf6" />
        <MetricCard label="Lecturas faltantes" value={formatNumber(metrics.missing, 0)} icon={AlertTriangle} color="#ef4444" />
        <MetricCard label="Consumo acumulado" value={`${formatNumber(metrics.consumption)} kWh`} icon={Zap} color="#f97316" />
        <MetricCard label="Promedio por lectura" value={`${formatNumber(metrics.average)} kWh`} icon={Gauge} color="#10b981" />
        <MetricCard label="Lectura máxima" value={metrics.maximum ? `${formatNumber(metrics.maximum.real)} kWh` : "Sin dato"} note={metrics.maximum ? new Date(metrics.maximum.reading.ts).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) : undefined} icon={BarChart3} color="#ec4899" />
        <MetricCard label="Completitud" value={`${metrics.completeness.toFixed(2)}%`} icon={Gauge} color="#06b6d4" />
      </section>

      <section className="rounded-3xl border bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" disabled={viewMode === "Mensual"} onClick={() => movePeriod(-1)} className="flex items-center gap-1 rounded-xl border px-3 py-2 text-xs disabled:opacity-40"><ChevronLeft size={14} />Periodo anterior</button>
          <div className="text-center"><p className="text-sm font-bold">{selectedRange.start} → {selectedRange.end}</p><p className="text-[10px] text-[#9098b1]">{viewMode} · {getExpectedReadings(viewMode, year, month)} lecturas esperadas</p></div>
          <button type="button" disabled={viewMode === "Mensual"} onClick={() => movePeriod(1)} className="flex items-center gap-1 rounded-xl border px-3 py-2 text-xs disabled:opacity-40">Periodo siguiente<ChevronRight size={14} /></button>
        </div>
      </section>

      <section className="rounded-3xl border bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-sm font-bold">Consumo real y promedio</h2><p className="text-[11px] text-[#9098b1]">Datos agrupados por hora dentro del periodo seleccionado</p></div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void descargarHistorialCsv(filters)} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"><Download size={14} />Exportar CSV</button>
            <button type="button" onClick={exportFiltered} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold"><Download size={14} />Exportar filtradas</button>
            <button type="button" onClick={() => void loadGaps()} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold"><FileSearch size={14} />Detectar huecos</button>
            <button type="button" onClick={() => void copySummary()} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold"><ClipboardCopy size={14} />Copiar resumen</button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={290}>
          <AreaChart data={chartData}>
            <CartesianGrid vertical={false} stroke="#f0f1f7" />
            <XAxis dataKey="period" tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 9 }} />
            <Tooltip />
            <Area dataKey="total" name="Consumo real" stroke="#f97316" fill="#ffedd5" strokeWidth={2.5} />
            <Line dataKey="average" name="Promedio" stroke="#6366f1" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </section>

      {showGaps && gaps && (
        <section className="rounded-3xl border bg-white p-5">
          <div className="flex items-center justify-between"><div><h2 className="text-sm font-bold">Intervalos sin lectura</h2><p className="text-[11px] text-[#9098b1]">{gaps.total_huecos} huecos con intervalo esperado de {gaps.intervalo_esperado_minutos} minutos</p></div><div className="flex gap-2"><button type="button" onClick={exportGaps} className="rounded-xl border px-3 py-2 text-xs">Exportar huecos</button><button type="button" onClick={() => setShowGaps(false)}><X size={15} /></button></div></div>
          <div className="mt-4 space-y-2">{gaps.huecos.length === 0 ? <p className="rounded-2xl bg-emerald-50 p-4 text-xs text-emerald-700">No se detectaron huecos.</p> : gaps.huecos.map((gap, index) => <div key={`${gap.id_medidor}-${gap.inicio_hueco}-${index}`} className="grid gap-2 rounded-2xl bg-red-50 p-4 text-xs md:grid-cols-5"><b>{gap.numero_serie}</b><span>{formatDateTime(gap.inicio_hueco)}</span><span>{formatDateTime(gap.fin_hueco)}</span><span>{gap.minutos_sin_datos.toFixed(0)} minutos</span><span>{gap.lecturas_estimadas_faltantes} faltantes · Pendiente</span></div>)}</div>
        </section>
      )}

      <section className="overflow-hidden rounded-3xl border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1450px] text-left text-xs">
            <thead className="bg-[#f8f9fc] text-[10px] uppercase text-[#9098b1]"><tr><th className="p-3">Fecha</th><th>Hora</th><th>Medidor</th><th>Consumo real</th><th>Estimado</th><th>Diferencia</th><th>Variación</th><th>Tipo de día</th><th>Estado</th><th>Calidad</th><th>Detalle</th></tr></thead>
            <tbody>{visibleReadings.map((item) => { const date = new Date(item.reading.ts); return <tr key={`${item.reading.id_medidor}-${item.reading.ts}`} className="border-t hover:bg-[#fbfbfd]"><td className="p-3">{date.toLocaleDateString("es-MX")}</td><td>{date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</td><td><b>{item.reading.numero_serie}</b></td><td className="font-bold text-orange-600">{formatNumber(item.real)} kWh</td><td>{item.estimated === null ? "—" : `${formatNumber(item.estimated)} kWh`}</td><td>{item.difference === null ? "—" : `${item.difference >= 0 ? "+" : ""}${formatNumber(item.difference)} kWh`}</td><td>{item.previousChange === null ? "No calculable" : `${item.previousChange >= 0 ? "+" : ""}${formatNumber(item.previousChange, 2)}%`}</td><td>{item.dayType}</td><td><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${statusClasses(item.calculatedState)}`}>{item.calculatedState}</span></td><td>{item.quality.toFixed(1)}%</td><td><button type="button" onClick={() => void openDetail(item)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><Eye size={14} /></button></td></tr>; })}</tbody>
          </table>
        </div>
        {visibleReadings.length === 0 && <div className="p-10 text-center text-sm text-[#9098b1]">No se encontraron lecturas para los filtros seleccionados.</div>}
      </section>

      <footer className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <div className="text-xs text-[#9098b1]">Mostrando {visibleReadings.length} de {data.total} lecturas · <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="rounded-lg border px-2 py-1"><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option><option value={250}>250</option></select> por página</div>
        <div className="flex items-center gap-2"><button type="button" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-xl border px-3 py-2 text-xs disabled:opacity-40">Anterior</button><span className="text-xs text-[#9098b1]">{page} / {data.total_paginas}</span><button type="button" disabled={page >= data.total_paginas} onClick={() => setPage((current) => Math.min(data.total_paginas, current + 1))} className="rounded-xl border px-3 py-2 text-xs disabled:opacity-40">Siguiente</button></div>
      </footer>

      <ReadingDetail item={selected} original={original} meter={selectedMeter} loading={detailLoading} onClose={() => { setSelected(null); setOriginal(null); }} />
    </div>
  );
}

function ContextCard({ icon: Icon, label, value, note }: { icon: typeof Activity; label: string; value: string; note?: string }) {
  return <div className="rounded-2xl border bg-white p-4"><Icon size={16} className="text-orange-500" /><p className="mt-3 text-[10px] text-[#9098b1]">{label}</p><p className="truncate text-sm font-bold">{value}</p>{note && <p className="text-[9px] text-[#9098b1]">{note}</p>}</div>;
}

function MetricCard({ label, value, icon: Icon, color, note }: { label: string; value: string; icon: typeof Activity; color: string; note?: string }) {
  return <div className="rounded-2xl border bg-white p-4"><Icon size={16} style={{ color }} /><p className="mt-3 text-[10px] text-[#9098b1]">{label}</p><p className="text-lg font-bold">{value}</p>{note && <p className="text-[9px] text-[#9098b1]">{note}</p>}</div>;
}
