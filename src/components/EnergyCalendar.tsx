import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  CakeSlice,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  Palmtree,
  RefreshCw,
  Sun,
  Thermometer,
  X,
  Zap,
} from "lucide-react";
import {
  obtenerCalendarioEnergetico,
  obtenerDetalleDia,
  type CalendarioEnergeticoResponse,
  type DetalleDia,
  type DiaCalendario,
} from "../services/calendarioEnergeticoService";
import { PageHeader } from "./ui/PageHeader";

const MONTHS = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
];

const WEEK_DAYS = ["L", "M", "X", "J", "V", "S", "D"];

const EMPTY_CALENDAR: CalendarioEnergeticoResponse = {
  anio: 2026,
  mes_inicio: 1,
  mes_fin: 12,
  resumen: {
    dias_registrados: 0,
    dias_festivos: 0,
    dias_vacacionales: 0,
    temperatura_minima_c: null,
    temperatura_maxima_c: null,
    factor_estacional_promedio: null,
  },
  dias: [],
};

type DisplayFilter = "todos" | "festivos" | "vacacionales";

function formatNumber(value: number | null, digits = 1): string {
  return value === null
    ? "Sin dato"
    : value.toLocaleString("es-MX", {
        maximumFractionDigits: digits,
      });
}

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function fullDate(value: string): string {
  return parseLocalDate(value).toLocaleDateString("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getDayBackground(day: DiaCalendario): string {
  if (day.es_festivo && day.es_vacacional) {
    return "border-[var(--color-accent-soft-2)] bg-gradient-to-br from-[var(--color-accent-soft)] to-[var(--color-info-soft)]";
  }
  if (day.es_festivo) return "border-[var(--color-accent-soft-2)] bg-[var(--color-accent-soft)]";
  if (day.es_vacacional) return "border-[var(--color-info-soft)] bg-[var(--color-info-soft)]";

  const weekDay = parseLocalDate(day.fecha).getDay();
  if (weekDay === 0) return "border-[var(--color-accent-soft-2)] bg-[var(--color-accent-soft)]";
  if (weekDay === 6) return "border-[var(--color-info-soft)] bg-[var(--color-info-soft)]";
  return "border-[var(--color-border)] bg-surface";
}

interface MetricCardProps {
  icon: typeof CalendarDays;
  label: string;
  value: string;
  color: string;
  background: string;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
  background,
}: MetricCardProps) {
  return (
    <article className="rounded-2xl border bg-surface p-4 shadow-sm">
      <div
        className="flex h-9 w-9 items-center justify-center rounded-xl"
        style={{ background }}
      >
        <Icon size={17} style={{ color }} />
      </div>
      <p className="mt-3 text-[11px] text-[var(--color-muted)]">{label}</p>
      <p className="text-lg font-bold text-[var(--color-fg)]">{value}</p>
    </article>
  );
}

interface DayCellProps {
  day: DiaCalendario;
  selected: boolean;
  onSelect: (day: DiaCalendario) => void;
}

function DayCell({ day, selected, onSelect }: DayCellProps) {
  const date = parseLocalDate(day.fecha);

  return (
    <button
      type="button"
      onClick={() => onSelect(day)}
      aria-label={`${fullDate(day.fecha)}. Mínima ${formatNumber(day.temp_min_c)} grados, máxima ${formatNumber(day.temp_max_c)} grados.`}
      className={`group flex min-h-[72px] min-w-0 flex-col gap-1 overflow-hidden rounded-lg border p-1.5 text-left transition hover:-translate-y-0.5 hover:shadow-md sm:min-h-[96px] sm:gap-1.5 sm:rounded-2xl sm:p-2.5 ${getDayBackground(
        day,
      )} ${selected ? "ring-2 ring-[var(--color-accent)]" : ""}`}
    >
      <div className="flex min-w-0 items-start justify-between gap-0.5">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface/80 text-[11px] font-extrabold text-[var(--color-fg-secondary)] sm:h-6 sm:w-6">
          {date.getDate()}
        </span>
        <span className="flex shrink-0 flex-col items-end gap-0.5 sm:flex-row sm:items-center">
          {day.es_festivo && (
            <span
              title="Día festivo"
              className="rounded bg-[var(--color-accent-soft-2)] p-0.5 text-[var(--color-accent-strong)]"
            >
              <CakeSlice size={9} />
            </span>
          )}
          {day.es_vacacional && (
            <span
              title="Día vacacional"
              className="rounded bg-[var(--color-info-soft)] p-0.5 text-[var(--color-info-strong)]"
            >
              <Palmtree size={9} />
            </span>
          )}
        </span>
      </div>

      <div className="flex flex-col items-start gap-0 text-[10px] leading-tight sm:flex-row sm:items-center sm:justify-between sm:text-[11px] sm:leading-none">
        <span
          title="Temperatura mínima"
          className="font-semibold text-[var(--color-info-strong)]"
        >
          {formatNumber(day.temp_min_c)}°
        </span>
        <span
          title="Temperatura máxima"
          className="font-semibold text-[var(--color-accent-strong)]"
        >
          {formatNumber(day.temp_max_c)}°
        </span>
      </div>

      <span className="mt-auto hidden w-fit max-w-full truncate rounded-full bg-surface/85 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-[var(--color-fg-secondary)] sm:block">
        Tipo {day.tipo_dia}
      </span>
    </button>
  );
}

interface MonthCalendarProps {
  month: number;
  year: number;
  days: DiaCalendario[];
  selectedDate: string | null;
  onSelect: (day: DiaCalendario) => void;
}

function MonthCalendar({
  month,
  year,
  days,
  selectedDate,
  onSelect,
}: MonthCalendarProps) {
  const firstDate = new Date(year, month - 1, 1);
  const leadingBlanks = (firstDate.getDay() + 6) % 7;
  const dayMap = new Map(
    days.map((day) => [parseLocalDate(day.fecha).getDate(), day]),
  );
  const totalDays = new Date(year, month, 0).getDate();
  const slots = Array.from(
    { length: leadingBlanks + totalDays },
    (_, index) => (index < leadingBlanks ? null : index - leadingBlanks + 1),
  );

  return (
    <section className="rounded-3xl border bg-surface p-3 shadow-sm sm:p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold capitalize text-[var(--color-fg)]">
            {MONTHS.find((item) => item.value === month)?.label} {year}
          </h2>
          <p className="text-[11px] text-[var(--color-muted)]">
            {days.length} días registrados
          </p>
        </div>
        <CalendarDays size={19} className="text-[var(--color-accent)]" />
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {WEEK_DAYS.map((day, index) => (
          <div
            key={`${day}-${index}`}
            className="py-1 text-center text-[11px] font-bold text-[var(--color-muted)]"
          >
            {day}
          </div>
        ))}

        {slots.map((dayNumber, index) => {
          if (dayNumber === null) {
            return <div key={`blank-${index}`} />;
          }

          const day = dayMap.get(dayNumber);
          if (!day) {
            return (
              <div
                key={`missing-${dayNumber}`}
                className="min-h-[72px] rounded-lg bg-[var(--color-surface-2)] p-1.5 text-[11px] text-[var(--color-muted-2)] sm:min-h-[96px] sm:rounded-2xl sm:p-2"
              >
                {dayNumber}
              </div>
            );
          }

          return (
            <DayCell
              key={day.fecha}
              day={day}
              selected={selectedDate === day.fecha}
              onSelect={onSelect}
            />
          );
        })}
      </div>
    </section>
  );
}

interface DetailPanelProps {
  detail: DetalleDia | null;
  loading: boolean;
  onClose: () => void;
}

function DetailPanel({ detail, loading, onClose }: DetailPanelProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-overlay backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <aside
        className="h-full w-full max-w-xl overflow-y-auto bg-surface shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-surface p-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[var(--color-accent)]">
              Detalle energético del día
            </p>
            <h2 className="mt-1 text-lg font-bold capitalize text-[var(--color-fg)]">
              {detail ? fullDate(detail.fecha) : "Consultando fecha..."}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-bg)]"
          >
            <X size={15} />
          </button>
        </header>

        {loading || !detail ? (
          <div className="flex items-center justify-center gap-3 p-14 text-sm text-[var(--color-muted)]">
            <RefreshCw size={18} className="animate-spin text-[var(--color-accent)]" />
            Cargando datos del día...
          </div>
        ) : (
          <div className="space-y-6 p-6">
            <div className="flex flex-wrap gap-2">
              <Badge icon={CalendarDays} text={`Clasificación ${detail.tipo_dia}`} color="indigo" />
              {detail.es_festivo && (
                <Badge icon={CakeSlice} text="Festivo" color="orange" />
              )}
              {detail.es_vacacional && (
                <Badge icon={Palmtree} text="Vacacional" color="cyan" />
              )}
            </div>

            <DetailSection title="Temperatura y estacionalidad">
              <DetailCard label="Temperatura mínima" value={`${formatNumber(detail.temp_min_c)} °C`} icon={Thermometer} />
              <DetailCard label="Temperatura máxima" value={`${formatNumber(detail.temp_max_c)} °C`} icon={Sun} />
              <DetailCard label="Temperatura media" value={`${formatNumber(detail.temperatura_media_c, 2)} °C`} icon={Thermometer} />
              <DetailCard label="Amplitud térmica" value={`${formatNumber(detail.amplitud_termica_c, 2)} °C`} icon={Activity} />
              <DetailCard label="Factor estacional" value={detail.factor_estacional.toFixed(4)} icon={GaugeIcon} />
              <DetailCard label="Ajuste de referencia" value={`${detail.ajuste_estacional_pct >= 0 ? "+" : ""}${formatNumber(detail.ajuste_estacional_pct, 2)}%`} icon={Activity} />
            </DetailSection>

            <DetailSection title="Actividad energética">
              <DetailCard label="Consumo total" value={`${formatNumber(detail.consumo_total_kwh, 2)} kWh`} icon={Zap} />
              <DetailCard label="Promedio por medidor" value={`${formatNumber(detail.consumo_promedio_medidor_kwh, 2)} kWh`} icon={Activity} />
              <DetailCard label="Hora pico" value={detail.hora_pico === null ? "Sin dato" : `${String(detail.hora_pico).padStart(2, "0")}:00`} icon={Clock3} />
              <DetailCard label="Lecturas recibidas" value={detail.lecturas.toLocaleString("es-MX")} icon={CalendarDays} />
              <DetailCard label="Medidores con lectura" value={detail.medidores_con_lectura.toLocaleString("es-MX")} icon={Activity} />
            </DetailSection>

            <DetailSection title="Eventos y alertas">
              <DetailCard label="Eventos detectados" value={detail.eventos.toLocaleString("es-MX")} icon={AlertTriangle} />
              <DetailCard label="Alertas generadas" value={detail.alertas.toLocaleString("es-MX")} icon={Bell} />
            </DetailSection>

            <div className="rounded-2xl bg-[var(--color-surface-2)] p-4 text-xs text-[var(--color-muted)]">
              El factor estacional representa un multiplicador de referencia. El porcentaje mostrado es el ajuste respecto a 1.0000, no una afirmación de que el consumo real haya cambiado en esa proporción.
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function GaugeIcon({ size = 17, className }: { size?: number; className?: string }) {
  return <Activity size={size} className={className} />;
}

function Badge({
  icon: Icon,
  text,
  color,
}: {
  icon: ComponentType<{ size?: number; className?: string }>;
  text: string;
  color: "indigo" | "orange" | "cyan";
}) {
  const classes = {
    indigo: "bg-[var(--color-info-soft)] text-[var(--color-info-strong)]",
    orange: "bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)]",
    cyan: "bg-[var(--color-info-soft)] text-[var(--color-info-strong)]",
  };

  return (
    <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold ${classes[color]}`}>
      <Icon size={13} />
      {text}
    </span>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-3 text-xs font-bold uppercase tracking-[.13em] text-[var(--color-muted)]">
        {title}
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function DetailCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div className="rounded-2xl bg-[var(--color-surface-2)] p-4">
      <Icon size={16} className="text-[var(--color-accent)]" />
      <p className="mt-2 text-[10px] text-[var(--color-muted)]">{label}</p>
      <p className="mt-1 text-sm font-bold text-[var(--color-fg)]">{value}</p>
    </div>
  );
}

export default function EnergyCalendar() {
  const [calendar, setCalendar] =
    useState<CalendarioEnergeticoResponse>(EMPTY_CALENDAR);
  const [year, setYear] = useState(2026);
  const [displayFilter, setDisplayFilter] =
    useState<DisplayFilter>("todos");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetalleDia | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCalendar = async () => {
      try {
        setLoading(true);
        setError(null);
        setCalendar(await obtenerCalendarioEnergetico(year, 1, 12));
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo cargar el calendario energético.",
        );
      } finally {
        setLoading(false);
      }
    };

    void loadCalendar();
  }, [year]);

  const visibleDays = useMemo(() => {
    if (displayFilter === "festivos") {
      return calendar.dias.filter((day) => day.es_festivo);
    }
    if (displayFilter === "vacacionales") {
      return calendar.dias.filter((day) => day.es_vacacional);
    }
    return calendar.dias;
  }, [calendar.dias, displayFilter]);

  const daysByMonth = useMemo(() => {
    const map = new Map<number, DiaCalendario[]>();
    for (const day of calendar.dias) {
      const month = parseLocalDate(day.fecha).getMonth() + 1;
      const days = map.get(month);
      if (days) days.push(day);
      else map.set(month, [day]);
    }
    return map;
  }, [calendar.dias]);

  const monthsWithData = useMemo(() => {
    const visibleDates = new Set(visibleDays.map((day) => day.fecha));
    return [...daysByMonth.entries()]
      .filter(([, days]) => days.some((day) => visibleDates.has(day.fecha)))
      .sort((a, b) => a[0] - b[0])
      .map(([month, days]) => ({
        month,
        days: days.filter((day) => visibleDates.has(day.fecha)),
      }));
  }, [daysByMonth, visibleDays]);

  const labelsMes = (month: number) =>
    MONTHS.find((item) => item.value === month)?.label ?? "";
  const primerMes = monthsWithData.length > 0 ? monthsWithData[0].month : null;
  const ultimoMes =
    monthsWithData.length > 0 ? monthsWithData[monthsWithData.length - 1].month : null;
  const rangoMeses =
    monthsWithData.length === 0
      ? "enero a diciembre"
      : monthsWithData.length === 1
        ? labelsMes(primerMes ?? 1)
        : `${labelsMes(primerMes ?? 1)} a ${labelsMes(ultimoMes ?? primerMes ?? 1)}`;
  const descripcionCalendario = `Festivos, vacaciones, temperatura y actividad energética de ${rangoMeses} de ${year}.`;

  const openDay = async (day: DiaCalendario) => {
    try {
      setSelectedDate(day.fecha);
      setDetail(null);
      setDetailLoading(true);
      setDetail(await obtenerDetalleDia(day.fecha));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar el detalle del día.",
      );
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-28 animate-pulse rounded-3xl bg-[var(--hero-bg)]" />
        <div className="grid gap-4 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-[620px] animate-pulse rounded-3xl bg-surface" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Calendario energético"
        description={descripcionCalendario}
        meta={
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-[var(--color-fg-secondary)]">
            <span className="flex items-center gap-1.5">
              <CakeSlice size={14} className="text-[var(--color-accent)]" /> Festivo
            </span>
            <span className="flex items-center gap-1.5">
              <Palmtree size={14} className="text-[var(--color-info)]" /> Vacacional
            </span>
            <span className="rounded-full bg-[var(--color-info-soft)] px-2.5 py-1">Sábado</span>
            <span className="rounded-full bg-[var(--color-accent-soft)] px-2.5 py-1">Domingo</span>
          </div>
        }
      />

      {error && (
        <div className="rounded-2xl bg-[var(--color-danger-soft)] p-4 text-xs text-[var(--color-danger-strong)]">
          {error}
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        <MetricCard icon={CalendarDays} label="Días registrados" value={calendar.resumen.dias_registrados.toLocaleString("es-MX")} color="var(--chart-2)" background="var(--color-info-soft)" />
        <MetricCard icon={CakeSlice} label="Días festivos" value={calendar.resumen.dias_festivos.toLocaleString("es-MX")} color="var(--color-accent)" background="var(--color-accent-soft)" />
        <MetricCard icon={Palmtree} label="Días vacacionales" value={calendar.resumen.dias_vacacionales.toLocaleString("es-MX")} color="var(--chart-5)" background="var(--color-info-soft)" />
        <MetricCard icon={Thermometer} label="Mínima del periodo" value={`${formatNumber(calendar.resumen.temperatura_minima_c)} °C`} color="var(--color-info)" background="var(--color-info-soft)" />
        <MetricCard icon={Sun} label="Máxima del periodo" value={`${formatNumber(calendar.resumen.temperatura_maxima_c)} °C`} color="var(--color-danger-strong)" background="var(--color-danger-soft)" />
        <MetricCard icon={Activity} label="Factor promedio" value={formatNumber(calendar.resumen.factor_estacional_promedio, 4)} color="var(--color-success-strong)" background="var(--color-success-soft)" />
      </section>

      <section className="flex flex-wrap items-center gap-3 rounded-3xl border bg-surface p-4">
        <Filter size={16} className="text-[var(--color-info)]" />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setYear((current) => Math.max(2000, current - 1))}
            className="flex h-10 w-10 items-center justify-center rounded-xl border bg-[var(--color-bg)] text-[var(--color-fg-secondary)] transition hover:border-[var(--color-accent)]"
            aria-label="Año anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="rounded-xl border border-border bg-[var(--color-bg)] px-3 py-2 text-xs font-bold text-[var(--color-fg-secondary)]">
            Año {year}
          </span>
          <button
            type="button"
            onClick={() => setYear((current) => Math.min(2100, current + 1))}
            className="flex h-10 w-10 items-center justify-center rounded-xl border bg-[var(--color-bg)] text-[var(--color-fg-secondary)] transition hover:border-[var(--color-accent)]"
            aria-label="Año siguiente"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            ["todos", "Todos los días"],
            ["festivos", "Solo festivos"],
            ["vacacionales", "Solo vacacionales"],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              aria-pressed={displayFilter === value}
              onClick={() => setDisplayFilter(value as DisplayFilter)}
              className={`flex h-10 items-center rounded-xl px-3 text-xs font-bold ${
                displayFilter === value
                  ? "bg-[var(--hero-bg)] text-white"
                  : "bg-[var(--color-bg)] text-[var(--color-fg-secondary)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-[11px] text-[var(--color-muted)]">
          {visibleDays.length} días visibles
        </span>
      </section>

      {monthsWithData.length > 0 ? (
        <section className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
          {monthsWithData.map(({ month, days }) => (
            <MonthCalendar
              key={month}
              month={month}
              year={year}
              days={days}
              selectedDate={selectedDate}
              onSelect={(day) => void openDay(day)}
            />
          ))}
        </section>
      ) : (
        <div className="card p-8 text-center text-sm text-[var(--color-muted)]">
          No hay días registrados para el año {year} con los filtros seleccionados.
        </div>
      )}

      <p className="text-center text-[10px] text-[var(--color-muted)]">
        Selecciona cualquier día para consultar temperatura, factor estacional, consumo, lecturas, eventos y alertas.
      </p>

      {selectedDate && (
        <DetailPanel
          detail={detail}
          loading={detailLoading}
          onClose={() => {
            setSelectedDate(null);
            setDetail(null);
          }}
        />
      )}
    </div>
  );
}


