export interface ZonaMapa {
  id_zona: number;
  nombre: string;
  descripcion?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  consumo_kwh?: number;
  total_medidores?: number;
  medidores_activos?: number;
  medidores_fuera_servicio?: number;
  alertas_activas?: number;
  calidad_promedio?: number;
}

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export async function obtenerZonasMapa(): Promise<ZonaMapa[]> {
  const response = await fetch(`${API_URL}/api/zonas`);
  if (!response.ok) throw new Error(`Error HTTP ${response.status} al cargar zonas`);
  const body = await response.json();
  const rows = Array.isArray(body) ? body : body.items ?? body.zonas ?? [];
  return rows.map((row: Record<string, unknown>) => ({
    id_zona: Number(row.id_zona ?? row.id ?? 0),
    nombre: String(row.nombre ?? row.name ?? "Zona sin nombre"),
    descripcion: row.descripcion == null ? null : String(row.descripcion),
    latitud: row.latitud == null ? null : Number(row.latitud),
    longitud: row.longitud == null ? null : Number(row.longitud),
    consumo_kwh: Number(row.consumo_kwh ?? row.consumo_total_kwh ?? 0),
    total_medidores: Number(row.total_medidores ?? row.medidores ?? 0),
    medidores_activos: Number(row.medidores_activos ?? 0),
    medidores_fuera_servicio: Number(row.medidores_fuera_servicio ?? 0),
    alertas_activas: Number(row.alertas_activas ?? 0),
    calidad_promedio: Number(row.calidad_promedio ?? row.calidad_enlace ?? 0),
  }));
}
