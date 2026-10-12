import { useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, Calendar, CheckCircle2, ChevronLeft,
  ChevronRight, Clock3, Filter, Gauge, Grid2X2, List, MapPin,
  Radio, RefreshCw, RotateCcw, Search, Server, ShieldAlert,
  Star, X,
} from "lucide-react";
import { obtenerMedidores, type Medidor } from "../services/medidoresService";

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
  {color:"#7c3aed",soft:"#f3e8ff",gradient:"linear-gradient(135deg,#a78bfa,#6d28d9)",shadow:"0 10px 24px rgba(124,58,237,.22)"},
  {color:"#0284c7",soft:"#e0f2fe",gradient:"linear-gradient(135deg,#38bdf8,#0369a1)",shadow:"0 10px 24px rgba(2,132,199,.22)"},
  {color:"#059669",soft:"#d1fae5",gradient:"linear-gradient(135deg,#34d399,#047857)",shadow:"0 10px 24px rgba(5,150,105,.22)"},
  {color:"#ea580c",soft:"#ffedd5",gradient:"linear-gradient(135deg,#fb923c,#c2410c)",shadow:"0 10px 24px rgba(234,88,12,.22)"},
  {color:"#db2777",soft:"#fce7f3",gradient:"linear-gradient(135deg,#f472b6,#be185d)",shadow:"0 10px 24px rgba(219,39,119,.22)"},
  {color:"#4f46e5",soft:"#e0e7ff",gradient:"linear-gradient(135deg,#818cf8,#4338ca)",shadow:"0 10px 24px rgba(79,70,229,.22)"},
];
const normalize=(v:string)=>v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const getBrandStyle=(brand:string)=>{let hash=0;for(const c of brand.trim().toLowerCase())hash=c.charCodeAt(0)+((hash<<5)-hash);return BRAND_PALETTE[Math.abs(hash)%BRAND_PALETTE.length];};
const initials=(brand:string)=>brand.trim().split(/\s+/).slice(0,2).map(w=>w[0]?.toUpperCase()).join("")||"M";
const formatDate=(value:string|null|undefined)=>{if(!value)return "Sin fecha";const date=new Date(value);return Number.isNaN(date.getTime())?value:date.toLocaleDateString("es-MX",{day:"2-digit",month:"2-digit",year:"numeric"});};
const formatDateTime=(value:string|null)=>{if(!value)return "Sin fecha";const date=new Date(value);return Number.isNaN(date.getTime())?value:date.toLocaleString("es-MX",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});};
const quality=(value:number)=>Math.max(0,Math.min(100,value<=1?value*100:value));
const qualityColor=(v:number)=>v>=80?"#10b981":v>=50?"#f59e0b":"#ef4444";
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
  return <div className="fixed inset-0 z-50 bg-[#171827]/40 backdrop-blur-sm" onMouseDown={onClose}>
    <aside role="dialog" aria-modal="true" onMouseDown={e=>e.stopPropagation()} className="ml-auto flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
      <header className="flex items-center justify-between border-b px-5 py-5 sm:px-7"><div className="flex min-w-0 items-center gap-3"><div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white" style={{background:brand.gradient,boxShadow:brand.shadow}}><b>{initials(meter.marca)}</b><span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white" style={{background:qColor}}/></div><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#9aa1b5]">Detalle del medidor</p><h2 className="text-lg font-bold">{meter.numero_serie}</h2><p className="text-xs text-[#9098b1]">ID {meter.id_medidor} · {meter.marca}</p></div></div><button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f4f5f8]"><X size={16}/></button></header>
      <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-7">
        <section className="rounded-3xl bg-[#171827] p-5 text-white"><div className="flex justify-between"><div><p className="text-xs text-white/55">Calidad del enlace</p><p className="mt-1 text-3xl font-bold">{q.toFixed(1)}%</p></div><span className="h-fit rounded-full px-3 py-1 text-[11px] font-bold" style={{color:qColor,background:`${qColor}20`}}>{qualityLabel(q)}</span></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full" style={{width:`${q}%`,background:qColor}}/></div></section>

        <section className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-[#fff4ea] p-4"><Star size={17} className="text-[#ff8a1f]"/><p className="mt-2 text-[10px] text-[#9098b1]">Función del medidor</p><p className="text-sm font-bold text-[#1a1a2e]">{functionLabel}</p></div><div className="rounded-2xl bg-[#eef2ff] p-4"><Clock3 size={17} className="text-[#6366f1]"/><p className="mt-2 text-[10px] text-[#9098b1]">Antigüedad</p><p className="text-sm font-bold text-[#1a1a2e]">{age}</p><p className="mt-1 text-[9px] text-[#9098b1]">{meter.fecha_retiro?"Hasta la fecha de retiro":"En operación hasta hoy"}</p></div></section>

        <section className="mt-7"><h3 className="text-xs font-bold uppercase tracking-[.14em] text-[#9098b1]">Información general</h3><dl className="mt-3 divide-y rounded-2xl border px-4">{[["Estado",meter.estado],["Función",functionLabel],["Marca",meter.marca],["Multiplicador",String(meter.multiplicador)],["Instalación",formatDate(meter.fecha_instalacion)],["Antigüedad",age],["Retiro",meter.fecha_retiro?formatDate(meter.fecha_retiro):"No retirado"]].map(([label,value])=><div key={label} className="flex justify-between gap-5 py-3.5"><dt className="text-xs text-[#9098b1]">{label}</dt><dd className="text-right text-sm font-semibold text-[#30364a]">{value}</dd></div>)}</dl></section>

        <section className="mt-7"><div className="flex items-center justify-between"><div><h3 className="text-xs font-bold uppercase tracking-[.14em] text-[#9098b1]">Alertas asociadas</h3><p className="mt-1 text-[10px] text-[#9098b1]">Eventos relacionados con este medidor</p></div>{!loadingAlerts&&!alertError&&<span className="rounded-full bg-red-50 px-3 py-1 text-[10px] font-bold text-red-600">{alerts.length} total</span>}</div>
          {loadingAlerts?<div className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-[#f8f9fc] p-6"><RefreshCw size={16} className="animate-spin text-[#ff8a1f]"/><span className="text-xs text-[#9098b1]">Consultando alertas asociadas...</span></div>
          :alertError?<div className="mt-3 rounded-2xl bg-red-50 p-4 text-xs text-red-700">No fue posible consultar alertas: {alertError}</div>
          :<><div className="mt-3 grid grid-cols-3 gap-2"><div className="rounded-xl bg-[#f8f9fc] p-3 text-center"><b>{alerts.length}</b><p className="text-[9px] text-[#9098b1]">Total</p></div><div className="rounded-xl bg-orange-50 p-3 text-center"><b className="text-orange-600">{activeAlerts}</b><p className="text-[9px] text-[#9098b1]">Activas</p></div><div className="rounded-xl bg-red-50 p-3 text-center"><b className="text-red-600">{criticalAlerts}</b><p className="text-[9px] text-[#9098b1]">Críticas/altas</p></div></div>{alerts.length===0?<div className="mt-3 rounded-2xl bg-emerald-50 p-4 text-center text-xs text-emerald-700"><CheckCircle2 size={18} className="mx-auto mb-2"/>Sin alertas asociadas.</div>:<div className="mt-3 overflow-hidden rounded-2xl border">{alerts.slice(0,8).map((alert,index)=><div key={`${alert.id_alerta}-${index}`} className={`p-4 ${index<Math.min(alerts.length,8)-1?"border-b":""}`}><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 gap-3"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isCritical(alert)?"bg-red-50 text-red-600":"bg-orange-50 text-orange-600"}`}>{isCritical(alert)?<ShieldAlert size={16}/>:<AlertTriangle size={16}/>}</div><div className="min-w-0"><p className="truncate text-xs font-bold">{alert.tipo}</p><p className="mt-1 line-clamp-2 text-[10px] text-[#747b91]">{alert.descripcion}</p><p className="mt-1 text-[9px] text-[#9098b1]">{formatDateTime(alert.fecha)}</p></div></div><div className="text-right"><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${isActiveAlert(alert)?"bg-orange-50 text-orange-700":"bg-slate-100 text-slate-600"}`}>{alert.estado}</span><p className="mt-2 text-[9px] font-semibold text-[#9098b1]">{alert.prioridad}</p></div></div></div>)}</div>}</>}
        </section>

        <section className="mt-7"><h3 className="text-xs font-bold uppercase tracking-[.14em] text-[#9098b1]">Servicio y ubicación</h3><div className="mt-3 space-y-3"><div className="flex gap-3 rounded-2xl border p-4"><Server size={18} className="text-orange-500"/><div><p className="text-[10px] text-[#9098b1]">Servicio · RPU {meter.servicio_rpu}</p><p className="text-sm font-bold">{meter.servicio_nombre}</p><p className="text-xs text-[#747b91]">{meter.tipo_servicio_nombre}</p></div></div><div className="flex gap-3 rounded-2xl border p-4"><MapPin size={18} className="text-indigo-600"/><div><p className="text-[10px] text-[#9098b1]">Zona asignada</p><p className="text-sm font-bold">{meter.zona_nombre}</p></div></div></div></section>
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
  if(loading)return <div className="space-y-5"><div className="h-16 animate-pulse rounded-2xl bg-white"/><div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{Array.from({length:4}).map((_,i)=><div key={i} className="h-28 animate-pulse rounded-2xl bg-white"/>)}</div><div className="h-80 animate-pulse rounded-3xl bg-white"/></div>;
  if(error)return <div className="rounded-3xl bg-white p-10 text-center"><X className="mx-auto text-red-500"/><h2 className="mt-4 font-bold">No se pudieron cargar los medidores</h2><p className="text-xs text-[#9098b1]">{error}</p><button type="button" onClick={()=>void load()} className="mt-5 rounded-xl bg-[#ff8a1f] px-4 py-2 text-xs font-bold text-white">Reintentar</button></div>;

  return <div className="flex flex-col gap-6">
    <header className="flex justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#ff8a1f]">Administración</p><h1 className="text-2xl font-bold">Módulo de Medidores</h1><p className="text-sm text-[#9098b1]">Consulta, filtra y supervisa los medidores registrados.</p></div><button type="button" onClick={()=>void load()} className="flex h-fit items-center gap-2 rounded-xl border bg-white px-3.5 py-2.5 text-xs font-bold"><RefreshCw size={14}/>Actualizar</button></header>
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[["Registrados",meters.length,Server,"#6366f1"],["Instalados",installed,Activity,"#10b981"],["Retirados",retired,Calendar,"#9098b1"],["Calidad promedio",`${avg.toFixed(1)}%`,Gauge,qualityColor(avg)]].map(([label,value,Icon,color])=>{const I=Icon as typeof Server;return <article key={String(label)} className="rounded-2xl border bg-white p-4"><I size={16} style={{color:String(color)}}/><p className="mt-3 text-[11px] text-[#9098b1]">{label}</p><p className="text-xl font-bold">{value}</p></article>;})}</section>
    <section className="rounded-3xl border bg-white p-4"><div className="flex flex-col gap-3 lg:flex-row"><div className="relative flex-1"><Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9098b1]"/><input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Buscar por ID, serie, marca, RPU o servicio..." className="w-full rounded-xl border bg-[#fafbfc] py-2.5 pl-10 pr-10 text-sm"/></div><button type="button" onClick={()=>setFiltersOpen(v=>!v)} className="flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold"><Filter size={14}/>Filtros {activeFilters>0&&<span>{activeFilters}</span>}</button><div className="flex rounded-xl border p-1"><button type="button" onClick={()=>setView("list")} className={`rounded-lg p-2 ${view==="list"?"bg-[#1a1a2e] text-white":""}`}><List size={15}/></button><button type="button" onClick={()=>setView("grid")} className={`rounded-lg p-2 ${view==="grid"?"bg-[#1a1a2e] text-white":""}`}><Grid2X2 size={15}/></button></div></div>{filtersOpen&&<div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]"><select value={zone} onChange={e=>{setZone(e.target.value);setPage(1);}} className="rounded-xl border px-3 py-2.5"><option>Todas</option>{zones.map(z=><option key={z}>{z}</option>)}</select><select value={brand} onChange={e=>{setBrand(e.target.value);setPage(1);}} className="rounded-xl border px-3 py-2.5"><option>Todas</option>{brands.map(b=><option key={b}>{b}</option>)}</select><select value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}} className="rounded-xl border px-3 py-2.5"><option>Todos</option><option>Instalado</option><option>Retirado</option></select><button type="button" onClick={reset} className="flex items-center justify-center gap-2 text-xs"><RotateCcw size={13}/>Limpiar</button></div>}</section>
    <div><h2 className="text-sm font-bold">Medidores</h2><p className="text-xs text-[#9098b1]">Mostrando {filtered.length?((current-1)*PAGE_SIZE+1):0}-{Math.min(current*PAGE_SIZE,filtered.length)} de {filtered.length}</p></div>
    {view==="list"?<div className="overflow-hidden rounded-3xl border bg-white"><div className="divide-y">{paged.map(m=>{const q=quality(m.calidad_enlace),c=qualityColor(q),style=getBrandStyle(m.marca);return <button type="button" key={m.id_medidor} onClick={()=>setSelected(m)} className="grid w-full gap-4 px-5 py-4 text-left hover:bg-[#fafaff] lg:grid-cols-[1.4fr_1fr_1fr_170px_110px_36px] lg:items-center"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl text-white" style={{background:style.gradient}}><b>{initials(m.marca)}</b></div><div><p className="text-sm font-bold">{m.numero_serie}</p><p className="text-[10px] text-[#9098b1]">#{m.id_medidor} · {m.marca} · {meterFunction(m)}</p></div></div><span className="truncate text-xs">{m.zona_nombre}</span><div><p className="truncate text-xs font-semibold">{m.servicio_nombre}</p><p className="text-[10px] text-[#9098b1]">RPU {m.servicio_rpu}</p></div><div><div className="flex justify-between text-[10px]"><b style={{color:c}}>{q.toFixed(1)}%</b><span>{qualityLabel(q)}</span></div><div className="mt-1 h-1.5 rounded-full bg-[#eaecf2]"><div className="h-full rounded-full" style={{width:`${q}%`,background:c}}/></div></div><span className="text-xs font-semibold">{m.estado}</span><ChevronRight size={16}/></button>;})}</div></div>:<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{paged.map(m=>{const q=quality(m.calidad_enlace),style=getBrandStyle(m.marca);return <button type="button" key={m.id_medidor} onClick={()=>setSelected(m)} className="rounded-3xl border bg-white p-5 text-left hover:shadow-xl"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl text-white" style={{background:style.gradient}}><b>{initials(m.marca)}</b></div><div><p className="text-sm font-bold">{m.numero_serie}</p><p className="text-[10px] text-[#9098b1]">{meterFunction(m)} · ID {m.id_medidor}</p></div></div><p className="mt-4 text-xs">Calidad: <b>{q.toFixed(1)}%</b></p><p className="mt-2 text-xs">Zona: <b>{m.zona_nombre}</b></p><p className="mt-2 text-xs">Antigüedad: <b>{meterAge(m)}</b></p></button>;})}</div>}
    {filtered.length>0&&<nav className="flex items-center justify-center gap-1.5 rounded-2xl border bg-white p-3"><button disabled={current===1} onClick={()=>setPage(v=>Math.max(1,v-1))} className="h-8 w-8"><ChevronLeft size={14}/></button>{pages.map((number,index)=><span key={number} className="flex items-center gap-1.5">{index>0&&number-pages[index-1]>1&&"…"}<button onClick={()=>setPage(number)} className={`h-8 min-w-8 rounded-lg text-xs font-bold ${number===current?"bg-[#1a1a2e] text-white":""}`}>{number}</button></span>)}<button disabled={current===totalPages} onClick={()=>setPage(v=>Math.min(totalPages,v+1))} className="h-8 w-8"><ChevronRight size={14}/></button></nav>}
    {selected&&<MeterDetail meter={selected} onClose={()=>setSelected(null)}/>}  
  </div>;
}
