import { useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, Calendar, CheckCircle2, ChevronLeft,
  ChevronRight, Clock3, Filter, Gauge, Grid2X2, List, MapPin,
  Radio, RefreshCw, RotateCcw, Search, Server, ShieldAlert,
  Star, X,
} from "lucide-react";
import { obtenerMedidores, type Medidor } from "../services/medidoresService";
import { PageHeader } from "./ui/PageHeader";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const PAGE_SIZE = 12;
type ViewMode = "list" | "grid";
type RawRecord = Record<string, unknown>;

interface AlertItem {
  id_alerta: number;
  tipo: string;
  estado: string;
  prioridad: string;
  fecha: string | null;
  descripcion: string;
}
interface BrandStyle { color:string; soft:string; gradient:string; shadow:string }
const BRAND_PALETTE: BrandStyle[] = [
  {color:"var(--chart-7)",soft:"var(--color-accent-soft)",gradient:"linear-gradient(135deg,var(--chart-7),var(--chart-7))",shadow:"0 10px 24px rgba(124,58,237,.22)"},
  {color:"var(--color-info)",soft:"var(--color-info-soft)",gradient:"linear-gradient(135deg,var(--chart-5),var(--color-info-strong))",shadow:"0 10px 24px rgba(2,132,199,.22)"},
  {color:"var(--color-success-strong)",soft:"var(--color-success-soft)",gradient:"linear-gradient(135deg,var(--color-success),var(--color-success-strong))",shadow:"0 10px 24px rgba(5,150,105,.22)"},
  {color:"var(--color-accent-strong)",soft:"var(--color-accent-soft-2)",gradient:"linear-gradient(135deg,var(--chart-1),var(--color-accent-strong))",shadow:"0 10px 24px rgba(234,88,12,.22)"},
  {color:"var(--chart-6)",soft:"var(--color-accent-soft)",gradient:"linear-gradient(135deg,var(--chart-6),var(--chart-6))",shadow:"0 10px 24px rgba(219,39,119,.22)"},
  {color:"var(--color-info-strong)",soft:"var(--color-info-soft)",gradient:"linear-gradient(135deg,var(--color-info),var(--color-info-strong))",shadow:"0 10px 24px rgba(79,70,229,.22)"},
];
const normalize=(v:string)=>v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const getBrandStyle=(brand:string)=>{let hash=0;for(const c of brand.trim().toLowerCase())hash=c.charCodeAt(0)+((hash<<5)-hash);return BRAND_PALETTE[Math.abs(hash)%BRAND_PALETTE.length];};
const initials=(brand:string)=>brand.trim().split(/\s+/).slice(0,2).map(w=>w[0]?.toUpperCase()).join("")||"M";
const formatDate=(value:string|null|undefined)=>{if(!value)return "Sin fecha";const date=new Date(value);return Number.isNaN(date.getTime())?value:date.toLocaleDateString("es-MX",{day:"2-digit",month:"2-digit",year:"numeric"});};
const formatDateTime=(value:string|null)=>{if(!value)return "Sin fecha";const date=new Date(value);return Number.isNaN(date.getTime())?value:date.toLocaleString("es-MX",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});};
const quality=(value:number)=>Math.max(0,Math.min(100,value<=1?value*100:value));
const qualityColor=(v:number)=>v>=80?"var(--color-success)":v>=50?"var(--color-warning)":"var(--color-danger)";
const qualityLabel=(v:number)=>v>=80?"Excelente":v>=50?"Regular":"Baja";
const visiblePages=(current:number,total:number)=>total<=5?Array.from({length:total},(_,i)=>i+1):current<=3?[1,2,3,4,total]:current>=total-2?[1,total-3,total-2,total-1,total]:[1,current-1,current,current+1,total];

function rawMeter(meter:Medidor):RawRecord{return meter as unknown as RawRecord;}
function meterFunction(meter:Medidor):"Principal"|"Secundario"{
  const raw=rawMeter(meter);
  const explicit=raw.es_principal??raw.principal;
  if(explicit===true||explicit===1||String(explicit).toLowerCase()==="true")return "Principal";
  const type=normalize(String(raw.tipo_medidor??raw.funcion??raw.rol??""));
  return type.includes("principal")?"Principal":"Secundario";
}
function meterAge(meter:Medidor):string{
  if(!meter.fecha_instalacion)return "Sin fecha de instalación";
  const start=new Date(meter.fecha_instalacion);
  const end=medidorEndDate(meter);
  if(Number.isNaN(start.getTime())||Number.isNaN(end.getTime())||end<start)return "Sin dato";
  let years=end.getFullYear()-start.getFullYear();
  let months=end.getMonth()-start.getMonth();
  let days=end.getDate()-start.getDate();
  if(days<0){months--;days+=new Date(end.getFullYear(),end.getMonth(),0).getDate();}
  if(months<0){years--;months+=12;}
  const parts=[];if(years)parts.push(`${years} ${years===1?"año":"años"}`);if(months)parts.push(`${months} ${months===1?"mes":"meses"}`);if(!years&&!months||days)parts.push(`${days} ${days===1?"día":"días"}`);return parts.join(", ");
}
function medidorEndDate(meter:Medidor):Date{return meter.fecha_retiro?new Date(meter.fecha_retiro):new Date();}
function normalizeAlert(row:RawRecord):AlertItem{
  return {
    id_alerta:Number(row.id_alerta??0),
    tipo:String(row.tipo_alerta??row.tipo??row.nombre_evento??row.codigo_evento??"Alerta"),
    estado:String(row.estado??row.estatus??"Sin estado"),
    prioridad:String(row.prioridad??row.severidad??row.nivel??"Sin prioridad"),
    fecha:(row.ts_generacion??row.fecha_hora??row.fecha_creacion??row.creada_en??row.ts??null) as string|null,
    descripcion:String(row.descripcion??row.mensaje??row.detalle??"Sin descripción"),
  };
}
function isActiveAlert(alert:AlertItem){return ["activa","activo","abierta","pendiente"].includes(normalize(alert.estado));}
function isCritical(alert:AlertItem){return ["critica","critico","alta","alto"].includes(normalize(alert.prioridad));}

function MeterDetail({meter,onClose}:{meter:Medidor;onClose:()=>void}){
  const [alerts,setAlerts]=useState<AlertItem[]>([]);
  const [loadingAlerts,setLoadingAlerts]=useState(true);
  const [alertError,setAlertError]=useState<string|null>(null);
  const q=quality(meter.calidad_enlace),qColor=qualityColor(q),brand=getBrandStyle(meter.marca);
  const functionLabel=meterFunction(meter),age=meterAge(meter);

  useEffect(()=>{
    const key=(event:KeyboardEvent)=>{if(event.key==="Escape")onClose();};
    document.body.style.overflow="hidden";window.addEventListener("keydown",key);
    return()=>{document.body.style.overflow="";window.removeEventListener("keydown",key);};
  },[onClose]);
  useEffect(()=>{
    let active=true;
    const load=async()=>{try{setLoadingAlerts(true);setAlertError(null);const response=await fetch(`${API_URL}/api/alertas`);if(!response.ok)throw new Error(`HTTP ${response.status}`);const rows=await response.json() as RawRecord[];const related=rows.filter(row=>Number(row.id_medidor)===meter.id_medidor).map(normalizeAlert).sort((a,b)=>new Date(b.fecha??0).getTime()-new Date(a.fecha??0).getTime());if(active)setAlerts(related);}catch(error){if(active)setAlertError(error instanceof Error?error.message:"Error al consultar alertas");}finally{if(active)setLoadingAlerts(false);}};
    void load();return()=>{active=false;};
  },[meter.id_medidor]);

  const activeAlerts=alerts.filter(isActiveAlert).length;
  const criticalAlerts=alerts.filter(isCritical).length;
  return <div className="fixed inset-0 z-50 bg-overlay backdrop-blur-sm" onMouseDown={onClose}>
    <aside role="dialog" aria-modal="true" onMouseDown={e=>e.stopPropagation()} className="ml-auto flex h-full w-full max-w-2xl flex-col bg-surface shadow-2xl">
      <header className="flex items-center justify-between border-b px-5 py-5 sm:px-7"><div className="flex min-w-0 items-center gap-3"><div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white" style={{background:brand.gradient,boxShadow:brand.shadow}}><b>{initials(meter.marca)}</b><span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-[var(--hero-fg)]" style={{background:qColor}}/></div><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[var(--color-muted-2)]">Detalle del medidor</p><h2 className="text-lg font-bold">{meter.numero_serie}</h2><p className="text-xs text-[var(--color-muted)]">ID {meter.id_medidor} · {meter.marca}</p></div></div><button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-surface-2)]"><X size={16}/></button></header>
      <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-7">
        <section className="rounded-3xl bg-[var(--hero-bg)] p-5 text-white"><div className="flex justify-between"><div><p className="text-xs text-white/55">Calidad del enlace</p><p className="mt-1 text-3xl font-bold">{q.toFixed(1)}%</p></div><span className="h-fit rounded-full px-3 py-1 text-[11px] font-bold" style={{color:qColor,background:`${qColor}20`}}>{qualityLabel(q)}</span></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-[var(--hero-overlay-soft)]"><div className="h-full rounded-full" style={{width:`${q}%`,background:qColor}}/></div></section>

        <section className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-[var(--color-accent-soft)] p-4"><Star size={17} className="text-[var(--color-accent)]"/><p className="mt-2 text-[10px] text-[var(--color-muted)]">Función del medidor</p><p className="text-sm font-bold text-[var(--color-fg)]">{functionLabel}</p></div><div className="rounded-2xl bg-[var(--color-info-soft)] p-4"><Clock3 size={17} className="text-[var(--chart-2)]"/><p className="mt-2 text-[10px] text-[var(--color-muted)]">Antigüedad</p><p className="text-sm font-bold text-[var(--color-fg)]">{age}</p><p className="mt-1 text-[9px] text-[var(--color-muted)]">{meter.fecha_retiro?"Hasta la fecha de retiro":"En operación hasta hoy"}</p></div></section>

        <section className="mt-7"><h3 className="text-xs font-bold uppercase tracking-[.14em] text-[var(--color-muted)]">Información general</h3><dl className="mt-3 divide-y rounded-2xl border px-4">{[["Estado",meter.estado],["Función",functionLabel],["Marca",meter.marca],["Multiplicador",String(meter.multiplicador)],["Instalación",formatDate(meter.fecha_instalacion)],["Antigüedad",age],["Retiro",meter.fecha_retiro?formatDate(meter.fecha_retiro):"No retirado"]].map(([label,value])=><div key={label} className="flex justify-between gap-5 py-3.5"><dt className="text-xs text-[var(--color-muted)]">{label}</dt><dd className="text-right text-sm font-semibold text-[var(--color-fg-secondary)]">{value}</dd></div>)}</dl></section>

        <section className="mt-7"><div className="flex items-center justify-between"><div><h3 className="text-xs font-bold uppercase tracking-[.14em] text-[var(--color-muted)]">Alertas asociadas</h3><p className="mt-1 text-[10px] text-[var(--color-muted)]">Eventos relacionados con este medidor</p></div>{!loadingAlerts&&!alertError&&<span className="rounded-full bg-[var(--color-danger-soft)] px-3 py-1 text-[10px] font-bold text-[var(--color-danger-strong)]">{alerts.length} total</span>}</div>
          {loadingAlerts?<div className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-surface-2)] p-6"><RefreshCw size={16} className="animate-spin text-[var(--color-accent)]"/><span className="text-xs text-[var(--color-muted)]">Consultando alertas asociadas...</span></div>
          :alertError?<div className="mt-3 rounded-2xl bg-[var(--color-danger-soft)] p-4 text-xs text-[var(--color-danger-strong)]">No fue posible consultar alertas: {alertError}</div>
          :<><div className="mt-3 grid grid-cols-3 gap-2"><div className="rounded-xl bg-[var(--color-surface-2)] p-3 text-center"><b>{alerts.length}</b><p className="text-[9px] text-[var(--color-muted)]">Total</p></div><div className="rounded-xl bg-[var(--color-accent-soft)] p-3 text-center"><b className="text-[var(--color-accent-strong)]">{activeAlerts}</b><p className="text-[9px] text-[var(--color-muted)]">Activas</p></div><div className="rounded-xl bg-[var(--color-danger-soft)] p-3 text-center"><b className="text-[var(--color-danger-strong)]">{criticalAlerts}</b><p className="text-[9px] text-[var(--color-muted)]">Críticas/altas</p></div></div>{alerts.length===0?<div className="mt-3 rounded-2xl bg-[var(--color-success-soft)] p-4 text-center text-xs text-[var(--color-success-strong)]"><CheckCircle2 size={18} className="mx-auto mb-2"/>Sin alertas asociadas.</div>:<div className="mt-3 overflow-hidden rounded-2xl border">{alerts.slice(0,8).map((alert,index)=><div key={`${alert.id_alerta}-${index}`} className={`p-4 ${index<Math.min(alerts.length,8)-1?"border-b":""}`}><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 gap-3"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isCritical(alert)?"bg-[var(--color-danger-soft)] text-[var(--color-danger-strong)]":"bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)]"}`}>{isCritical(alert)?<ShieldAlert size={16}/>:<AlertTriangle size={16}/>}</div><div className="min-w-0"><p className="truncate text-xs font-bold">{alert.tipo}</p><p className="mt-1 line-clamp-2 text-[10px] text-[var(--color-muted)]">{alert.descripcion}</p><p className="mt-1 text-[9px] text-[var(--color-muted)]">{formatDateTime(alert.fecha)}</p></div></div><div className="text-right"><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${isActiveAlert(alert)?"bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)]":"bg-[var(--color-surface-3)] text-[var(--color-muted)]"}`}>{alert.estado}</span><p className="mt-2 text-[9px] font-semibold text-[var(--color-muted)]">{alert.prioridad}</p></div></div></div>)}</div>}</>}
        </section>

        <section className="mt-7"><h3 className="text-xs font-bold uppercase tracking-[.14em] text-[var(--color-muted)]">Servicio y ubicación</h3><div className="mt-3 space-y-3"><div className="flex gap-3 rounded-2xl border p-4"><Server size={18} className="text-[var(--color-accent)]"/><div><p className="text-[10px] text-[var(--color-muted)]">Servicio · RPU {meter.servicio_rpu}</p><p className="text-sm font-bold">{meter.servicio_nombre}</p><p className="text-xs text-[var(--color-muted)]">{meter.tipo_servicio_nombre}</p></div></div><div className="flex gap-3 rounded-2xl border p-4"><MapPin size={18} className="text-[var(--color-info-strong)]"/><div><p className="text-[10px] text-[var(--color-muted)]">Zona asignada</p><p className="text-sm font-bold">{meter.zona_nombre}</p></div></div></div></section>
      </div>
    </aside>
  </div>;
}

export default function Meters(){
  const [meters,setMeters]=useState<Medidor[]>([]),[search,setSearch]=useState(""),[zone,setZone]=useState("Todas"),[brand,setBrand]=useState("Todas"),[status,setStatus]=useState("Todos");
  const [filtersOpen,setFiltersOpen]=useState(false),[view,setView]=useState<ViewMode>("list"),[selected,setSelected]=useState<Medidor|null>(null),[page,setPage]=useState(1),[loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null);
  const load=async()=>{try{setLoading(true);setError(null);setMeters(await obtenerMedidores());}catch(e){setError(e instanceof Error?e.message:"Error al cargar medidores");}finally{setLoading(false);}};
  useEffect(()=>{void load();},[]);
  const zones=useMemo(()=>[...new Set(meters.map(m=>m.zona_nombre))].sort((a,b)=>a.localeCompare(b,"es")),[meters]);
  const brands=useMemo(()=>[...new Set(meters.map(m=>m.marca))].sort((a,b)=>a.localeCompare(b,"es")),[meters]);
  const filtered=useMemo(()=>{const query=search.trim().toLowerCase();return meters.filter(m=>(!query||[m.numero_serie,m.marca,m.servicio_nombre,m.servicio_rpu,m.zona_nombre,String(m.id_medidor)].some(v=>v.toLowerCase().includes(query)))&&(zone==="Todas"||m.zona_nombre===zone)&&(brand==="Todas"||m.marca===brand)&&(status==="Todos"||m.estado===status));},[meters,search,zone,brand,status]);
  const installed=meters.filter(m=>m.estado==="Instalado").length,retired=meters.filter(m=>m.estado==="Retirado").length,avg=meters.length?meters.reduce((sum,m)=>sum+quality(m.calidad_enlace),0)/meters.length:0;
  const activeFilters=Number(zone!=="Todas")+Number(brand!=="Todas")+Number(status!=="Todos");
  const totalPages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE)),current=Math.min(page,totalPages),paged=filtered.slice((current-1)*PAGE_SIZE,current*PAGE_SIZE),pages=visiblePages(current,totalPages);
  const reset=()=>{setSearch("");setZone("Todas");setBrand("Todas");setStatus("Todos");setPage(1);};
  if(loading)return <div className="space-y-5"><div className="h-16 animate-pulse rounded-2xl bg-surface"/><div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{Array.from({length:4}).map((_,i)=><div key={i} className="h-28 animate-pulse rounded-2xl bg-surface"/>)}</div><div className="h-80 animate-pulse rounded-3xl bg-surface"/></div>;
  if(error)return <div className="rounded-3xl bg-surface p-10 text-center"><X className="mx-auto text-[var(--color-danger)]"/><h2 className="mt-4 font-bold">No se pudieron cargar los medidores</h2><p className="text-xs text-[var(--color-muted)]">{error}</p><button type="button" onClick={()=>void load()} className="mt-5 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-xs font-bold text-[var(--accent-contrast)]">Reintentar</button></div>;

  return <div className="flex flex-col gap-6">
    <PageHeader title="Medidores" description="Consulta, filtra y supervisa los medidores registrados." actions={<button type="button" onClick={()=>void load()} className="flex h-10 items-center gap-2 rounded-xl border bg-surface px-3.5 text-xs font-bold"><RefreshCw size={14}/>Actualizar</button>} />
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[["Registrados",meters.length,Server,"var(--chart-2)"],["Instalados",installed,Activity,"var(--color-success)"],["Retirados",retired,Calendar,"var(--color-muted)"],["Calidad promedio",`${avg.toFixed(1)}%`,Gauge,qualityColor(avg)]].map(([label,value,Icon,color])=>{const I=Icon as typeof Server;return <article key={String(label)} className="rounded-2xl border bg-surface p-4"><I size={16} style={{color:String(color)}}/><p className="mt-3 text-[11px] text-[var(--color-muted)]">{String(label)}</p><p className="text-xl font-bold">{String(value)}</p></article>;})}</section>
    <section className="rounded-3xl border bg-surface p-4"><div className="flex flex-col gap-3 lg:flex-row"><div className="relative flex-1"><Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"/><input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Buscar por ID, serie, marca, RPU o servicio..." aria-label="Buscar medidores" className="w-full rounded-xl border bg-[var(--color-surface-2)] py-2.5 pl-10 pr-10 text-sm"/></div><button type="button" onClick={()=>setFiltersOpen(v=>!v)} aria-expanded={filtersOpen} className="flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold"><Filter size={14}/>Filtros {activeFilters>0&&<span>{activeFilters}</span>}</button><div className="flex rounded-xl border p-1"><button type="button" onClick={()=>setView("list")} aria-label="Vista de lista" aria-pressed={view==="list"} className={`flex h-9 w-9 items-center justify-center rounded-lg ${view==="list"?"bg-[var(--hero-bg)] text-white":""}`}><List size={15}/></button><button type="button" onClick={()=>setView("grid")} aria-label="Vista de cuadrícula" aria-pressed={view==="grid"} className={`flex h-9 w-9 items-center justify-center rounded-lg ${view==="grid"?"bg-[var(--hero-bg)] text-white":""}`}><Grid2X2 size={15}/></button></div></div>{filtersOpen&&<div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]"><select value={zone} onChange={e=>{setZone(e.target.value);setPage(1);}} className="rounded-xl border px-3 py-2.5"><option>Todas</option>{zones.map(z=><option key={z}>{z}</option>)}</select><select value={brand} onChange={e=>{setBrand(e.target.value);setPage(1);}} className="rounded-xl border px-3 py-2.5"><option>Todas</option>{brands.map(b=><option key={b}>{b}</option>)}</select><select value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}} className="rounded-xl border px-3 py-2.5"><option>Todos</option><option>Instalado</option><option>Retirado</option></select><button type="button" onClick={reset} className="flex items-center justify-center gap-2 text-xs"><RotateCcw size={13}/>Limpiar</button></div>}</section>
    <div><h2 className="text-sm font-bold">Medidores</h2><p className="text-xs text-[var(--color-muted)]">Mostrando {filtered.length?((current-1)*PAGE_SIZE+1):0}-{Math.min(current*PAGE_SIZE,filtered.length)} de {filtered.length}</p></div>
    {view==="list"?<div className="overflow-hidden rounded-3xl border bg-surface"><div className="divide-y">{paged.map(m=>{const q=quality(m.calidad_enlace),c=qualityColor(q),style=getBrandStyle(m.marca);return <button type="button" key={m.id_medidor} onClick={()=>setSelected(m)} className="grid w-full gap-4 px-5 py-4 text-left hover:bg-[var(--color-surface-2)] lg:grid-cols-[1.4fr_1fr_1fr_170px_110px_36px] lg:items-center"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl text-white" style={{background:style.gradient}}><b>{initials(m.marca)}</b></div><div><p className="text-sm font-bold">{m.numero_serie}</p><p className="text-[10px] text-[var(--color-muted)]">#{m.id_medidor} · {m.marca} · {meterFunction(m)}</p></div></div><span className="truncate text-xs">{m.zona_nombre}</span><div><p className="truncate text-xs font-semibold">{m.servicio_nombre}</p><p className="text-[10px] text-[var(--color-muted)]">RPU {m.servicio_rpu}</p></div><div><div className="flex justify-between text-[10px]"><b style={{color:c}}>{q.toFixed(1)}%</b><span>{qualityLabel(q)}</span></div><div className="mt-1 h-1.5 rounded-full bg-[var(--color-border)]"><div className="h-full rounded-full" style={{width:`${q}%`,background:c}}/></div></div><span className="text-xs font-semibold">{m.estado}</span><ChevronRight size={16}/></button>;})}</div></div>:<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{paged.map(m=>{const q=quality(m.calidad_enlace),style=getBrandStyle(m.marca);return <button type="button" key={m.id_medidor} onClick={()=>setSelected(m)} className="rounded-3xl border bg-surface p-5 text-left hover:shadow-xl"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl text-white" style={{background:style.gradient}}><b>{initials(m.marca)}</b></div><div><p className="text-sm font-bold">{m.numero_serie}</p><p className="text-[10px] text-[var(--color-muted)]">{meterFunction(m)} · ID {m.id_medidor}</p></div></div><p className="mt-4 text-xs">Calidad: <b>{q.toFixed(1)}%</b></p><p className="mt-2 text-xs">Zona: <b>{m.zona_nombre}</b></p><p className="mt-2 text-xs">Antigüedad: <b>{meterAge(m)}</b></p></button>;})}</div>}
    {filtered.length>0&&<nav className="flex items-center justify-center gap-1.5 rounded-2xl border bg-surface p-3"><button disabled={current===1} onClick={()=>setPage(v=>Math.max(1,v-1))} aria-label="Página anterior" className="flex h-10 w-10 items-center justify-center rounded-lg disabled:opacity-40"><ChevronLeft size={15}/></button>{pages.map((number,index)=><span key={number} className="flex items-center gap-1.5">{index>0&&number-pages[index-1]>1&&"…"}<button onClick={()=>setPage(number)} aria-label={`Ir a la página ${number}`} aria-current={number===current?"page":undefined} className={`h-10 min-w-10 rounded-lg text-xs font-bold ${number===current?"bg-[var(--hero-bg)] text-white":""}`}>{number}</button></span>)}<button disabled={current===totalPages} onClick={()=>setPage(v=>Math.min(totalPages,v+1))} aria-label="Página siguiente" className="flex h-10 w-10 items-center justify-center rounded-lg disabled:opacity-40"><ChevronRight size={15}/></button></nav>}
    {selected&&<MeterDetail meter={selected} onClose={()=>setSelected(null)}/>}  
  </div>;
}



