import { useEffect, useMemo, useState } from "react";
import {
  Activity, Building2, ChevronLeft, ChevronRight, CircleDollarSign,
  Gauge, Leaf, MapPin, RefreshCw, Search, Sun, X, Zap,
} from "lucide-react";
import { obtenerServicios, type Servicio } from "../services/serviciosService";
import { PageHeader } from "./ui/PageHeader";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const PAGE_SIZE = 12;
const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)", "var(--chart-7)", "var(--chart-8)"];
const BACKGROUNDS = ["var(--color-accent-soft)", "var(--color-info-soft)", "var(--color-success-soft)", "var(--color-warning-soft)", "var(--color-info-soft)", "var(--color-accent-soft)", "var(--color-accent-soft)", "var(--color-success-soft)"];

// Configuración Google Maps Street View
const GOOGLE_MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || "";

// Mapeo del carrusel con ubicaciones representativas de Toluca
const SERVICIOS_CARRUSEL_DATA = [
  {
    id: 1,
    tipo: "Comercial",
    ubicacionBusqueda: "San Pablo Autopan, Toluca de Lerdo, Estado de México, México",
    imgFallback: "/img/servicios/servicio_1.jpg",
    galeria: [
      "/img/servicios/servicio_1.jpg",
      "/img/servicios/servicio_2.jpg",
      "/img/servicios/servicio_6.jpg",
      "/img/servicios/servicio_10.jpg",
    ],
  },
  {
    id: 2,
    tipo: "Industrial",
    ubicacionBusqueda: "Santa María Totoltepec, Toluca de Lerdo, Estado de México, México",
    imgFallback: "/img/servicios/servicio_3.jpg",
    galeria: [
      "/img/servicios/servicio_3.jpg",
      "/img/servicios/servicio_4.jpg",
      "/img/servicios/servicio_9.jpg",
    ],
  },
  {
    id: 3,
    tipo: "Residencial",
    ubicacionBusqueda: "San Buenaventura, Toluca de Lerdo, Estado de México, México",
    imgFallback: "/img/servicios/servicio_5.jpg",
    galeria: [
      "/img/servicios/servicio_5.jpg",
      "/img/servicios/servicio_7.jpg",
      "/img/servicios/servicio_8.jpg",
    ],
  },
  {
    id: 4,
    tipo: "Servicios",
    ubicacionBusqueda: "San Lorenzo Tepaltitlán, Toluca de Lerdo, Estado de México, México",
    imgFallback: "/img/servicios/servicio_2.jpg",
    galeria: [
      "/img/servicios/servicio_2.jpg",
      "/img/servicios/servicio_6.jpg",
      "/img/servicios/servicio_10.jpg",
      "/img/servicios/servicio_1.jpg",
    ],
  },
];

// Generador de URL para Google Street View Static
function obtenerUrlStreetView(ubicacionBusqueda: string, width = 1280, height = 600): string | null {
  if (!GOOGLE_MAPS_API_KEY) return null;
  if (!ubicacionBusqueda.trim()) return null;
  const location = encodeURIComponent(ubicacionBusqueda.trim());
  return `https://maps.googleapis.com/maps/api/streetview?size=${width}x${height}&location=${location}&fov=90&heading=0&pitch=0&source=outdoor&key=${GOOGLE_MAPS_API_KEY}`;
}

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
  if (text.includes("biblioteca")) return "/img/BibleotecaPublica.jpg";
  if (text.includes("cultural")) return "/img/CentroCultural.jpg";
  if (text.includes("deport")) return "/img/CentroDeportivo.jpg";
  if (text.includes("alumbrado")) return "/img/CircuitoAlumbrado.jpg";
  if (text.includes("departamento")) return "/img/Departamento.jpg";
  if (text.includes("disen") || text.includes("designer")) return "/img/Designer.jpg";
  if (text.includes("gobierno") || text.includes("gubernamental")) return "/img/EdificioGubernamental.png";
  if (text.includes("escuela")) return "/img/EscuelaPublica.png";
  if (text.includes("hospital") || text.includes("salud")) return "/img/Hospital.png";
  if (text.includes("local") || text.includes("comercial")) return "/img/servicios/servicio_2.jpg";
  if (text.includes("mercado")) return "/img/Mercado.png";
  if (text.includes("semaforo")) return "/img/NodoSemaforo.png";
  if (text.includes("parque")) return "/img/Parque.png";
  if (text.includes("planta") || text.includes("industrial")) return "/img/servicios/servicio_3.jpg";
  if (text.includes("pozo")) return "/img/Pozo.png";
  if (text.includes("unifamiliar")) return "/img/ViviendaUnifamiliar.png";
  if (text.includes("residencial") || text.includes("vivienda")) return "/img/ViviendaAlto.png";
  if (text.includes("servicio")) return "/img/servicios/servicio_6.jpg";
  return "/img/EdificioGubernamental.png";
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

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4 backdrop-blur-sm">
    <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-surface shadow-2xl">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--color-border)] bg-surface p-6">
        <div className="flex items-center gap-3"><div className="h-14 w-14 overflow-hidden rounded-2xl" style={{ background }}><img src={typeImage(servicio.tipo_servicio_nombre, servicio.tipo_servicio_categoria)} alt="" className="h-full w-full object-cover"/></div><div><h2 className="text-lg font-bold text-[var(--color-fg)]">{servicio.nombre}</h2><p className="text-xs text-[var(--color-muted)]">Servicio #{servicio.id_servicio} · RPU {servicio.rpu}</p></div></div>
        <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-bg)]"><X size={14}/></button>
      </div>
      <div className="flex flex-col gap-5 p-6">
        <section><h3 className="mb-3 text-sm font-semibold text-[var(--color-fg)]">Información del servicio</h3><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
          ["Zona",servicio.zona_nombre],["Tipo",servicio.tipo_servicio_nombre],["Categoría",formatText(servicio.tipo_servicio_categoria)],["Ocupación",servicio.ocupacion_estimada==null?"Sin información":`${fmt(servicio.ocupacion_estimada)} personas`],
          ["Carga contratada",`${servicio.carga_contratada_kw.toLocaleString("es-MX",{maximumFractionDigits:2})} kW`],["Sistema solar",servicio.tiene_solar?"Sí":"No"],["Tarifa",`Tarifa #${servicio.id_tarifa}`],["Clave",servicio.tipo_servicio_clave],
        ].map(([label,value])=><div key={label} className="rounded-2xl bg-[var(--color-surface-2)] p-3"><p className="text-[10px] text-[var(--color-muted)]">{label}</p><p className="mt-1 text-sm font-bold text-[var(--color-fg)]">{value}</p></div>)}</div></section>

        <section><div className="mb-3 flex items-center justify-between"><div><h3 className="text-sm font-semibold text-[var(--color-fg)]">Medidores asociados</h3><p className="text-[10px] text-[var(--color-muted)]">Equipos relacionados con este servicio</p></div>{!loadingMeters&&!meterError&&<span className="rounded-full bg-[var(--color-info-soft)] px-3 py-1 text-xs font-bold text-[var(--chart-2)]">{meters.length} medidores</span>}</div>
          {loadingMeters ? <div className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-surface-2)] p-6"><RefreshCw size={16} className="animate-spin text-[var(--color-accent)]"/><span className="text-xs text-[var(--color-muted)]">Consultando medidores asociados...</span></div>
          : meterError ? <div className="rounded-2xl bg-[var(--color-danger-soft)] p-4 text-xs text-[var(--color-danger-strong)]">No fue posible consultar medidores: {meterError}</div>
          : meters.length===0 ? <div className="rounded-2xl bg-[var(--color-surface-2)] p-5 text-center text-xs text-[var(--color-muted)]">Este servicio no tiene medidores asociados.</div>
          : <div className="overflow-hidden rounded-2xl border border-[var(--color-border)]">{meters.map((meter,index)=><div key={meter.id_medidor} className={`grid grid-cols-[1fr_auto] gap-3 p-4 sm:grid-cols-[1.3fr_1fr_1fr_1fr] ${index<meters.length-1?"border-b border-[var(--color-border)]":""}`}><div><p className="text-xs font-bold text-[var(--color-fg)]">{meter.numero_serie}</p><p className="text-[10px] text-[var(--color-muted)]">ID {meter.id_medidor}</p></div><span className="text-xs font-semibold text-[var(--color-fg-secondary)]">{meter.es_principal?"Principal":"Secundario"}</span><span className={`text-xs font-semibold ${normalize(meter.estado).includes("retir")?"text-[var(--color-muted)]":"text-[var(--color-success)]"}`}>{meter.estado}</span><span className="text-xs font-bold text-[var(--chart-2)]">Calidad {meter.calidad_enlace==null?"Sin dato":`${meter.calidad_enlace.toFixed(0)}%`}</span></div>)}</div>}
        </section>

        <section><h3 className="mb-3 text-sm font-semibold text-[var(--color-fg)]">Parámetros del tipo de servicio</h3><div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-[var(--color-accent-soft)] p-4 text-center"><Zap size={18} className="mx-auto text-[var(--color-accent)]"/><p className="mt-2 font-bold text-[var(--color-accent)]">{servicio.consumo_base_kwh_h.toFixed(3)}</p><p className="text-[10px] text-[var(--color-muted)]">Consumo base kWh/h</p></div><div className="rounded-2xl bg-[var(--color-info-soft)] p-4 text-center"><Gauge size={18} className="mx-auto text-[var(--chart-2)]"/><p className="mt-2 font-bold text-[var(--chart-2)]">{servicio.factor_dispersion.toFixed(3)}</p><p className="text-[10px] text-[var(--color-muted)]">Factor de dispersión</p></div><div className="rounded-2xl bg-[var(--color-success-soft)] p-4 text-center"><Leaf size={18} className="mx-auto text-[var(--color-success)]"/><p className="mt-2 font-bold text-[var(--color-success)]">{servicio.sensibilidad_temp.toFixed(3)}</p><p className="text-[10px] text-[var(--color-muted)]">Sensibilidad térmica</p></div></div></section>
        <section className="rounded-2xl bg-[var(--color-surface-2)] p-4"><div className="flex items-center gap-3"><MapPin size={20} color={color}/><div><p className="text-xs font-bold">{servicio.zona_nombre}</p><p className="text-[11px] text-[var(--color-muted)]">Latitud {servicio.latitud.toFixed(6)} · Longitud {servicio.longitud.toFixed(6)}</p></div></div></section>
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
  const [carouselImgSrc, setCarouselImgSrc] = useState<string>("");
  const [carouselGalleryIndex, setCarouselGalleryIndex] = useState<number>(0);

  const load=async()=>{try{setLoading(true);setError(null);setServices(await obtenerServicios());}catch(e){setError(e instanceof Error?e.message:"Error al cargar servicios");}finally{setLoading(false);}};
  useEffect(()=>{void load();},[]);
  const zones=useMemo(()=>[...new Set(services.map(s=>s.zona_nombre))].sort((a,b)=>a.localeCompare(b,"es")),[services]);
  const types=useMemo(()=>[...new Set(services.map(s=>s.tipo_servicio_nombre))].sort((a,b)=>a.localeCompare(b,"es")),[services]);
  useEffect(()=>{if(typeIndex>=types.length)setTypeIndex(0);},[types.length,typeIndex]);
  const selectedType=types[typeIndex]??"";
  const typeExample=services.find(s=>s.tipo_servicio_nombre===selectedType);

  const filtered=useMemo(()=>{const q=search.trim().toLowerCase();return services.filter(s=>(!q||s.nombre.toLowerCase().includes(q)||s.rpu.toLowerCase().includes(q)||String(s.id_servicio).includes(q)||s.zona_nombre.toLowerCase().includes(q)||s.tipo_servicio_nombre.toLowerCase().includes(q))&&(zoneFilter==="Todas"||s.zona_nombre===zoneFilter)&&(!selectedType||s.tipo_servicio_nombre===selectedType)&&(solarFilter==="Todos"||(solarFilter==="Con solar"&&s.tiene_solar)||(solarFilter==="Sin solar"&&!s.tiene_solar)));},[services,search,zoneFilter,selectedType,solarFilter]);
  const pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));const currentPage=Math.min(page,pages);const paged=filtered.slice((currentPage-1)*PAGE_SIZE,currentPage*PAGE_SIZE);
  
  const cambiarServicio=(direction:number)=>{
    if(!types.length)return;
    setTypeIndex(current=>(current+direction+types.length)%types.length);
    setCarouselGalleryIndex(0);
    setPage(1);
    const imgEl = document.getElementById("img-tipo-servicio") as HTMLImageElement | null;
    if(imgEl){
      delete imgEl.dataset.fallbackApplied;
    }
  };
  const changeType=cambiarServicio;

  // Sincronización con Google Street View + fallback + galería local
  useEffect(()=>{
    if(!selectedType){
      setCarouselImgSrc(typeImage("", typeExample?.tipo_servicio_categoria ?? ""));
      setCarouselGalleryIndex(0);
      return;
    }
    const normSel = normalize(selectedType);
    const mapItem = SERVICIOS_CARRUSEL_DATA.find(m=>normalize(m.tipo)===normSel) || SERVICIOS_CARRUSEL_DATA.find(m=>normSel.includes(normalize(m.tipo)));
    const galeria = mapItem?.galeria && mapItem.galeria.length > 0 ? mapItem.galeria : (mapItem?.imgFallback ? [mapItem.imgFallback] : []);
    const fallbackLocal = galeria[carouselGalleryIndex % galeria.length] || mapItem?.imgFallback || typeImage(selectedType, typeExample?.tipo_servicio_categoria ?? "");
    if(mapItem){
      const svUrl = obtenerUrlStreetView(mapItem.ubicacionBusqueda);
      if(svUrl){
        setCarouselImgSrc(svUrl);
        return;
      }
    }
    setCarouselImgSrc(fallbackLocal);
  }, [selectedType, typeIndex, carouselGalleryIndex, typeExample?.tipo_servicio_categoria]);

  useEffect(()=>{
    const interval = setInterval(()=>{
      const normSel = normalize(selectedType || "");
      const mapItem = SERVICIOS_CARRUSEL_DATA.find(m=>normalize(m.tipo)===normSel) || SERVICIOS_CARRUSEL_DATA.find(m=>normSel.includes(normalize(m.tipo)));
      if(mapItem?.galeria && mapItem.galeria.length > 1){
        setCarouselGalleryIndex(prev => (prev + 1) % mapItem.galeria!.length);
      }
    }, 5000);
    return ()=>clearInterval(interval);
  }, [selectedType]);

  if(loading)return <div className="card flex items-center justify-center gap-3 p-8"><RefreshCw className="animate-spin text-[var(--color-accent)]"/><p className="text-sm text-[var(--color-muted)]">Cargando servicios desde PostgreSQL...</p></div>;
  if(error)return <div className="card p-8 text-center"><h2 className="font-bold">No se pudieron cargar los servicios</h2><p className="mt-2 text-xs text-[var(--color-muted)]">{error}</p><button type="button" onClick={()=>void load()} className="mt-4 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-xs font-semibold text-[var(--accent-contrast)]">Reintentar</button></div>;

  return <div className="flex flex-col gap-6">
    <PageHeader title="Servicios" description="Exploración visual de los servicios registrados." actions={<button type="button" onClick={()=>void load()} className="flex h-10 items-center gap-2 rounded-xl border bg-surface px-3.5 text-xs font-semibold"><RefreshCw size={14}/>Actualizar</button>} />
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[["Servicios registrados",services.length,Building2,"var(--chart-2)"],["Zonas con servicios",zones.length,MapPin,"var(--color-accent)"],["Tipos de servicio",types.length,CircleDollarSign,"var(--color-warning)"],["Servicios con solar",services.filter(s=>s.tiene_solar).length,Sun,"var(--color-success)"]].map(([label,value,Icon,color])=>{const I=Icon as typeof Building2;return <div key={String(label)} className="card p-4"><I size={16} style={{color:String(color)}}/><p className="mt-3 text-[11px] text-[var(--color-muted)]">{String(label)}</p><p className="text-lg font-bold">{fmt(Number(value))}</p></div>})}</div>

    <section className="card overflow-hidden p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-[var(--color-fg)]">Tipo de servicio</h2>
          <p className="text-[10px] text-[var(--color-muted)]">Usa las flechas para cambiar el filtro visual</p>
        </div>
        <span className="rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-[10px] font-bold text-[var(--color-accent)]">{typeIndex+1} / {Math.max(types.length,1)}</span>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" id="btn-servicio-anterior" onClick={()=>cambiarServicio(-1)} className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border bg-surface shadow-sm hover:border-[var(--color-accent)]" aria-label="Cambiar al tipo de servicio anterior"><ChevronLeft size={18}/></button>
        <div className="relative h-40 flex-1 overflow-hidden rounded-3xl bg-[var(--color-bg)]">
          <img 
            id="img-tipo-servicio"
            src={carouselImgSrc || typeImage(selectedType, typeExample?.tipo_servicio_categoria ?? "")} 
            alt={selectedType || "Tipo de servicio"} 
            className="h-full w-full object-cover"
            onError={(e)=>{
              const target = e.currentTarget;
              if(target.dataset.fallbackApplied === "true") return;
              const normSel = normalize(selectedType || "");
              const mapItem = SERVICIOS_CARRUSEL_DATA.find(m=>normalize(m.tipo)===normSel) || SERVICIOS_CARRUSEL_DATA.find(m=>normSel.includes(normalize(m.tipo)));
              const fallbackLocal = mapItem?.imgFallback || typeImage(selectedType || "", typeExample?.tipo_servicio_categoria ?? "");
              target.dataset.fallbackApplied = "true";
              target.src = fallbackLocal;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--hero-bg)] via-transparent to-transparent"/>
          <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
            <p id="titulo-tipo-servicio" className="text-lg font-bold">{selectedType||"Sin tipos disponibles"}</p>
            <p id="contador-coincidencias" className="text-xs text-white/80">{filtered.length} servicios coinciden con los filtros actuales</p>
          </div>
        </div>
        <button type="button" id="btn-servicio-siguiente" onClick={()=>cambiarServicio(1)} className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border bg-surface shadow-sm hover:border-[var(--color-accent)]" aria-label="Cambiar al tipo de servicio siguiente"><ChevronRight size={18}/></button>
      </div>
    </section>

    <div className="flex flex-wrap items-center gap-3"><div className="relative min-w-60 flex-1"><Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"/><input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Buscar por ID, RPU, nombre o zona..." className="w-full rounded-2xl border bg-surface py-2.5 pl-10 pr-4 text-sm"/></div><select value={zoneFilter} onChange={e=>{setZoneFilter(e.target.value);setPage(1)}} className="rounded-2xl border bg-surface px-4 py-2.5 text-sm"><option value="Todas">Todas las zonas</option>{zones.map(z=><option key={z}>{z}</option>)}</select><select value={solarFilter} onChange={e=>{setSolarFilter(e.target.value);setPage(1)}} className="rounded-2xl border bg-surface px-4 py-2.5 text-sm"><option>Todos</option><option>Con solar</option><option>Sin solar</option></select><span className="text-xs text-[var(--color-muted)]">{filtered.length} registros</span></div>

    {paged.length===0?<div className="card p-8 text-center text-sm text-[var(--color-muted)]">No se encontraron servicios con los filtros seleccionados.</div>:<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{paged.map(service=>{const color=COLORS[service.id_zona%COLORS.length];return <button type="button" key={service.id_servicio} onClick={()=>setSelected(service)} className="card overflow-hidden text-left transition-all hover:-translate-y-0.5 hover:shadow-lg"><div className="h-24 overflow-hidden"><img src={typeImage(service.tipo_servicio_nombre,service.tipo_servicio_categoria)} alt="" className="h-full w-full object-cover"/></div><div className="p-4"><div className="flex justify-between gap-2"><div><p className="text-[10px] text-[var(--color-muted)]">ID {service.id_servicio} · {service.rpu}</p><p className="truncate text-sm font-bold">{service.nombre}</p></div><span className="h-fit rounded-full px-2 py-1 text-[9px] font-bold" style={{background:`${color}18`,color}}>{service.zona_nombre}</span></div><p className="mt-2 truncate text-[11px] text-[var(--color-muted)]">{service.tipo_servicio_nombre}</p><div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-xl bg-[var(--color-surface-2)] p-2 text-center"><b className="text-xs text-[var(--color-accent)]">{service.carga_contratada_kw.toLocaleString("es-MX",{maximumFractionDigits:2})}</b><p className="text-[9px] text-[var(--color-muted)]">kW carga</p></div><div className="rounded-xl bg-[var(--color-surface-2)] p-2 text-center"><b className={`text-xs ${service.tiene_solar?"text-[var(--color-success)]":"text-[var(--color-muted)]"}`}>{service.tiene_solar?"Sí":"No"}</b><p className="text-[9px] text-[var(--color-muted)]">solar</p></div></div><div className="mt-3 flex items-center justify-between border-t pt-3"><span className="text-[10px] text-[var(--color-muted)]">Ver servicio y medidores</span><ChevronRight size={14}/></div></div></button>})}</div>}

    <div className="flex items-center justify-center gap-2"><button type="button" disabled={currentPage===1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-full border px-4 py-2 text-xs disabled:opacity-40">Anterior</button><span className="text-xs text-[var(--color-muted)]">{currentPage} / {pages}</span><button type="button" disabled={currentPage===pages} onClick={()=>setPage(p=>Math.min(pages,p+1))} className="rounded-full border px-4 py-2 text-xs disabled:opacity-40">Siguiente</button></div>
    {selected&&<ServicioDetail servicio={selected} onClose={()=>setSelected(null)}/>}  
  </div>;
}




