export interface Alerta {
  id_alerta: number;
  id_evento: number | null;
  id_tipo_evento: number;

  ts_generacion: string;
  prioridad: number;
  ts_cierre: string | null;
  resultado: string | null;
  estado: string;

  id_medidor: number;
  medidor_numero_serie: string;
  medidor_marca: string;
  calidad_enlace: number;

  id_servicio: number;
  servicio_nombre: string;
  servicio_rpu: string;

  id_zona: number;
  zona_nombre: string;
}


const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000";


export async function obtenerAlertas(): Promise<Alerta[]> {
  const response = await fetch(
    `${API_URL}/api/alertas`,
  );

  if (!response.ok) {
    const detalle = await response.text();

    throw new Error(
      `No se pudieron cargar las alertas. ` +
      `${response.status}: ${detalle}`,
    );
  }

  return response.json();
}