import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  CakeSlice,
  CalendarDays,
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

const MONTHS = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
];

const WEEK_DAYS = ["L", "M", "M", "J", "V", "S", "D"];

const EMPTY_CALENDAR: CalendarioEnergeticoResponse = {
  anio: 2026,
  mes_inicio: 1,
  mes_fin: 3,
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
    return "border-orange-200 bg-gradient-to-br from-orange-50 to-cyan-50";
  }
  if (day.es_festivo) return "border-orange-200 bg-orange-50";
  if (day.es_vacacional) return "border-cyan-200 bg-cyan-50";

  const weekDay = parseLocalDate(day.fecha).getDay();
  if (weekDay === 0) return "border-violet-100 bg-violet-50/55";
  if (weekDay === 6) return "border-blue-100 bg-blue-50/55";
  return "border-[#eceef4] bg-white";
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
    <article className="rounded-2xl border bg-white p-4 shadow-sm">
      <div
        className="flex h-9 w-9 items-center justify-center rounded-xl"
        style={{ background }}
      >
        <Icon size={17} style={{ color }} />
      </div>
      <p className="mt-3 text-[10px] text-[#9098b1]">{label}</p>
      <p className="text-lg font-bold text-[#1a1a2e]">{value}</p>
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
      className={`min-h-[94px] rounded-2xl border p-2.5 text-left transition hover:-translate-y-0.5 hover:shadow-lg ${getDayBackground(
        day,
      )} ${selected ? "ring-2 ring-orange-400" : ""}`}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-xs font-extrabold text-[#30364a]">
          {date.getDate()}
        </span>
        <div className="flex items-center gap-1">
          {day.es_festivo && (
            <span title="Día festivo" className="rounded-lg bg-orange-100 p-1 text-orange-600">
              <CakeSlice size={13} />
            </span>
          )}
          {day.es_vacacional && (
            <span title="Día vacacional" className="rounded-lg bg-cyan-100 p-1 text-cyan-700">
              <Palmtree size={13} />
            </span>
          )}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px]">
        <span className="font-semibold text-blue-600">
          {formatNumber(day.temp_min_c)}°
        </span>
        <span className="font-semibold text-orange-600">
          {formatNumber(day.temp_max_c)}°
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="rounded-full bg-white/85 px-2 py-0.5 text-[8px] font-bold text-[#606881]">
          Tipo {day.tipo_dia}
        </span>
        <span className="text-[8px] font-semibold text-[#9098b1]">
          F {day.factor_estacional.toFixed(3)}
        </span>
      </div>
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
    <section className="rounded-3xl border bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold capitalize text-[#1a1a2e]">
            {MONTHS.find((item) => item.value === month)?.label} {year}
          </h2>
          <p className="text-[10px] text-[#9098b1]">
            {days.length} días registrados
          </p>
        </div>
        <CalendarDays size={19} className="text-orange-500" />
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {WEEK_DAYS.map((day, index) => (
          <div
            key={`${day}-${index}`}
            className="py-1 text-center text-[9px] font-bold text-[#9098b1]"
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
                className="min-h-[94px] rounded-2xl bg-[#f6f7fa] p-2 text-[10px] text-[#b4b9c8]"
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
      className="fixed inset-0 z-50 flex justify-end bg-[#171827]/35 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <aside
        className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-orange-500">
              Detalle energético del día
            </p>
            <h2 className="mt-1 text-lg font-bold capitalize text-[#1a1a2e]">
              {detail ? fullDate(detail.fecha) : "Consultando fecha..."}
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

        {loading || !detail ? (
          <div className="flex items-center justify-center gap-3 p-14 text-sm text-[#9098b1]">
            <RefreshCw size={18} className="animate-spin text-orange-500" />
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

            <div className="rounded-2xl bg-[#f8f9fc] p-4 text-xs text-[#747b91]">
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
  icon: typeof CalendarDays;
  text: string;
  color: "indigo" | "orange" | "cyan";
}) {
  const classes = {
    indigo: "bg-indigo-50 text-indigo-700",
    orange: "bg-orange-50 text-orange-700",
    cyan: "bg-cyan-50 text-cyan-700",
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
      <h3 className="mb-3 text-xs font-bold uppercase tracking-[.13em] text-[#9098b1]">
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
  icon: typeof CalendarDays;
}) {
  return (
    <div className="rounded-2xl bg-[#f8f9fc] p-4">
      <Icon size={16} className="text-orange-500" />
      <p className="mt-2 text-[10px] text-[#9098b1]">{label}</p>
      <p className="mt-1 text-sm font-bold text-[#1a1a2e]">{value}</p>
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
        setCalendar(await obtenerCalendarioEnergetico(year, 1, 3));
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
    for (const month of MONTHS) map.set(month.value, []);
    for (const day of visibleDays) {
      const month = parseLocalDate(day.fecha).getMonth() + 1;
      map.set(month, [...(map.get(month) ?? []), day]);
    }
    return map;
  }, [visibleDays]);

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
        <div className="h-28 animate-pulse rounded-3xl bg-[#171827]" />
        <div className="grid gap-4 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-[620px] animate-pulse rounded-3xl bg-white" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="rounded-3xl bg-[#171827] p-6 text-white">
        <p className="text-[10px] font-bold uppercase tracking-[.18em] text-orange-300">
          Planeación y contexto
        </p>
        <div className="mt-1 flex justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Calendario Energético</h1>
            <p className="mt-2 text-xs text-white/60">
              Festivos, vacaciones, temperatura y actividad energética de enero a marzo.
            </p>
          </div>
          <CalendarDays size={30} className="text-orange-400" />
        </div>
      </header>

      {error && (
        <div className="rounded-2xl bg-red-50 p-4 text-xs text-red-700">
          {error}
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        <MetricCard icon={CalendarDays} label="Días registrados" value={calendar.resumen.dias_registrados.toLocaleString("es-MX")} color="#6366f1" background="#eef2ff" />
        <MetricCard icon={CakeSlice} label="Días festivos" value={calendar.resumen.dias_festivos.toLocaleString("es-MX")} color="#f97316" background="#fff4ea" />
        <MetricCard icon={Palmtree} label="Días vacacionales" value={calendar.resumen.dias_vacacionales.toLocaleString("es-MX")} color="#0891b2" background="#ecfeff" />
        <MetricCard icon={Thermometer} label="Mínima del periodo" value={`${formatNumber(calendar.resumen.temperatura_minima_c)} °C`} color="#2563eb" background="#eff6ff" />
        <MetricCard icon={Sun} label="Máxima del periodo" value={`${formatNumber(calendar.resumen.temperatura_maxima_c)} °C`} color="#dc2626" background="#fef2f2" />
        <MetricCard icon={Activity} label="Factor promedio" value={formatNumber(calendar.resumen.factor_estacional_promedio, 4)} color="#059669" background="#ecfdf5" />
      </section>

      <section className="flex flex-wrap items-center gap-3 rounded-3xl border bg-white p-4">
        <Filter size={16} className="text-indigo-500" />
        <label className="text-[10px] font-bold text-[#9098b1]">
          AÑO
          <select value={year} onChange={(event) => setYear(Number(event.target.value))} className="ml-2 rounded-xl border px-3 py-2 text-xs text-[#1a1a2e]">
            <option value={2026}>2026</option>
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          {[
            ["todos", "Todos los días"],
            ["festivos", "Solo festivos"],
            ["vacacionales", "Solo vacacionales"],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              onClick={() => setDisplayFilter(value as DisplayFilter)}
              className={`rounded-xl px-3 py-2 text-xs font-bold ${
                displayFilter === value
                  ? "bg-[#171827] text-white"
                  : "bg-[#f2f3f7] text-[#606881]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap gap-3 text-[10px] text-[#606881]">
          <span className="flex items-center gap-1"><CakeSlice size={13} className="text-orange-500" />Festivo</span>
          <span className="flex items-center gap-1"><Palmtree size={13} className="text-cyan-600" />Vacacional</span>
          <span className="rounded bg-blue-50 px-2 py-1">Sábado</span>
          <span className="rounded bg-violet-50 px-2 py-1">Domingo</span>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {MONTHS.map((month) => (
          <MonthCalendar
            key={month.value}
            month={month.value}
            year={year}
            days={daysByMonth.get(month.value) ?? []}
            selectedDate={selectedDate}
            onSelect={(day) => void openDay(day)}
          />
        ))}
      </section>

      <p className="text-center text-[10px] text-[#9098b1]">
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
