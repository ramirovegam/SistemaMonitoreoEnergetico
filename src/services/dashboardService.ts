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
  fecha?: string;
  idZona?: number;
  limiteTop?: number;
}

const API_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

function esFechaISOValida(fecha: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(fecha);
}

async function obtenerMensajeError(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();

    if (body && typeof body === "object" && "detail" in body) {
      const detail = (body as { detail?: unknown }).detail;

      if (typeof detail === "string") {
        return detail;
      }

      if (Array.isArray(detail)) {
        return detail
          .map((item) => {
            if (!item || typeof item !== "object") return String(item);

            const error = item as {
              loc?: Array<string | number>;
              msg?: string;
            };
            const ubicacion = error.loc?.join(".");

            return ubicacion
              ? `${ubicacion}: ${error.msg ?? "Parámetro inválido"}`
              : error.msg ?? "Parámetro inválido";
          })
          .join("; ");
      }
    }
  } catch {
    // La respuesta no contiene JSON válido.
  }

  return `Error HTTP ${response.status}: ${response.statusText || "No se pudo cargar el dashboard"}`;
}

export async function obtenerDashboard(
  filtros: DashboardFiltros = {},
  signal?: AbortSignal,
): Promise<DashboardData> {
  const params = new URLSearchParams();

  if (filtros.fecha) {
    if (!esFechaISOValida(filtros.fecha)) {
      throw new Error(
        `La fecha "${filtros.fecha}" no tiene el formato esperado YYYY-MM-DD.`,
      );
    }

    params.set("fecha", filtros.fecha);
  }

  if (filtros.idZona !== undefined) {
    params.set("id_zona", String(filtros.idZona));
  }

  params.set("limite_top", String(filtros.limiteTop ?? 10));

  const query = params.toString();
  const url = `${API_URL}/api/dashboard${query ? `?${query}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(await obtenerMensajeError(response));
  }

  return (await response.json()) as DashboardData;
}
