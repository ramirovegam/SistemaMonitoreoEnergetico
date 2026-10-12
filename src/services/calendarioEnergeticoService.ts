const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export interface DiaCalendario {
  fecha: string;
  tipo_dia: string;
  es_festivo: boolean;
  es_vacacional: boolean;
  temp_min_c: number;
  temp_max_c: number;
  factor_estacional: number;
}

export interface ResumenCalendario {
  dias_registrados: number;
  dias_festivos: number;
  dias_vacacionales: number;
  temperatura_minima_c: number | null;
  temperatura_maxima_c: number | null;
  factor_estacional_promedio: number | null;
}

export interface CalendarioEnergeticoResponse {
  anio: number;
  mes_inicio: number;
  mes_fin: number;
  resumen: ResumenCalendario;
  dias: DiaCalendario[];
}

export interface DetalleDia extends DiaCalendario {
  nombre_dia: string;
  temperatura_media_c: number;
  amplitud_termica_c: number;
  ajuste_estacional_pct: number;
  consumo_total_kwh: number;
  consumo_promedio_medidor_kwh: number;
  hora_pico: number | null;
  lecturas: number;
  medidores_con_lectura: number;
  eventos: number;
  alertas: number;
}

export async function obtenerCalendarioEnergetico(
  anio = 2026,
  mesInicio = 1,
  mesFin = 3,
): Promise<CalendarioEnergeticoResponse> {
  const params = new URLSearchParams({
    anio: String(anio),
    mes_inicio: String(mesInicio),
    mes_fin: String(mesFin),
  });
  const response = await fetch(
    `${API_URL}/api/calendario-energetico?${params.toString()}`,
  );
  if (!response.ok) {
    throw new Error(`No se pudo cargar el calendario: HTTP ${response.status}`);
  }
  return response.json() as Promise<CalendarioEnergeticoResponse>;
}

export async function obtenerDetalleDia(fecha: string): Promise<DetalleDia> {
  const response = await fetch(
    `${API_URL}/api/calendario-energetico/${fecha}`,
  );
  if (!response.ok) {
    throw new Error(`No se pudo cargar el detalle del día: HTTP ${response.status}`);
  }
  return response.json() as Promise<DetalleDia>;
}
