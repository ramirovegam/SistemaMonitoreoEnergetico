export interface Medidor {
  id_medidor: number;
  numero_serie: string;
  marca: string;
  multiplicador: number;
  fecha_instalacion: string;
  fecha_retiro: string | null;
  calidad_enlace: number;
  estado: string;

  id_servicio: number;
  servicio_nombre: string;
  servicio_rpu: string;

  id_zona: number;
  zona_nombre: string;

  id_tipo_servicio: number;
  tipo_servicio_nombre: string;
  tipo_servicio_categoria: string;
}


const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000";


export async function obtenerMedidores(): Promise<Medidor[]> {
  const response = await fetch(
    `${API_URL}/api/medidores`,
  );

  if (!response.ok) {
    const detalle = await response.text();

    throw new Error(
      `No se pudieron cargar los medidores. ` +
      `${response.status}: ${detalle}`,
    );
  }

  return response.json();
}