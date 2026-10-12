import { useEffect, useMemo, useState } from "react";
import {
  Activity, Building2, ChevronLeft, ChevronRight, CircleDollarSign,
  Gauge, Leaf, MapPin, RefreshCw, Search, Sun, X, Zap,
} from "lucide-react";
import { obtenerServicios, type Servicio } from "../services/serviciosService";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const PAGE_SIZE = 12;
const COLORS = ["#ff8a1f", "#6366f1", "#10b981", "#f59e0b", "#06b6d4", "#ec4899", "#8b5cf6", "#14b8a6"];
const BACKGROUNDS = ["#fff4ea", "#eef2ff", "#ecfdf5", "#fffbeb", "#ecfeff", "#fdf2f8", "#f5f3ff", "#f0fdfa"];

interface MedidorServicio {
  id_medidor: number;
  numero_serie: string;
  es_principal: boolean;
  estado: string;
  calidad_enlace: number | null;
}

const fmt = (value: number | null | undefined): string => value == null ? "Sin dato" : value.toLocaleString("es-MX");
const formatText = (value: string): string => value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, character => character.toUpperCase());
const normalize = (value: string): string => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function typeImage(typeName: string, category: string): string {
  const text = normalize(`${typeName} ${category}`);
  if (text.includes("biblioteca")) return "/src/img/BibleotecaPublica.jpg";
  if (text.includes("cultural")) return "/src/img/CentroCultural.jpg";
  if (text.includes("deport")) return "/src/img/CentroDeportivo.jpg";
  if (text.includes("alumbrado")) return "/src/img/CircuitoAlumbrado.jpg";
  if (text.includes("departamento")) return "/src/img/Departamento.jpg";
  if (text.includes("disen") || text.includes("designer")) return "/src/img/Designer.jpg";
  if (text.includes("gobierno") || text.includes("gubernamental")) return "/src/img/EdificioGubernamental.png";
  if (text.includes("escuela")) return "/src/img/EscuelaPublica.png";
  if (text.includes("hospital") || text.includes("salud")) return "/src/img/Hospital.png";
  if (text.includes("local") || text.includes("comercial")) return "/src/img/Local.png";
  if (text.includes("mercado")) return "/src/img/Mercado.png";
  if (text.includes("semaforo")) return "/src/img/NodoSemaforo.png";
  if (text.includes("parque")) return "/src/img/Parque.png";
  if (text.includes("planta") || text.includes("industrial")) return "/src/img/Planta.png";
  if (text.includes("pozo")) return "/src/img/Pozo.png";
  if (text.includes("unifamiliar")) return "/src/img/ViviendaUnifamiliar.png";
  if (text.includes("residencial") || text.includes("vivienda")) return "/src/img/ViviendaAlto.png";
  return "/src/img/EdificioGubernamental.png";
}

function normalizeMeter(row: Record<string, unknown>): MedidorServicio {
  const state = String(row.estado ?? row.estado_operativo ?? row.estatus ?? (row.fecha_retiro ? "Retirado" : "Activo"));
  return {
    id_medidor: Number(row.id_medidor ?? 0),
    numero_serie: String(row.numero_serie ?? row.serie ?? row.codigo ?? `MED-${String(row.id_medidor ?? 0).padStart(5, "0")}`),
    es_principal: Boolean(row.es_principal ?? row.principal ?? row.tipo_medidor === "PRINCIPAL"),
    estado: formatText(state),
    calidad_enlace: row.calidad_enlace == null && row.calidad_senal == null ? null : Number(row.calidad_enlace ?? row.calidad_senal),
  };
}

interface ServicioDetailProps { servicio: Servicio; onClose: () => void; }
function ServicioDetail({ servicio, onClose }: ServicioDetailProps) {
  const [meters, setMeters] = useState<MedidorServicio[]>([]);
  const [loadingMeters, setLoadingMeters] = useState(true);
  const [meterError, setMeterError] = useState<string | null>(null);
  const color = COLORS[servicio.id_zona % COLORS.length];
  const background = BACKGROUNDS[servicio.id_zona % BACKGROUNDS.length];

  useEffect(() => {
    let active = true;
    const loadMeters = async () => {
      try {
        setLoadingMeters(true); setMeterError(null);
        const response = await fetch(`${API_URL}/api/medidores`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json() as Record<string, unknown>[];
        const related = data.filter(row => Number(row.id_servicio) === servicio.id_servicio).map(normalizeMeter);
        if (active) setMeters(related);
      } catch (error) {
        if (active) setMeterError(error instanceof Error ? error.message : "No se pudieron cargar los medidores");
      } finally { if (active) setLoadingMeters(false); }
    };
    void loadMeters();
    return () => { active = false; };
  }, [servicio.id_servicio]);

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1a2e]/30 p-4 backdrop-blur-sm">
    <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#f0f1f7] bg-white p-6">
        <div className="flex items-center gap-3"><div className="h-14 w-14 overflow-hidden rounded-2xl" style={{ background }}><img src={typeImage(servicio.tipo_servicio_nombre, servicio.tipo_servicio_categoria)} alt="" className="h-full w-full object-cover"/></div><div><h2 className="text-lg font-bold text-[#1a1a2e]">{servicio.nombre}</h2><p className="text-xs text-[#9098b1]">Servicio #{servicio.id_servicio} · RPU {servicio.rpu}</p></div></div>
        <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f2f3f7]"><X size={14}/></button>
      </div>
      <div className="flex flex-col gap-5 p-6">
        <section><h3 className="mb-3 text-sm font-semibold text-[#1a1a2e]">Información del servicio</h3><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
          ["Zona",servicio.zona_nombre],["Tipo",servicio.tipo_servicio_nombre],["Categoría",formatText(servicio.tipo_servicio_categoria)],["Ocupación",servicio.ocupacion_estimada==null?"Sin información":`${fmt(servicio.ocupacion_estimada)} personas`],
          ["Carga contratada",`${servicio.carga_contratada_kw.toLocaleString("es-MX",{maximumFractionDigits:2})} kW`],["Sistema solar",servicio.tiene_solar?"Sí":"No"],["Tarifa",`Tarifa #${servicio.id_tarifa}`],["Clave",servicio.tipo_servicio_clave],
        ].map(([label,value])=><div key={label} className="rounded-2xl bg-[#f8f9fc] p-3"><p className="text-[10px] text-[#9098b1]">{label}</p><p className="mt-1 text-sm font-bold text-[#1a1a2e]">{value}</p></div>)}</div></section>

        <section><div className="mb-3 flex items-center justify-between"><div><h3 className="text-sm font-semibold text-[#1a1a2e]">Medidores asociados</h3><p className="text-[10px] text-[#9098b1]">Equipos relacionados con este servicio</p></div>{!loadingMeters&&!meterError&&<span className="rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-bold text-[#6366f1]">{meters.length} medidores</span>}</div>
          {loadingMeters ? <div className="flex items-center justify-center gap-2 rounded-2xl bg-[#f8f9fc] p-6"><RefreshCw size={16} className="animate-spin text-[#ff8a1f]"/><span className="text-xs text-[#9098b1]">Consultando medidores asociados...</span></div>
          : meterError ? <div className="rounded-2xl bg-[#fef2f2] p-4 text-xs text-[#b91c1c]">No fue posible consultar medidores: {meterError}</div>
          : meters.length===0 ? <div className="rounded-2xl bg-[#f8f9fc] p-5 text-center text-xs text-[#9098b1]">Este servicio no tiene medidores asociados.</div>
          : <div className="overflow-hidden rounded-2xl border border-[#eef0f7]">{meters.map((meter,index)=><div key={meter.id_medidor} className={`grid grid-cols-[1fr_auto] gap-3 p-4 sm:grid-cols-[1.3fr_1fr_1fr_1fr] ${index<meters.length-1?"border-b border-[#eef0f7]":""}`}><div><p className="text-xs font-bold text-[#1a1a2e]">{meter.numero_serie}</p><p className="text-[10px] text-[#9098b1]">ID {meter.id_medidor}</p></div><span className="text-xs font-semibold text-[#606881]">{meter.es_principal?"Principal":"Secundario"}</span><span className={`text-xs font-semibold ${normalize(meter.estado).includes("retir")?"text-[#9098b1]":"text-[#10b981]"}`}>{meter.estado}</span><span className="text-xs font-bold text-[#6366f1]">Calidad {meter.calidad_enlace==null?"Sin dato":`${meter.calidad_enlace.toFixed(0)}%`}</span></div>)}</div>}
        </section>

        <section><h3 className="mb-3 text-sm font-semibold text-[#1a1a2e]">Parámetros del tipo de servicio</h3><div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-[#fff4ea] p-4 text-center"><Zap size={18} className="mx-auto text-[#ff8a1f]"/><p className="mt-2 font-bold text-[#ff8a1f]">{servicio.consumo_base_kwh_h.toFixed(3)}</p><p className="text-[10px] text-[#9098b1]">Consumo base kWh/h</p></div><div className="rounded-2xl bg-[#eef2ff] p-4 text-center"><Gauge size={18} className="mx-auto text-[#6366f1]"/><p className="mt-2 font-bold text-[#6366f1]">{servicio.factor_dispersion.toFixed(3)}</p><p className="text-[10px] text-[#9098b1]">Factor de dispersión</p></div><div className="rounded-2xl bg-[#ecfdf5] p-4 text-center"><Leaf size={18} className="mx-auto text-[#10b981]"/><p className="mt-2 font-bold text-[#10b981]">{servicio.sensibilidad_temp.toFixed(3)}</p><p className="text-[10px] text-[#9098b1]">Sensibilidad térmica</p></div></div></section>
        <section className="rounded-2xl bg-[#f8f9fc] p-4"><div className="flex items-center gap-3"><MapPin size={20} color={color}/><div><p className="text-xs font-bold">{servicio.zona_nombre}</p><p className="text-[11px] text-[#9098b1]">Latitud {servicio.latitud.toFixed(6)} · Longitud {servicio.longitud.toFixed(6)}</p></div></div></section>
      </div>
    </div>
  </div>;
}

export default function Households(){
  const [services,setServices]=useState<Servicio[]>([]);
  const [search,setSearch]=useState("");
  const [zoneFilter,setZoneFilter]=useState("Todas");
  const [typeIndex,setTypeIndex]=useState(0);
  const [solarFilter,setSolarFilter]=useState("Todos");
  const [selected,setSelected]=useState<Servicio|null>(null);
  const [page,setPage]=useState(1);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);

  const load=async()=>{try{setLoading(true);setError(null);setServices(await obtenerServicios());}catch(e){setError(e instanceof Error?e.message:"Error al cargar servicios");}finally{setLoading(false);}};
  useEffect(()=>{void load();},[]);
  const zones=useMemo(()=>[...new Set(services.map(s=>s.zona_nombre))].sort((a,b)=>a.localeCompare(b,"es")),[services]);
  const types=useMemo(()=>[...new Set(services.map(s=>s.tipo_servicio_nombre))].sort((a,b)=>a.localeCompare(b,"es")),[services]);
  useEffect(()=>{if(typeIndex>=types.length)setTypeIndex(0);},[types.length,typeIndex]);
  const selectedType=types[typeIndex]??"";
  const typeExample=services.find(s=>s.tipo_servicio_nombre===selectedType);

  const filtered=useMemo(()=>{const q=search.trim().toLowerCase();return services.filter(s=>(!q||s.nombre.toLowerCase().includes(q)||s.rpu.toLowerCase().includes(q)||String(s.id_servicio).includes(q)||s.zona_nombre.toLowerCase().includes(q)||s.tipo_servicio_nombre.toLowerCase().includes(q))&&(zoneFilter==="Todas"||s.zona_nombre===zoneFilter)&&(!selectedType||s.tipo_servicio_nombre===selectedType)&&(solarFilter==="Todos"||(solarFilter==="Con solar"&&s.tiene_solar)||(solarFilter==="Sin solar"&&!s.tiene_solar)));},[services,search,zoneFilter,selectedType,solarFilter]);
  const pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));const currentPage=Math.min(page,pages);const paged=filtered.slice((currentPage-1)*PAGE_SIZE,currentPage*PAGE_SIZE);
  const changeType=(direction:number)=>{if(!types.length)return;setTypeIndex(current=>(current+direction+types.length)%types.length);setPage(1);};

  if(loading)return <div className="card flex items-center justify-center gap-3 p-8"><RefreshCw className="animate-spin text-[#ff8a1f]"/><p className="text-sm text-[#9098b1]">Cargando servicios desde PostgreSQL...</p></div>;
  if(error)return <div className="card p-8 text-center"><h2 className="font-bold">No se pudieron cargar los servicios</h2><p className="mt-2 text-xs text-[#9098b1]">{error}</p><button type="button" onClick={()=>void load()} className="mt-4 rounded-xl bg-[#ff8a1f] px-4 py-2 text-xs font-semibold text-white">Reintentar</button></div>;

  return <div className="flex flex-col gap-6">
    <div className="flex items-start justify-between"><div><h1 className="text-2xl font-bold text-[#1a1a2e]">Módulo de Servicios</h1><p className="text-sm text-[#9098b1]">Exploración visual de los servicios registrados</p></div><button type="button" onClick={()=>void load()} className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-xs font-semibold"><RefreshCw size={13}/>Actualizar</button></div>
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[["Servicios registrados",services.length,Building2,"#6366f1"],["Zonas con servicios",zones.length,MapPin,"#ff8a1f"],["Tipos de servicio",types.length,CircleDollarSign,"#f59e0b"],["Servicios con solar",services.filter(s=>s.tiene_solar).length,Sun,"#10b981"]].map(([label,value,Icon,color])=>{const I=Icon as typeof Building2;return <div key={String(label)} className="card p-4"><I size={16} style={{color:String(color)}}/><p className="mt-3 text-[11px] text-[#9098b1]">{label}</p><p className="text-lg font-bold">{fmt(Number(value))}</p></div>})}</div>

    <section className="card overflow-hidden p-4"><div className="mb-3 flex items-center justify-between"><div><h2 className="text-sm font-bold text-[#1a1a2e]">Tipo de servicio</h2><p className="text-[10px] text-[#9098b1]">Usa las flechas para cambiar el filtro visual</p></div><span className="rounded-full bg-[#fff4ea] px-3 py-1 text-[10px] font-bold text-[#ff8a1f]">{typeIndex+1} / {Math.max(types.length,1)}</span></div><div className="flex items-center gap-3"><button type="button" onClick={()=>changeType(-1)} className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border bg-white shadow-sm hover:border-[#ff8a1f]"><ChevronLeft size={18}/></button><div className="relative h-40 flex-1 overflow-hidden rounded-3xl bg-[#f2f3f7]"><img src={typeImage(selectedType,typeExample?.tipo_servicio_categoria??"")} alt={selectedType} className="h-full w-full object-cover"/><div className="absolute inset-0 bg-gradient-to-t from-[#1a1a2e]/80 via-transparent to-transparent"/><div className="absolute bottom-0 left-0 right-0 p-5 text-white"><p className="text-lg font-bold">{selectedType||"Sin tipos disponibles"}</p><p className="text-xs text-white/80">{filtered.length} servicios coinciden con los filtros actuales</p></div></div><button type="button" onClick={()=>changeType(1)} className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border bg-white shadow-sm hover:border-[#ff8a1f]"><ChevronRight size={18}/></button></div></section>

    <div className="flex flex-wrap items-center gap-3"><div className="relative min-w-60 flex-1"><Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9098b1]"/><input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Buscar por ID, RPU, nombre o zona..." className="w-full rounded-2xl border bg-white py-2.5 pl-10 pr-4 text-sm"/></div><select value={zoneFilter} onChange={e=>{setZoneFilter(e.target.value);setPage(1)}} className="rounded-2xl border bg-white px-4 py-2.5 text-sm"><option value="Todas">Todas las zonas</option>{zones.map(z=><option key={z}>{z}</option>)}</select><select value={solarFilter} onChange={e=>{setSolarFilter(e.target.value);setPage(1)}} className="rounded-2xl border bg-white px-4 py-2.5 text-sm"><option>Todos</option><option>Con solar</option><option>Sin solar</option></select><span className="text-xs text-[#9098b1]">{filtered.length} registros</span></div>

    {paged.length===0?<div className="card p-8 text-center text-sm text-[#9098b1]">No se encontraron servicios con los filtros seleccionados.</div>:<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{paged.map(service=>{const color=COLORS[service.id_zona%COLORS.length];return <button type="button" key={service.id_servicio} onClick={()=>setSelected(service)} className="card overflow-hidden text-left transition-all hover:-translate-y-0.5 hover:shadow-lg"><div className="h-24 overflow-hidden"><img src={typeImage(service.tipo_servicio_nombre,service.tipo_servicio_categoria)} alt="" className="h-full w-full object-cover"/></div><div className="p-4"><div className="flex justify-between gap-2"><div><p className="text-[10px] text-[#9098b1]">ID {service.id_servicio} · {service.rpu}</p><p className="truncate text-sm font-bold">{service.nombre}</p></div><span className="h-fit rounded-full px-2 py-1 text-[9px] font-bold" style={{background:`${color}18`,color}}>{service.zona_nombre}</span></div><p className="mt-2 truncate text-[11px] text-[#9098b1]">{service.tipo_servicio_nombre}</p><div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-xl bg-[#f8f9fc] p-2 text-center"><b className="text-xs text-[#ff8a1f]">{service.carga_contratada_kw.toLocaleString("es-MX",{maximumFractionDigits:2})}</b><p className="text-[9px] text-[#9098b1]">kW carga</p></div><div className="rounded-xl bg-[#f8f9fc] p-2 text-center"><b className={`text-xs ${service.tiene_solar?"text-[#10b981]":"text-[#9098b1]"}`}>{service.tiene_solar?"Sí":"No"}</b><p className="text-[9px] text-[#9098b1]">solar</p></div></div><div className="mt-3 flex items-center justify-between border-t pt-3"><span className="text-[10px] text-[#9098b1]">Ver servicio y medidores</span><ChevronRight size={14}/></div></div></button>})}</div>}

    <div className="flex items-center justify-center gap-2"><button type="button" disabled={currentPage===1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-full border px-4 py-2 text-xs disabled:opacity-40">Anterior</button><span className="text-xs text-[#9098b1]">{currentPage} / {pages}</span><button type="button" disabled={currentPage===pages} onClick={()=>setPage(p=>Math.min(pages,p+1))} className="rounded-full border px-4 py-2 text-xs disabled:opacity-40">Siguiente</button></div>
    {selected&&<ServicioDetail servicio={selected} onClose={()=>setSelected(null)}/>}  
  </div>;
}
