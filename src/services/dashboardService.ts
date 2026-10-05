export interface DashboardIndicadores {
  consumo_ultima_lectura_kwh: number;
  fecha_ultima_lectura: string | null;
  consumo_dia_kwh: number;
  consumo_mes_kwh: number;
  demanda_maxima_lectura_kwh: number;
  fecha_demanda_maxima: string | null;
  consumo_promedio_lectura_kwh: number;
  lecturas_dia: number;
  total_medidores: number;
  medidores_activos: number;
  medidores_desconectados: number;
  alertas_activas: number;
  calidad_promedio_datos: number;
}

export interface PuntoSerie {
  periodo: string;
  consumo_kwh: number;
  lecturas: number;
}

export interface PerfilZona {
  periodo: string;
  id_zona: number;
  zona_nombre: string;
  consumo_kwh: number;
}

export interface ConsumoZona {
  id_zona: number;
  zona_nombre: string;
  consumo_kwh: number;
  porcentaje: number;
}

export interface ComparacionPeriodo {
  periodo_actual_kwh: number;
  periodo_anterior_kwh: number;
  diferencia_kwh: number;
  variacion_porcentual: number | null;
  inicio_actual: string;
  fin_actual: string;
  inicio_anterior: string;
  fin_anterior: string;
}

export interface DistribucionInstalacion {
  id_tipo_servicio: number;
  tipo_servicio_nombre: string;
  categoria: string;
  consumo_kwh: number;
  porcentaje: number;
}

export interface MedidorMayorConsumo {
  id_medidor: number;
  numero_serie: string;
  marca: string;
  zona_nombre: string;
  servicio_nombre: string;
  consumo_kwh: number;
}

export interface EstadoMedidor {
  estado: string;
  total: number;
  porcentaje: number;
}

export interface AlertaRecienteDashboard {
  id_alerta: number;
  id_medidor: number;
  numero_serie: string;
  zona_nombre: string;
  id_tipo_evento: number;
  prioridad: number;
  ts_generacion: string;
  estado: string;
  resultado: string | null;
}

export interface MedidorFueraServicio {
  id_medidor: number;
  numero_serie: string;
  marca: string;
  zona_nombre: string;
  servicio_nombre: string;
  fecha_retiro: string | null;
  calidad_enlace: number;
}

export interface DashboardData {
  fecha_referencia: string;
  indicadores: DashboardIndicadores;
  perfil_horario_zonas: PerfilZona[];
  ultimas_24_horas: PuntoSerie[];
  consumo_diario_mes: PuntoSerie[];
  consumo_por_zona: ConsumoZona[];
  comparacion_periodo: ComparacionPeriodo;
  distribucion_por_instalacion: DistribucionInstalacion[];
  medidores_mayor_consumo: MedidorMayorConsumo[];
  estados_medidores: EstadoMedidor[];
  alertas_recientes: AlertaRecienteDashboard[];
  medidores_fuera_servicio: MedidorFueraServicio[];
}

export interface DashboardFiltros {
  periodo?: "hoy" | "7d" | "30d" | "mes";
  desde?: string;
  hasta?: string;
  idZona?: number;
  limiteTop?: number;
}

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export async function obtenerDashboard(
  filtros: DashboardFiltros = {},
): Promise<DashboardData> {
  const params = new URLSearchParams();
  params.set("periodo", filtros.periodo ?? "mes");
  if (filtros.desde) params.set("desde", filtros.desde);
  if (filtros.hasta) params.set("hasta", filtros.hasta);
  if (filtros.idZona) params.set("id_zona", String(filtros.idZona));
  params.set("limite_top", String(filtros.limiteTop ?? 10));

  const response = await fetch(`${API_URL}/api/dashboard?${params}`);
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
