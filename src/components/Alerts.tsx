import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Gauge,
  MapPin,
  Radio,
  RefreshCw,
  Search,
  Server,
  SlidersHorizontal,
  X,
  Zap,
} from "lucide-react";
import {
  obtenerAlertas,
  obtenerCatalogosAlertas,
  type Alerta,
  type CatalogosAlertas,
  type FiltrosAlertas,
} from "../services/alertasService";
import { PageHeader } from "./ui/PageHeader";

const PAGE_SIZE = 12;
const MONTHS = [
  { value: 0, label: "Todos los meses" },
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
];

const EMPTY_CATALOGS: CatalogosAlertas = {
  tipos_evento: [],
  zonas: [],
  servicios: [],
  medidores: [],
  anio_referencia: new Date().getFullYear(),
};

function formatDateTime(value: string | null): string {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatNumber(value: number | null, digits = 3): string {
  return value === null
    ? "Sin dato"
    : value.toLocaleString("es-MX", { maximumFractionDigits: digits });
}

function priorityLabel(priority: number): string {
  if (priority === 1) return "Baja";
  if (priority === 2) return "Media";
  if (priority === 3) return "Alta";
  return `Prioridad ${priority}`;
}

function priorityStyle(priority: number) {
  if (priority >= 3) return { color: "var(--color-danger-strong)", background: "var(--color-danger-soft)" };
  if (priority === 2) return { color: "var(--color-warning-strong)", background: "var(--color-warning-soft)" };
  return { color: "var(--color-info-strong)", background: "var(--color-info-soft)" };
}

function qualityPercentage(value: number): number {
  return Math.max(0, Math.min(100, value <= 1 ? value * 100 : value));
}

function qualityColor(value: number): string {
  if (value >= 80) return "var(--color-success)";
  if (value >= 50) return "var(--color-warning)";
  return "var(--color-danger)";
}

function effectStyle(effect: string) {
  const normalized = effect.toUpperCase();
  if (normalized === "INCREMENTO") return "bg-[var(--color-danger-soft)] text-[var(--color-danger-strong)]";
  if (normalized === "REDUCCION") return "bg-[var(--color-info-soft)] text-[var(--color-info-strong)]";
  if (normalized === "CONGELAMIENTO") return "bg-[var(--color-info-soft)] text-[var(--color-info-strong)]";
  return "bg-[var(--color-surface-3)] text-[var(--color-fg-secondary)]";
}

interface AlertDetailProps {
  alert: Alerta;
  onClose: () => void;
}

function AlertDetail({ alert, onClose }: AlertDetailProps) {
  const style = priorityStyle(alert.prioridad);
  const quality = qualityPercentage(alert.calidad_enlace);
  const linkColor = qualityColor(quality);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-overlay backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <aside
        className="h-full w-full max-w-2xl overflow-y-auto bg-surface shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-surface p-6">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{ background: style.background }}
            >
              <AlertTriangle size={22} color={style.color} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[var(--color-muted)]">
                Alerta #{alert.id_alerta}
              </p>
              <h2 className="text-lg font-bold text-[var(--color-fg)]">
                {alert.tipo_evento_nombre}
              </h2>
              <p className="text-xs text-[var(--color-muted)]">
                {alert.tipo_evento_clave} · {alert.estado}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-bg)]"
          >
            <X size={15} />
          </button>
        </header>

        <div className="space-y-6 p-6">
          <section className="grid gap-3 sm:grid-cols-2">
            <DetailCard label="Prioridad" value={priorityLabel(alert.prioridad)} color={style.color} background={style.background} />
            <DetailCard label="Estado" value={alert.estado} color={alert.estado === "Activa" ? "var(--color-danger-strong)" : "var(--color-success-strong)"} background={alert.estado === "Activa" ? "var(--color-danger-soft)" : "var(--color-success-soft)"} />
            <DetailCard label="Generación" value={formatDateTime(alert.ts_generacion)} />
            <DetailCard label="Cierre" value={alert.ts_cierre ? formatDateTime(alert.ts_cierre) : "Pendiente de cierre"} />
            <DetailCard label="Resultado" value={alert.resultado ?? "Sin resultado"} />
            <DetailCard label="ID de evento" value={alert.id_evento === null ? "Sin evento asociado" : String(alert.id_evento)} />
          </section>

          <section>
            <SectionTitle>Clasificación del evento</SectionTitle>
            <div className="rounded-3xl border p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-[var(--color-fg)]">{alert.tipo_evento_nombre}</p>
                  <p className="mt-1 text-xs font-semibold text-[var(--chart-2)]">{alert.tipo_evento_clave}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${effectStyle(alert.tipo_evento_efecto)}`}>
                  {alert.tipo_evento_efecto}
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <SmallInfo label="Regla" value={alert.tipo_evento_regla} />
                <SmallInfo label="Duración esperada" value={`${alert.tipo_evento_duracion_min_h}–${alert.tipo_evento_duracion_max_h} h`} />
                <SmallInfo label="Afecta acumulado" value={alert.tipo_evento_afecta_acumulado ? "Sí" : "No"} />
              </div>
            </div>
          </section>

          <section>
            <SectionTitle>Evento asociado</SectionTitle>
            {alert.id_evento === null ? (
              <div className="rounded-2xl bg-[var(--color-surface-2)] p-4 text-xs text-[var(--color-muted)]">La alerta no tiene un evento asociado.</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailCard label="Inicio" value={formatDateTime(alert.evento_ts_inicio)} />
                <DetailCard label="Fin" value={formatDateTime(alert.evento_ts_fin)} />
                <DetailCard label="Intensidad" value={formatNumber(alert.evento_intensidad)} />
                <DetailCard label="kWh desviados" value={`${formatNumber(alert.evento_kwh_desviados, 4)} kWh`} />
              </div>
            )}
          </section>

          <section>
            <SectionTitle>Medidor y calidad de enlace</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-[var(--color-surface-2)] p-4">
                <div className="flex items-center gap-3">
                  <Radio size={18} className="text-[var(--chart-2)]" />
                  <div>
                    <p className="text-[10px] text-[var(--color-muted)]">Medidor</p>
                    <p className="text-sm font-bold">{alert.medidor_numero_serie}</p>
                    <p className="text-[10px] text-[var(--color-muted)]">{alert.medidor_marca} · ID {alert.id_medidor}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl bg-[var(--color-surface-2)] p-4">
                <div className="flex justify-between text-xs"><span>Calidad del enlace</span><b style={{ color: linkColor }}>{quality.toFixed(1)}%</b></div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-border)]"><div className="h-full rounded-full" style={{ width: `${quality}%`, background: linkColor }} /></div>
              </div>
            </div>
          </section>

          <section>
            <SectionTitle>Servicio y ubicación</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-[var(--color-surface-2)] p-4"><Server size={17} className="text-[var(--color-accent)]" /><p className="mt-2 text-sm font-bold">{alert.servicio_nombre}</p><p className="text-[10px] text-[var(--color-muted)]">RPU {alert.servicio_rpu} · ID {alert.id_servicio}</p></div>
              <div className="rounded-2xl bg-[var(--color-surface-2)] p-4"><MapPin size={17} className="text-[var(--color-info)]" /><p className="mt-2 text-sm font-bold">{alert.zona_nombre}</p><p className="text-[10px] text-[var(--color-muted)]">ID {alert.id_zona}</p></div>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-3 text-xs font-bold uppercase tracking-[.13em] text-[var(--color-muted)]">{children}</h3>;
}

function DetailCard({ label, value, color = "var(--color-fg-secondary)", background = "var(--color-surface-2)" }: { label:string; value:string; color?:string; background?:string }) {
  return <div className="rounded-2xl p-4" style={{ background }}><p className="text-[10px] text-[var(--color-muted)]">{label}</p><p className="mt-1 text-sm font-bold" style={{ color }}>{value}</p></div>;
}

function SmallInfo({ label, value }: { label:string; value:string }) {
  return <div className="rounded-xl bg-[var(--color-surface-2)] p-3"><p className="text-[9px] text-[var(--color-muted)]">{label}</p><p className="mt-1 break-words text-xs font-bold">{value}</p></div>;
}

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alerta[]>([]);
  const [catalogs, setCatalogs] = useState<CatalogosAlertas>(EMPTY_CATALOGS);
  const [month, setMonth] = useState(0);
  const [zoneId, setZoneId] = useState(0);
  const [serviceId, setServiceId] = useState(0);
  const [meterId, setMeterId] = useState(0);
  const [eventTypeId, setEventTypeId] = useState(0);
  const [status, setStatus] = useState("Todos");
  const [priority, setPriority] = useState(0);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Alerta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCatalogs = async () => {
      try {
        setLoading(true);
        setCatalogs(await obtenerCatalogosAlertas());
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudieron cargar los catálogos.");
      } finally {
        setLoading(false);
      }
    };
    void loadCatalogs();
  }, []);

  const visibleServices = useMemo(
    () => catalogs.servicios.filter((item) => !zoneId || item.id_zona === zoneId),
    [catalogs.servicios, zoneId],
  );
  const visibleMeters = useMemo(
    () => catalogs.medidores.filter((item) => !serviceId || item.id_servicio === serviceId),
    [catalogs.medidores, serviceId],
  );

  const filters = useMemo<FiltrosAlertas>(() => ({
    mes: month || undefined,
    anio: catalogs.anio_referencia,
    idZona: zoneId || undefined,
    idServicio: serviceId || undefined,
    idMedidor: meterId || undefined,
    idTipoEvento: eventTypeId || undefined,
    estado: status === "Todos" ? undefined : status as "Activa" | "Cerrada",
    prioridad: priority || undefined,
  }), [month, catalogs.anio_referencia, zoneId, serviceId, meterId, eventTypeId, status, priority]);

  const loadAlerts = async () => {
    try {
      setUpdating(true);
      setError(null);
      setAlerts(await obtenerAlertas(filters));
      setPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las alertas.");
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    if (!loading) void loadAlerts();
  }, [filters, loading]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return alerts;
    return alerts.filter((item) => [
      item.id_alerta,
      item.tipo_evento_clave,
      item.tipo_evento_nombre,
      item.tipo_evento_efecto,
      item.medidor_numero_serie,
      item.servicio_nombre,
      item.servicio_rpu,
      item.zona_nombre,
      item.resultado ?? "",
    ].some((value) => String(value).toLowerCase().includes(query)));
  }, [alerts, search]);

  const active = alerts.filter((item) => item.estado === "Activa").length;
  const closed = alerts.filter((item) => item.estado === "Cerrada").length;
  const high = alerts.filter((item) => item.prioridad >= 3).length;
  const affectedMeters = new Set(alerts.map((item) => item.id_medidor)).size;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const resetFilters = () => {
    setMonth(0); setZoneId(0); setServiceId(0); setMeterId(0);
    setEventTypeId(0); setStatus("Todos"); setPriority(0); setSearch("");
  };

  if (loading) return <div className="rounded-3xl bg-surface p-10 text-center"><RefreshCw className="mx-auto animate-spin text-[var(--color-accent)]" /><p className="mt-3 text-sm text-[var(--color-muted)]">Cargando módulo de alertas...</p></div>;

  return (
    <div className="relative flex flex-col gap-6">
      {updating && <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-overlay backdrop-blur-[2px]"><div className="rounded-3xl bg-surface px-8 py-6 text-center shadow-2xl"><RefreshCw className="mx-auto animate-spin text-[var(--color-accent)]" /><p className="mt-3 text-sm font-bold">Actualizando alertas</p></div></div>}

      <PageHeader
        title="Alertas"
        description="Eventos detectados, clasificación, medidores y servicios afectados."
      />

      {error && <div className="rounded-2xl bg-[var(--color-danger-soft)] p-4 text-xs text-[var(--color-danger-strong)]">{error}</div>}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric label="Alertas registradas" value={alerts.length} icon={CircleAlert} color="var(--chart-2)" />
        <Metric label="Alertas activas" value={active} icon={AlertTriangle} color="var(--color-danger)" />
        <Metric label="Prioridad alta" value={high} icon={Gauge} color="var(--color-warning)" />
        <Metric label="Medidores afectados" value={affectedMeters} icon={Radio} color="var(--color-success)" note={`${closed} alertas cerradas`} />
      </section>

      <section className="rounded-3xl border bg-surface p-5">
        <div className="mb-4 flex items-center gap-2"><SlidersHorizontal size={16} className="text-[var(--color-info)]" /><h2 className="text-sm font-bold">Filtros</h2></div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Filter label="MES"><select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-full rounded-xl border bg-surface px-3 py-2.5 text-sm text-[var(--color-fg)]">{MONTHS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Filter>
          <Filter label="ZONA"><select value={zoneId} onChange={(e) => { setZoneId(Number(e.target.value)); setServiceId(0); setMeterId(0); }} className="w-full rounded-xl border bg-surface px-3 py-2.5 text-sm text-[var(--color-fg)]"><option value={0}>Todas las zonas</option>{catalogs.zonas.map((item) => <option key={item.id_zona} value={item.id_zona}>{item.nombre}</option>)}</select></Filter>
          <Filter label="SERVICIO"><select value={serviceId} onChange={(e) => { setServiceId(Number(e.target.value)); setMeterId(0); }} className="w-full rounded-xl border bg-surface px-3 py-2.5 text-sm text-[var(--color-fg)]"><option value={0}>Todos los servicios</option>{visibleServices.map((item) => <option key={item.id_servicio} value={item.id_servicio}>{item.nombre} · {item.rpu}</option>)}</select></Filter>
          <Filter label="MEDIDOR"><select value={meterId} onChange={(e) => setMeterId(Number(e.target.value))} className="w-full rounded-xl border bg-surface px-3 py-2.5 text-sm text-[var(--color-fg)]"><option value={0}>Todos los medidores</option>{visibleMeters.map((item) => <option key={item.id_medidor} value={item.id_medidor}>{item.numero_serie}</option>)}</select></Filter>
          <Filter label="CATEGORÍA DE EVENTO"><select value={eventTypeId} onChange={(e) => setEventTypeId(Number(e.target.value))} className="w-full rounded-xl border bg-surface px-3 py-2.5 text-sm text-[var(--color-fg)]"><option value={0}>Todas las categorías</option>{catalogs.tipos_evento.map((item) => <option key={item.id_tipo_evento} value={item.id_tipo_evento}>{item.nombre}</option>)}</select></Filter>
          <Filter label="ESTADO"><select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-xl border bg-surface px-3 py-2.5 text-sm text-[var(--color-fg)]"><option>Todos</option><option>Activa</option><option>Cerrada</option></select></Filter>
          <Filter label="PRIORIDAD"><select value={priority} onChange={(e) => setPriority(Number(e.target.value))} className="w-full rounded-xl border bg-surface px-3 py-2.5 text-sm text-[var(--color-fg)]"><option value={0}>Todas</option><option value={1}>Baja</option><option value={2}>Media</option><option value={3}>Alta</option></select></Filter>
          <div className="flex items-end"><button type="button" onClick={resetFilters} className="w-full rounded-xl bg-[var(--color-bg)] px-3 py-2.5 text-xs font-bold">Restablecer filtros</button></div>
        </div>
        <div className="relative mt-4"><Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" /><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar por categoría, clave, medidor, RPU, servicio o zona..." aria-label="Buscar alertas" className="w-full rounded-2xl border bg-[var(--color-surface-2)] py-3 pl-10 pr-4 text-sm" /></div>
      </section>

      {paged.length === 0 ? <div className="rounded-3xl border bg-surface p-10 text-center text-sm text-[var(--color-muted)]">No se encontraron alertas con los filtros seleccionados.</div> : <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{paged.map((alert) => { const style = priorityStyle(alert.prioridad); return <button type="button" key={alert.id_alerta} onClick={() => setSelected(alert)} className="rounded-3xl border bg-surface p-5 text-left transition hover:-translate-y-0.5 hover:shadow-xl"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: style.background }}><AlertTriangle size={19} color={style.color} /></div><div className="min-w-0"><p className="text-[10px] text-[var(--color-muted)]">Alerta #{alert.id_alerta}</p><p className="truncate text-sm font-bold">{alert.tipo_evento_nombre}</p><p className="mt-1 truncate text-[10px] font-semibold text-[var(--color-info-strong)]">{alert.tipo_evento_clave}</p></div></div><span className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${alert.estado === "Activa" ? "bg-[var(--color-danger-soft)] text-[var(--color-danger-strong)]" : "bg-[var(--color-success-soft)] text-[var(--color-success-strong)]"}`}>{alert.estado}</span></div><div className="mt-4 flex items-center justify-between"><span className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${effectStyle(alert.tipo_evento_efecto)}`}>{alert.tipo_evento_efecto}</span><span className="text-[10px] text-[var(--color-muted)]">{formatDateTime(alert.ts_generacion)}</span></div><div className="mt-4 grid grid-cols-2 gap-2"><SmallInfo label="Medidor" value={alert.medidor_numero_serie} /><SmallInfo label="Servicio" value={alert.servicio_nombre} /></div><div className="mt-3 flex items-center justify-between border-t pt-3"><span className="truncate text-[10px] text-[var(--color-muted)]"><MapPin size={11} className="mr-1 inline" />{alert.zona_nombre}</span><span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: style.color }}>{priorityLabel(alert.prioridad)}<ChevronRight size={13} /></span></div></button>; })}</section>}

      <nav className="flex items-center justify-center gap-3"><button type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-xl border px-4 py-2 text-xs disabled:opacity-40"><ChevronLeft size={13} className="mr-1 inline" />Anterior</button><span className="text-xs text-[var(--color-muted)]">{currentPage} / {totalPages} · {filtered.length} registros</span><button type="button" disabled={currentPage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="rounded-xl border px-4 py-2 text-xs disabled:opacity-40">Siguiente<ChevronRight size={13} className="ml-1 inline" /></button></nav>

      {selected && <AlertDetail alert={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function Metric({ label, value, icon: Icon, color, note }: { label:string; value:number; icon:typeof CircleAlert; color:string; note?:string }) {
  return <div className="rounded-2xl border bg-surface p-4"><Icon size={17} style={{ color }} /><p className="mt-3 text-[10px] text-[var(--color-muted)]">{label}</p><p className="text-xl font-bold">{value.toLocaleString("es-MX")}</p>{note && <p className="text-[9px] text-[var(--color-muted)]">{note}</p>}</div>;
}

function Filter({ label, children }: { label:string; children:React.ReactNode }) {
  return <label className="text-[10px] font-bold text-[var(--color-muted)]">{label}<div className="mt-1.5">{children}</div></label>;
}

