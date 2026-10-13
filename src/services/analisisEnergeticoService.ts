export interface MedidorAnalisis {
  id_medidor: number;
  numero_serie: string;
  marca: string;
  id_servicio: number;
  servicio_nombre: string;
  servicio_rpu: string;
  id_zona: number;
  zona_nombre: string;
  id_tipo_servicio: number;
  tipo_servicio_nombre: string;
}

export interface LecturaEnergetica {
  id_medidor: number;
  ts: string;
  consumo_kwh: number | null;
  consumo_real_kwh: number;
  id_evento: number | null;
}

export interface PerfilHorario {
  id_tipo_servicio: number;
  tipo_servicio_nombre: string;
  tipo_dia: string;
  hora: number;
  factor: number;
}

export interface PeriodoFacturacion {
  id_periodo: number;
  id_servicio: number;
  servicio_nombre: string;
  servicio_rpu: string;
  folio: string;
  fecha_inicio: string;
  fecha_fin: string;
  id_tarifa_aplicada: number;
  tarifa_codigo: string;
  tarifa_nombre: string;
  registro_inicial_kwh: number;
  registro_final_kwh: number;
  consumo_real_kwh: number;
  clasificacion_dac: boolean;
}

export interface ResumenAnalisis {
  total_lecturas: number;
  consumo_total_kwh: number;
  consumo_promedio_kwh: number;
  consumo_maximo_kwh: number;
  hora_maximo: string | null;
}

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const BASE = `${API_URL}/api/analisis-energetico`;

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    let message = `Error HTTP ${response.status}`;
    try {
      const data = await response.json();
      if (typeof data.detail === "string") message = data.detail;
    } catch { /* respuesta sin JSON */ }
    throw new Error(message);
  }
  return response.json();
}

export const obtenerMedidoresAnalisis = (): Promise<MedidorAnalisis[]> =>
  getJson(`${BASE}/medidores`);

export const obtenerLecturas = (idMedidor: number, limite = 500): Promise<LecturaEnergetica[]> =>
  getJson(`${BASE}/lecturas?id_medidor=${idMedidor}&limite=${limite}`);

export const obtenerResumenAnalisis = (idMedidor: number): Promise<ResumenAnalisis> =>
  getJson(`${BASE}/resumen?id_medidor=${idMedidor}`);

export const obtenerPerfilHorario = (
  idTipoServicio: number,
  tipoDia: string,
): Promise<PerfilHorario[]> =>
  getJson(`${BASE}/perfil-horario?id_tipo_servicio=${idTipoServicio}&tipo_dia=${encodeURIComponent(tipoDia)}`);

export const obtenerPeriodos = (idServicio: number): Promise<PeriodoFacturacion[]> =>
  getJson(`${BASE}/periodos?id_servicio=${idServicio}`);

export const obtenerTiposDia = (idTipoServicio: number): Promise<string[]> =>
  getJson(`${BASE}/tipos-dia?id_tipo_servicio=${idTipoServicio}`);
