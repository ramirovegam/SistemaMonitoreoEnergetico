const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export interface Alerta {
  id_alerta: number;
  id_evento: number | null;
  id_medidor: number;
  id_tipo_evento: number;
  ts_generacion: string;
  prioridad: number;
  ts_cierre: string | null;
  resultado: string | null;
  estado: "Activa" | "Cerrada";
  tipo_evento_clave: string;
  tipo_evento_nombre: string;
  tipo_evento_efecto: string;
  tipo_evento_afecta_acumulado: boolean;
  tipo_evento_regla: string;
  tipo_evento_duracion_min_h: number;
  tipo_evento_duracion_max_h: number;
  evento_ts_inicio: string | null;
  evento_ts_fin: string | null;
  evento_intensidad: number | null;
  evento_kwh_desviados: number | null;
  medidor_numero_serie: string;
  medidor_marca: string;
  calidad_enlace: number;
  id_servicio: number;
  servicio_nombre: string;
  servicio_rpu: string;
  id_zona: number;
  zona_nombre: string;
}

export interface CatalogosAlertas {
  tipos_evento: Array<{ id_tipo_evento:number; clave:string; nombre:string; efecto:string; regla_deteccion:string }>;
  zonas: Array<{ id_zona:number; nombre:string }>;
  servicios: Array<{ id_servicio:number; id_zona:number; nombre:string; rpu:string }>;
  medidores: Array<{ id_medidor:number; id_servicio:number; numero_serie:string }>;
  anio_referencia: number;
}

export interface FiltrosAlertas {
  mes?: number;
  anio?: number;
  idZona?: number;
  idServicio?: number;
  idMedidor?: number;
  idTipoEvento?: number;
  estado?: "Activa" | "Cerrada";
  prioridad?: number;
}

export async function obtenerAlertas(filtros: FiltrosAlertas = {}): Promise<Alerta[]> {
  const params = new URLSearchParams();
  if (filtros.mes) params.set("mes", String(filtros.mes));
  if (filtros.anio) params.set("anio", String(filtros.anio));
  if (filtros.idZona) params.set("id_zona", String(filtros.idZona));
  if (filtros.idServicio) params.set("id_servicio", String(filtros.idServicio));
  if (filtros.idMedidor) params.set("id_medidor", String(filtros.idMedidor));
  if (filtros.idTipoEvento) params.set("id_tipo_evento", String(filtros.idTipoEvento));
  if (filtros.estado) params.set("estado", filtros.estado);
  if (filtros.prioridad) params.set("prioridad", String(filtros.prioridad));
  const response = await fetch(`${API_URL}/api/alertas?${params.toString()}`);
  if (!response.ok) throw new Error(`No se pudieron cargar las alertas: HTTP ${response.status}`);
  return response.json() as Promise<Alerta[]>;
}

export async function obtenerCatalogosAlertas(): Promise<CatalogosAlertas> {
  const response = await fetch(`${API_URL}/api/alertas/catalogos`);
  if (!response.ok) throw new Error(`No se pudieron cargar los catálogos: HTTP ${response.status}`);
  return response.json() as Promise<CatalogosAlertas>;
}
