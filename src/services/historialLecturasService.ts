export interface LecturaHistorial {
  id_medidor: number;
  numero_serie: string;
  marca: string;
  ts: string;
  consumo_kwh: number | null;
  consumo_real_kwh: number;
  id_evento: number | null;
  calidad_enlace: number;
  estado: string;
  id_servicio: number;
  servicio_nombre: string;
  servicio_rpu: string;
  id_zona: number;
  zona_nombre: string;
  voltaje: number | null;
  corriente: number | null;
  potencia: number | null;
}

export interface HistorialPaginado {
  items: LecturaHistorial[];
  total: number;
  pagina: number;
  por_pagina: number;
  total_paginas: number;
}

export interface GrupoLecturas {
  periodo: string;
  total_lecturas: number;
  consumo_total_kwh: number;
  consumo_promedio_kwh: number;
  consumo_minimo_kwh: number;
  consumo_maximo_kwh: number;
}

export interface HuecoLectura {
  id_medidor: number;
  numero_serie: string;
  inicio_hueco: string;
  fin_hueco: string;
  minutos_sin_datos: number;
  lecturas_estimadas_faltantes: number;
}

export interface AnalisisHuecos {
  intervalo_esperado_minutos: number;
  total_huecos: number;
  huecos: HuecoLectura[];
}

export interface FiltrosHistorial {
  pagina?: number;
  porPagina?: number;
  desde?: string;
  hasta?: string;
  idMedidor?: number;
  idZona?: number;
  busquedaMedidor?: string;
  orden?: "asc" | "desc";
}

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const BASE = `${API_URL}/api/historial-lecturas`;

function crearParametros(filtros: FiltrosHistorial): URLSearchParams {
  const p = new URLSearchParams();
  if (filtros.pagina) p.set("pagina", String(filtros.pagina));
  if (filtros.porPagina) p.set("por_pagina", String(filtros.porPagina));
  if (filtros.desde) p.set("desde", filtros.desde);
  if (filtros.hasta) p.set("hasta", filtros.hasta);
  if (filtros.idMedidor) p.set("id_medidor", String(filtros.idMedidor));
  if (filtros.idZona) p.set("id_zona", String(filtros.idZona));
  if (filtros.busquedaMedidor) p.set("busqueda_medidor", filtros.busquedaMedidor);
  if (filtros.orden) p.set("orden", filtros.orden);
  return p;
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    let message = `Error HTTP ${response.status}`;
    try {
      const body = await response.json();
      if (typeof body.detail === "string") message = body.detail;
    } catch { /* respuesta sin JSON */ }
    throw new Error(message);
  }
  return response.json();
}

export function obtenerHistorial(filtros: FiltrosHistorial): Promise<HistorialPaginado> {
  return getJson(`${BASE}?${crearParametros(filtros)}`);
}

export function obtenerLecturaOriginal(
  idMedidor: number,
  ts: string,
): Promise<LecturaHistorial & { clave_registro: string }> {
  const p = new URLSearchParams({ id_medidor: String(idMedidor), ts });
  return getJson(`${BASE}/original?${p}`);
}

export function obtenerLecturasAgrupadas(
  filtros: FiltrosHistorial,
  agrupacion: "hora" | "dia" | "mes",
): Promise<GrupoLecturas[]> {
  const p = crearParametros(filtros);
  p.set("agrupacion", agrupacion);
  return getJson(`${BASE}/agrupado?${p}`);
}

export function detectarHuecos(
  filtros: FiltrosHistorial,
  intervaloEsperadoMinutos = 15,
): Promise<AnalisisHuecos> {
  const p = crearParametros(filtros);
  p.set("intervalo_esperado_minutos", String(intervaloEsperadoMinutos));
  return getJson(`${BASE}/huecos?${p}`);
}

export async function descargarHistorialCsv(filtros: FiltrosHistorial): Promise<void> {
  const response = await fetch(`${BASE}/exportar.csv?${crearParametros(filtros)}`);
  if (!response.ok) throw new Error("No se pudo generar el archivo CSV");

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "historial_lecturas.csv";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
