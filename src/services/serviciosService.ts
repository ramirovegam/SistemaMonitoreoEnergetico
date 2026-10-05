export interface Servicio {
  id_servicio: number;
  rpu: string;

  id_zona: number;
  zona_nombre: string;

  id_tipo_servicio: number;
  tipo_servicio_clave: string;
  tipo_servicio_nombre: string;
  tipo_servicio_categoria: string;
  consumo_base_kwh_h: number;
  factor_dispersion: number;
  sensibilidad_temp: number;

  id_tarifa: number;

  nombre: string;
  latitud: number;
  longitud: number;
  ocupacion_estimada: number | null;
  carga_contratada_kw: number;
  tiene_solar: boolean;
}


const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000";


export async function obtenerServicios(): Promise<Servicio[]> {
  const response = await fetch(
    `${API_URL}/api/servicios`,
  );

  if (!response.ok) {
    const detalle = await response.text();

    throw new Error(
      `No se pudieron cargar los servicios. ` +
      `${response.status}: ${detalle}`,
    );
  }

  return response.json();
}