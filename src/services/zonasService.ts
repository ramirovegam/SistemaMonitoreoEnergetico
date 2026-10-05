export interface Zona {
  id_zona: number;
  nombre: string;
  tipo_urbano: string;
  superficie_km2: number;
  factor_socioeconomico: number;
  poblacion_total: number | null;
  viviendas_habitadas: number | null;
  grado_rezago_representativo: string | null;
  id_referencia: number | null;
}

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export async function obtenerZonas(): Promise<Zona[]> {
  const response = await fetch(`${API_URL}/api/zonas`);

  if (!response.ok) {
    const detalle = await response.text();

    throw new Error(
      `No se pudieron cargar las zonas. ${response.status}: ${detalle}`,
    );
  }

  return response.json();
}