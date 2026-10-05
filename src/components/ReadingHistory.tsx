import { useEffect, useMemo, useState } from "react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  AlertTriangle, BarChart3, CalendarDays, ChevronLeft, ChevronRight,
  Download, Eye, FileSearch, Filter, Gauge, RefreshCw, Search, X,
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
import { obtenerZonas, type Zona } from "../services/zonasService";

const EMPTY_RESULT: HistorialPaginado = {
  items: [], total: 0, pagina: 1, por_pagina: 50, total_paginas: 1,
};

const toApiDate = (value: string): string | undefined =>
  value ? new Date(value).toISOString() : undefined;

const formatDateTime = (value: string): string =>
  new Date(value).toLocaleString("es-MX", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

const fmt = (value: number | null, digits = 3): string =>
  value === null
    ? "Sin dato"
    : value.toLocaleString("es-MX", { maximumFractionDigits: digits });

const qualityPercent = (value: number): number =>
  Math.max(0, Math.min(100, value <= 1 ? value * 100 : value));

interface DetailProps {
  lectura: (LecturaHistorial & { clave_registro?: string }) | null;
  loading: boolean;
  onClose: () => void;
}

function ReadingDetail({ lectura, loading, onClose }: DetailProps) {
  if (!lectura && !loading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1a2e]/30 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#f0f1f7] p-6">
          <div>
            <h2 className="text-lg font-bold text-[#1a1a2e]">Registro original</h2>
            <p className="text-xs text-[#9098b1]">
              {lectura?.clave_registro ?? "Consultando PostgreSQL..."}
            </p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f2f3f7]">
            <X size={14} className="text-[#9098b1]" />
          </button>
        </div>

        {loading || !lectura ? (
          <div className="p-10 text-center text-sm text-[#9098b1]">Cargando registro...</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 p-6 sm:grid-cols-2">
            {[
              ["Fecha y hora", formatDateTime(lectura.ts)],
              ["Medidor", lectura.numero_serie],
              ["Marca", lectura.marca],
              ["Zona", lectura.zona_nombre],
              ["Servicio", lectura.servicio_nombre],
              ["RPU", lectura.servicio_rpu],
              ["Consumo calculado", lectura.consumo_kwh === null ? "Sin dato" : `${fmt(lectura.consumo_kwh)} kWh`],
              ["Consumo real", `${fmt(lectura.consumo_real_kwh)} kWh`],
              ["Calidad del enlace", `${qualityPercent(lectura.calidad_enlace).toFixed(2)}%`],
              ["Estado", lectura.estado],
              ["Evento", lectura.id_evento === null ? "Sin evento" : `#${lectura.id_evento}`],
              ["Voltaje", lectura.voltaje === null ? "No disponible" : `${fmt(lectura.voltaje)} V`],
              ["Corriente", lectura.corriente === null ? "No disponible" : `${fmt(lectura.corriente)} A`],
              ["Potencia", lectura.potencia === null ? "No disponible" : `${fmt(lectura.potencia)} kW`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-[#f8f9fc] p-4">
                <p className="text-[10px] text-[#9098b1]">{label}</p>
                <p className="mt-1 text-sm font-bold text-[#1a1a2e]">{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReadingHistory() {
  const [data, setData] = useState<HistorialPaginado>(EMPTY_RESULT);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(50);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [busquedaMedidor, setBusquedaMedidor] = useState("");
  const [idZona, setIdZona] = useState("");
  const [orden, setOrden] = useState<"asc" | "desc">("desc");
  const [agrupacion, setAgrupacion] = useState<"hora" | "dia" | "mes">("dia");
  const [agrupados, setAgrupados] = useState<GrupoLecturas[]>([]);
  const [huecos, setHuecos] = useState<AnalisisHuecos | null>(null);
  const [showChart, setShowChart] = useState(true);
  const [showGaps, setShowGaps] = useState(false);
  const [selected, setSelected] = useState<(LecturaHistorial & { clave_registro?: string }) | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filtros = useMemo<FiltrosHistorial>(() => ({
    pagina,
    porPagina,
    desde: toApiDate(desde),
    hasta: toApiDate(hasta),
    idZona: idZona ? Number(idZona) : undefined,
    busquedaMedidor: busquedaMedidor.trim() || undefined,
    orden,
  }), [pagina, porPagina, desde, hasta, idZona, busquedaMedidor, orden]);

  const cargar = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const [historial, grupos] = await Promise.all([
        obtenerHistorial(filtros),
        obtenerLecturasAgrupadas(filtros, agrupacion),
      ]);
      setData(historial);
      setAgrupados(grupos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el historial.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void obtenerZonas().then(setZonas).catch(() => setZonas([]));
  }, []);

  useEffect(() => {
    void cargar();
  }, [pagina, porPagina, orden, agrupacion]);

  const aplicarFiltros = (): void => {
    if (pagina !== 1) setPagina(1);
    else void cargar();
  };

  const limpiarFiltros = (): void => {
    setDesde(""); setHasta(""); setBusquedaMedidor(""); setIdZona("");
    setOrden("desc"); setPagina(1);
    setTimeout(() => void cargar(), 0);
  };

  const cargarHuecos = async (): Promise<void> => {
    try {
      setError(null);
      const result = await detectarHuecos(filtros, 15);
      setHuecos(result);
      setShowGaps(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron detectar huecos.");
    }
  };

  const verOriginal = async (item: LecturaHistorial): Promise<void> => {
    try {
      setDetailLoading(true);
      setSelected(item);
      const original = await obtenerLecturaOriginal(item.id_medidor, item.ts);
      setSelected(original);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo consultar el registro.");
      setSelected(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const chartData = agrupados.map((item) => ({
    periodo: new Date(item.periodo).toLocaleString("es-MX", {
      month: "2-digit", day: "2-digit",
      ...(agrupacion === "hora" ? { hour: "2-digit" as const } : {}),
    }),
    consumo: item.consumo_total_kwh,
    promedio: item.consumo_promedio_kwh,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Historial de Lecturas</h1>
          <p className="text-sm text-[#9098b1]">Consulta paginada de registros almacenados en PostgreSQL</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setShowChart(!showChart)} className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-xs font-semibold text-[#606881]">
            <BarChart3 size={14} /> {showChart ? "Ocultar gráfica" : "Ver gráfica"}
          </button>
          <button type="button" onClick={() => void cargarHuecos()} className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-xs font-semibold text-[#606881]">
            <FileSearch size={14} /> Detectar huecos
          </button>
          <button type="button" onClick={() => void descargarHistorialCsv(filtros)} className="flex items-center gap-2 rounded-xl bg-[#10b981] px-3 py-2 text-xs font-semibold text-white">
            <Download size={14} /> Descargar CSV
          </button>
          <button type="button" onClick={() => void cargar()} className="flex items-center gap-2 rounded-xl bg-[#ff8a1f] px-3 py-2 text-xs font-semibold text-white">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Actualizar
          </button>
        </div>
      </div>

      {error && <div className="rounded-2xl bg-[#fef2f2] p-4 text-xs text-[#b91c1c]">{error}</div>}

      <div className="card p-4">
        <div className="mb-3 flex items-center gap-2"><Filter size={15} color="#6366f1"/><h2 className="text-sm font-semibold text-[#1a1a2e]">Filtros</h2></div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label><span className="mb-1 block text-[10px] font-semibold text-[#606881]">Desde</span><input type="datetime-local" value={desde} onChange={(e) => setDesde(e.target.value)} className="w-full rounded-xl border px-3 py-2 text-xs"/></label>
          <label><span className="mb-1 block text-[10px] font-semibold text-[#606881]">Hasta</span><input type="datetime-local" value={hasta} onChange={(e) => setHasta(e.target.value)} className="w-full rounded-xl border px-3 py-2 text-xs"/></label>
          <label className="relative"><span className="mb-1 block text-[10px] font-semibold text-[#606881]">Medidor</span><Search size={13} className="absolute bottom-2.5 left-3 text-[#9098b1]"/><input value={busquedaMedidor} onChange={(e) => setBusquedaMedidor(e.target.value)} placeholder="MEDI-2600000001-1" className="w-full rounded-xl border py-2 pl-9 pr-3 text-xs"/></label>
          <label><span className="mb-1 block text-[10px] font-semibold text-[#606881]">Zona</span><select value={idZona} onChange={(e) => setIdZona(e.target.value)} className="w-full rounded-xl border bg-white px-3 py-2 text-xs"><option value="">Todas</option>{zonas.map((z) => <option key={z.id_zona} value={z.id_zona}>{z.nombre}</option>)}</select></label>
          <label><span className="mb-1 block text-[10px] font-semibold text-[#606881]">Orden</span><select value={orden} onChange={(e) => setOrden(e.target.value as "asc" | "desc")} className="w-full rounded-xl border bg-white px-3 py-2 text-xs"><option value="desc">Más recientes</option><option value="asc">Más antiguas</option></select></label>
          <label><span className="mb-1 block text-[10px] font-semibold text-[#606881]">Agrupar gráfica</span><select value={agrupacion} onChange={(e) => setAgrupacion(e.target.value as "hora" | "dia" | "mes")} className="w-full rounded-xl border bg-white px-3 py-2 text-xs"><option value="hora">Por hora</option><option value="dia">Por día</option><option value="mes">Por mes</option></select></label>
        </div>
        <div className="mt-3 flex justify-end gap-2"><button type="button" onClick={limpiarFiltros} className="rounded-xl border px-4 py-2 text-xs font-semibold text-[#606881]">Limpiar</button><button type="button" onClick={aplicarFiltros} className="rounded-xl bg-[#6366f1] px-4 py-2 text-xs font-semibold text-white">Aplicar filtros</button></div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Registros encontrados", value: data.total.toLocaleString("es-MX"), icon: CalendarDays, color: "#6366f1", bg: "#eef2ff" },
          { label: "Página actual", value: `${data.pagina} / ${data.total_paginas}`, icon: FileSearch, color: "#ff8a1f", bg: "#fff4ea" },
          { label: "Consumo página", value: `${fmt(data.items.reduce((s, x) => s + x.consumo_real_kwh, 0))} kWh`, icon: Gauge, color: "#10b981", bg: "#ecfdf5" },
          { label: "Lecturas con evento", value: String(data.items.filter((x) => x.id_evento !== null).length), icon: AlertTriangle, color: "#ef4444", bg: "#fef2f2" },
        ].map((item) => (
          <div key={item.label} className="card p-4"><div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl" style={{background:item.bg}}><item.icon size={16} color={item.color}/></div><p className="text-[11px] text-[#9098b1]">{item.label}</p><p className="text-lg font-bold text-[#1a1a2e]">{item.value}</p></div>
        ))}
      </div>

      {showChart && (
        <div className="card p-5"><h3 className="text-sm font-semibold text-[#1a1a2e]">Gráfica agrupada</h3><p className="mb-4 text-[11px] text-[#9098b1]">Consumo total y promedio por {agrupacion}</p><ResponsiveContainer width="100%" height={260}><AreaChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#f0f1f7"/><XAxis dataKey="periodo" tick={{fontSize:9}}/><YAxis tick={{fontSize:10}}/><Tooltip/><Area type="monotone" dataKey="consumo" stroke="#ff8a1f" fill="#fff4ea" name="Consumo total"/><Area type="monotone" dataKey="promedio" stroke="#6366f1" fill="transparent" name="Promedio"/></AreaChart></ResponsiveContainer></div>
      )}

      {showGaps && huecos && (
        <div className="card p-5"><div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold text-[#1a1a2e]">Huecos de información</h3><p className="text-[11px] text-[#9098b1]">Intervalo esperado: {huecos.intervalo_esperado_minutos} minutos · {huecos.total_huecos} huecos</p></div><button type="button" onClick={() => setShowGaps(false)}><X size={15}/></button></div><div className="mt-4 max-h-64 overflow-y-auto">{huecos.huecos.length === 0 ? <p className="text-sm text-[#10b981]">No se detectaron huecos.</p> : huecos.huecos.map((h, i) => <div key={`${h.id_medidor}-${h.inicio_hueco}-${i}`} className="mb-2 grid grid-cols-1 gap-2 rounded-xl bg-[#fef2f2] p-3 text-xs md:grid-cols-4"><strong>{h.numero_serie}</strong><span>{formatDateTime(h.inicio_hueco)}</span><span>{formatDateTime(h.fin_hueco)}</span><span>{h.minutos_sin_datos.toFixed(0)} min · {h.lecturas_estimadas_faltantes} faltantes</span></div>)}</div></div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1350px] text-left text-xs">
            <thead className="bg-[#f8f9fc] text-[10px] uppercase text-[#9098b1]"><tr><th className="p-3">Fecha y hora</th><th>Medidor</th><th>Zona</th><th>Consumo real</th><th>Voltaje</th><th>Corriente</th><th>Potencia</th><th>Calidad</th><th>Estado</th><th>Acción</th></tr></thead>
            <tbody>{data.items.map((item) => <tr key={`${item.id_medidor}-${item.ts}`} className="border-t border-[#f0f1f7] hover:bg-[#fbfbfd]"><td className="p-3">{formatDateTime(item.ts)}</td><td><p className="font-bold text-[#1a1a2e]">{item.numero_serie}</p><p className="text-[9px] text-[#9098b1]">{item.marca}</p></td><td>{item.zona_nombre}</td><td className="font-bold text-[#ff8a1f]">{fmt(item.consumo_real_kwh)} kWh</td><td>{item.voltaje === null ? "—" : `${fmt(item.voltaje)} V`}</td><td>{item.corriente === null ? "—" : `${fmt(item.corriente)} A`}</td><td>{item.potencia === null ? "—" : `${fmt(item.potencia)} kW`}</td><td>{qualityPercent(item.calidad_enlace).toFixed(1)}%</td><td><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${item.estado === "Válida" ? "bg-[#ecfdf5] text-[#059669]" : item.estado === "Con evento" ? "bg-[#fffbeb] text-[#d97706]" : "bg-[#fef2f2] text-[#dc2626]"}`}>{item.estado}</span></td><td><button type="button" onClick={() => void verOriginal(item)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eef2ff] text-[#6366f1]" title="Ver registro original"><Eye size={14}/></button></td></tr>)}</tbody>
          </table>
        </div>
        {data.items.length === 0 && !loading && <div className="p-10 text-center text-sm text-[#9098b1]">No se encontraron lecturas.</div>}
      </div>

      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <div className="flex items-center gap-2 text-xs text-[#9098b1]">Mostrar<select value={porPagina} onChange={(e) => {setPorPagina(Number(e.target.value));setPagina(1);}} className="rounded-lg border bg-white px-2 py-1"><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option><option value={250}>250</option></select>por página</div>
        <div className="flex items-center gap-2"><button type="button" disabled={pagina === 1} onClick={() => setPagina((p) => Math.max(1,p-1))} className="flex items-center gap-1 rounded-xl border bg-white px-3 py-2 text-xs disabled:opacity-40"><ChevronLeft size={14}/>Anterior</button><span className="text-xs text-[#9098b1]">{pagina} / {data.total_paginas}</span><button type="button" disabled={pagina >= data.total_paginas} onClick={() => setPagina((p) => Math.min(data.total_paginas,p+1))} className="flex items-center gap-1 rounded-xl border bg-white px-3 py-2 text-xs disabled:opacity-40">Siguiente<ChevronRight size={14}/></button></div>
      </div>

      <ReadingDetail lectura={selected} loading={detailLoading} onClose={() => setSelected(null)} />
    </div>
  );
}
