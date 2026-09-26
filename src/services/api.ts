const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

// Pydantic serializa los campos Decimal como string para no perder precisión
export interface ZonaApi {
  id_zona: number;
  nombre: string;
  tipo_urbano: string;
  superficie_km2: string;
  factor_socioeconomico: string;
}

export async function testBackend() {
  const response = await fetch(`${API_URL}/api/test`);

  if (!response.ok) {
    throw new Error("Error al conectar con el backend");
  }

  return response.json();
}

export async function obtenerZonas(): Promise<ZonaApi[]> {
  const response = await fetch(`${API_URL}/api/zonas/`);

  if (!response.ok) {
    throw new Error("Error al obtener las zonas");
  }

  return response.json();
}
