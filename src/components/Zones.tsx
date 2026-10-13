import { useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, ArrowDown, ArrowUp, BarChart3, Building2,
  Gauge, Home, MapPin, RefreshCw, Search, TrendingUp, Users,
  WalletCards, Zap,
} from "lucide-react";
import { obtenerZonas, type Zona } from "../services/zonasService";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const MONTHS = [{ value: 1, label: "Enero" }, { value: 2, label: "Febrero" }, { value: 3, label: "Marzo" }];
const COLORS = ["#ff8a1f", "#6366f1", "#10b981", "#f59e0b", "#06b6d4", "#ec4899"];

type RankingKey = "mayor_consumo" | "menor_consumo" | "consumo_vivienda" | "consumo_habitante" | "crecimiento_mensual" | "mas_alertas" | "alertas_medidor" | "menor_calidad" | "fuera_servicio" | "lecturas_faltantes" | "mejor_disponibilidad" | "ahorro_potencial";
interface Indicators {
  id_zona: number; consumo_total_kwh: number; consumo_por_vivienda_kwh: number;
  consumo_por_habitante_kwh: number; crecimiento_mensual_pct: number;
  total_servicios: number; servicios_por_vivienda: number; total_medidores: number;
  medidores_activos: number; medidores_fuera_servicio: number; disponibilidad_pct: number;
  total_alertas: number; alertas_activas: number; alertas_por_medidor: number;
  calidad_enlace_promedio: number; lecturas_esperadas: number; lecturas_recibidas: number;
  lecturas_faltantes: number; ahorro_potencial_kwh: number; ahorro_pct: number;
}
type ZoneData = Zona & Indicators;
const EMPTY: Indicators = { id_zona:0, consumo_total_kwh:0, consumo_por_vivienda_kwh:0, consumo_por_habitante_kwh:0, crecimiento_mensual_pct:0, total_servicios:0, servicios_por_vivienda:0, total_medidores:0, medidores_activos:0, medidores_fuera_servicio:0, disponibilidad_pct:0, total_alertas:0, alertas_activas:0, alertas_por_medidor:0, calidad_enlace_promedio:0, lecturas_esperadas:0, lecturas_recibidas:0, lecturas_faltantes:0, ahorro_potencial_kwh:0, ahorro_pct:8 };
const RANKINGS: { key: RankingKey; label: string }[] = [
  {key:"mayor_consumo",label:"Mayor consumo"},{key:"menor_consumo",label:"Menor consumo"},
  {key:"consumo_vivienda",label:"Mayor consumo por vivienda"},{key:"consumo_habitante",label:"Mayor consumo por habitante"},
  {key:"crecimiento_mensual",label:"Mayor crecimiento mensual"},{key:"mas_alertas",label:"Más alertas"},
  {key:"alertas_medidor",label:"Más alertas por medidor"},{key:"menor_calidad",label:"Menor calidad de enlace"},
  {key:"fuera_servicio",label:"Más medidores fuera de servicio"},{key:"lecturas_faltantes",label:"Mayor cantidad de lecturas faltantes"},
  {key:"mejor_disponibilidad",label:"Mejor disponibilidad"},{key:"ahorro_potencial",label:"Mayor ahorro potencial"},
];
const fmt=(v:number|null|undefined,d=0)=>v==null?"Sin dato":v.toLocaleString("es-MX",{minimumFractionDigits:d,maximumFractionDigits:d});
const urban=(v:string)=>v.replaceAll("_"," ").toLowerCase().replace(/\b\w/g,l=>l.toUpperCase());
function sortValue(z:ZoneData,k:RankingKey){
  const values:Record<RankingKey,number>={mayor_consumo:z.consumo_total_kwh,menor_consumo:z.consumo_total_kwh,consumo_vivienda:z.consumo_por_vivienda_kwh,consumo_habitante:z.consumo_por_habitante_kwh,crecimiento_mensual:z.crecimiento_mensual_pct,mas_alertas:z.total_alertas,alertas_medidor:z.alertas_por_medidor,menor_calidad:z.calidad_enlace_promedio,fuera_servicio:z.medidores_fuera_servicio,lecturas_faltantes:z.lecturas_faltantes,mejor_disponibilidad:z.disponibilidad_pct,ahorro_potencial:z.ahorro_potencial_kwh};return values[k];
}
function displayValue(z:ZoneData,k:RankingKey){const v=sortValue(z,k);if(k.includes("consumo")||k==="ahorro_potencial")return `${fmt(v,2)} kWh`;if(k==="crecimiento_mensual"||k==="menor_calidad"||k==="mejor_disponibilidad")return `${fmt(v,1)}%`;return fmt(v,k==="alertas_medidor"?3:0);}

export default function Zones(){
  const [zones,setZones]=useState<ZoneData[]>([]);
  const [selectedId,setSelectedId]=useState<number|null>(null);
  const [month,setMonth]=useState(3);
  const [loadingMonth,setLoadingMonth]=useState<number|null>(null);
  const [ranking,setRanking]=useState<RankingKey>("mayor_consumo");
  const [search,setSearch]=useState("");
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);

  const load=async()=>{try{setLoading(true);setLoadingMonth(month);setError(null);const [base,res]=await Promise.all([obtenerZonas(),fetch(`${API_URL}/api/zonas/indicadores?mes=${month}&ahorro_pct=8`)]);if(!res.ok)throw new Error(`HTTP ${res.status}: ${await res.text()}`);const indicators=await res.json() as Indicators[];const map=new Map(indicators.map(i=>[i.id_zona,i]));const merged=base.map(z=>({...z,...EMPTY,...map.get(z.id_zona),id_zona:z.id_zona}));setZones(merged);setSelectedId(id=>id&&merged.some(z=>z.id_zona===id)?id:merged[0]?.id_zona??null);}catch(e){setError(e instanceof Error?e.message:"Error al cargar zonas");}finally{setLoading(false);setLoadingMonth(null);}};
  useEffect(()=>{void load();},[month]);

  const ordered=useMemo(()=>[...zones].filter(z=>z.nombre.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>{const av=sortValue(a,ranking),bv=sortValue(b,ranking);return ranking==="menor_consumo"||ranking==="menor_calidad"?av-bv:bv-av;}),[zones,search,ranking]);
  const zone=zones.find(z=>z.id_zona===selectedId)??ordered[0];
  const monthLabel=MONTHS.find(m=>m.value===month)?.label??"Mes";
  const loadingLabel=MONTHS.find(m=>m.value===loadingMonth)?.label??monthLabel;
  if(loading&&!zones.length)return <div className="card flex items-center justify-center gap-3 p-8"><RefreshCw className="animate-spin text-[#ff8a1f]"/><span>Cargando datos de {loadingLabel}...</span></div>;
  if(error)return <div className="card p-8 text-center"><AlertTriangle className="mx-auto text-red-500"/><p className="mt-3 font-bold">No se pudieron cargar los indicadores</p><p className="mt-1 text-xs text-[#9098b1]">{error}</p><button type="button" onClick={()=>void load()} className="mt-4 rounded-xl bg-[#ff8a1f] px-4 py-2 text-xs text-white">Reintentar</button></div>;
  if(!zone)return null;
  const position=ordered.findIndex(z=>z.id_zona===zone.id_zona)+1;
  const color=COLORS[Math.max(0,zones.findIndex(z=>z.id_zona===zone.id_zona))%COLORS.length];
  const density=zone.poblacion_total&&zone.superficie_km2?zone.poblacion_total/zone.superficie_km2:0;
  const cards=[
    ["Población total",fmt(zone.poblacion_total),"Habitantes registrados",Users],["Viviendas habitadas",fmt(zone.viviendas_habitadas),"Viviendas registradas",Home],
    ["Servicios registrados",fmt(zone.total_servicios),`${fmt(zone.servicios_por_vivienda,3)} por vivienda`,Building2],["Medidores en la zona",fmt(zone.total_medidores),`${fmt(zone.medidores_activos)} activos`,Activity],
    ["Alertas de la zona",fmt(zone.total_alertas),`${fmt(zone.alertas_activas)} activas`,AlertTriangle],[`Consumo de ${monthLabel}`,`${fmt(zone.consumo_total_kwh,2)} kWh`,`${fmt(zone.consumo_por_vivienda_kwh,2)} kWh/vivienda`,Zap],
    ["Disponibilidad",`${fmt(zone.disponibilidad_pct,1)}%`,`${fmt(zone.medidores_fuera_servicio)} fuera de servicio`,Gauge],["Ahorro potencial",`${fmt(zone.ahorro_potencial_kwh,2)} kWh`,`${fmt(zone.ahorro_pct)}% del consumo mensual`,WalletCards],
  ] as const;

  return <div className="relative flex flex-col gap-6">
    {loading&&zones.length>0&&<div className="fixed inset-0 z-[2000] flex items-center justify-center bg-[#1a1a2e]/25 backdrop-blur-[2px]"><div className="min-w-[300px] rounded-3xl bg-white px-8 py-7 text-center shadow-2xl"><RefreshCw size={28} className="mx-auto animate-spin text-[#ff8a1f]"/><p className="mt-4 text-sm font-bold">Actualizando datos de {loadingLabel}</p><p className="mt-1 text-[11px] text-[#9098b1]">Calculando consumo, alertas, lecturas y ranking de las 46 zonas...</p><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#f0f1f7]"><div className="h-full w-1/2 animate-pulse rounded-full bg-[#ff8a1f]"/></div></div></div>}
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold text-[#1a1a2e]">Panel de Zonas</h1><p className="text-sm text-[#9098b1]">Análisis mensual territorial, energético y operativo</p></div><div className="flex gap-2">{loading?<span className="flex items-center gap-1.5 rounded-full bg-[#fff4ea] px-3 py-1.5 text-xs font-semibold text-[#ff8a1f]"><RefreshCw size={12} className="animate-spin"/>Actualizando {loadingLabel}</span>:<span className="rounded-full bg-[#ecfdf5] px-3 py-1.5 text-xs font-semibold text-[#059669]">Datos de {monthLabel} actualizados</span>}<span className="rounded-full bg-[#ecfdf5] px-3 py-1.5 text-xs font-semibold text-[#059669]">{zones.length} zonas</span></div></div>
    <div className="card grid gap-3 p-4 md:grid-cols-3"><div><label className="mb-2 block text-xs font-semibold text-[#9098b1]">Seleccionar zona</label><select disabled={loading} value={selectedId??""} onChange={e=>setSelectedId(Number(e.target.value))} className="w-full rounded-xl border bg-white px-4 py-3 text-sm font-semibold disabled:cursor-wait disabled:opacity-60">{zones.map(z=><option key={z.id_zona} value={z.id_zona}>{z.nombre}</option>)}</select></div><div><label className="mb-2 block text-xs font-semibold text-[#9098b1]">Mes de análisis</label><select disabled={loading} value={month} onChange={e=>setMonth(Number(e.target.value))} className="w-full rounded-xl border bg-white px-4 py-3 text-sm font-semibold disabled:cursor-wait disabled:opacity-60">{MONTHS.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}</select><p className="mt-1.5 text-[10px] text-[#9098b1]">Al cambiar el mes se recalculan todos los indicadores y el ranking.</p></div><div><label className="mb-2 block text-xs font-semibold text-[#9098b1]">Ordenar catálogo por</label><select disabled={loading} value={ranking} onChange={e=>setRanking(e.target.value as RankingKey)} className="w-full rounded-xl border bg-white px-4 py-3 text-sm font-semibold disabled:cursor-wait disabled:opacity-60">{RANKINGS.map(r=><option key={r.key} value={r.key}>{r.label}</option>)}</select></div></div>
    <div className="card p-5" style={{borderLeft:`4px solid ${color}`}}><p className="text-xs text-[#9098b1]">Zona seleccionada · {monthLabel} · posición #{position}</p><h2 className="text-xl font-bold">{zone.nombre}</h2><div className="mt-2 flex gap-2"><span className="rounded-full bg-[#f8f9fc] px-2.5 py-1 text-[11px]">{urban(zone.tipo_urbano)}</span><span className="rounded-full bg-[#fff4ea] px-2.5 py-1 text-[11px] font-bold text-[#ff8a1f]">{displayValue(zone,ranking)}</span></div></div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label,value,detail,Icon])=><div key={label} className="card p-4"><Icon size={17} className="mb-3 text-[#6366f1]"/><p className="text-[11px] text-[#9098b1]">{label}</p><p className="text-lg font-bold">{value}</p><p className="text-[10px] text-[#b0b6c8]">{detail}</p></div>)}</div>
    <div className="grid gap-4 lg:grid-cols-2"><div className="card p-5"><h3 className="text-sm font-semibold">Indicadores derivados de {monthLabel}</h3><div className="mt-4 grid grid-cols-2 gap-3">{[["Consumo por habitante",`${fmt(zone.consumo_por_habitante_kwh,2)} kWh`],["Crecimiento vs. mes anterior",`${fmt(zone.crecimiento_mensual_pct,1)}%`],["Alertas por medidor",fmt(zone.alertas_por_medidor,3)],["Calidad de enlace",`${fmt(zone.calidad_enlace_promedio,1)}%`],["Lecturas faltantes",fmt(zone.lecturas_faltantes)],["Densidad",`${fmt(density)} hab/km²`]].map(([l,v])=><div key={l} className="rounded-2xl bg-[#f8f9fc] p-3"><p className="text-[10px] text-[#9098b1]">{l}</p><p className="text-sm font-bold">{v}</p></div>)}</div></div><div className="card p-5"><h3 className="text-sm font-semibold">Estado de medición</h3><p className="mt-4 text-xs">Lecturas recibidas: <b>{fmt(zone.lecturas_recibidas)}</b> de {fmt(zone.lecturas_esperadas)}</p><p className="mt-3 text-xs">Medidores activos: <b>{fmt(zone.medidores_activos)}</b> de {fmt(zone.total_medidores)}</p></div></div>
    <div className="card p-5"><div className="flex flex-wrap justify-between gap-3"><div><h3 className="text-sm font-semibold">Catálogo y ranking de zonas</h3><p className="text-[11px] text-[#9098b1]">{monthLabel} · {RANKINGS.find(r=>r.key===ranking)?.label}</p></div><div className="relative"><Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar zona..." className="rounded-xl border py-2 pl-8 pr-3 text-xs"/></div></div><div className="mt-4 max-h-[520px] overflow-y-auto">{ordered.map((z,i)=><button type="button" key={z.id_zona} onClick={()=>setSelectedId(z.id_zona)} className={`grid w-full grid-cols-[48px_1fr] items-center gap-3 border-b px-3 py-3 text-left md:grid-cols-[60px_1fr_180px_120px_120px] ${z.id_zona===zone.id_zona?"bg-[#fff4ea]":"hover:bg-[#f8f9fc]"}`}><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#ff8a1f] text-xs font-bold text-white">{i+1}</span><span><b className="block text-xs">{z.nombre}</b><small>{urban(z.tipo_urbano)}</small></span><span className="hidden items-center gap-1 text-xs font-bold md:flex">{ranking==="menor_consumo"||ranking==="menor_calidad"?<ArrowDown size={12}/>:<ArrowUp size={12}/>} {displayValue(z,ranking)}</span><span className="hidden text-xs md:block">{fmt(z.total_servicios)} servicios</span><span className="hidden text-xs md:block">{fmt(z.total_medidores)} medidores</span></button>)}</div></div>
  </div>;
}
