export interface CalendarioDia {
  fecha: string;
  tipo_dia: string;
  es_festivo: boolean;
  es_vacacional: boolean;
  temp_min_c: number;
  temp_max_c: number;
  factor_estacional: number;
}

export interface CalendarioListaResponse {
  total: number;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  registros: CalendarioDia[];
}

const API_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

function esCalendarioDia(value: unknown): value is CalendarioDia {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Partial<CalendarioDia>;

  return (
    typeof item.fecha === "string" &&
    typeof item.tipo_dia === "string" &&
    typeof item.es_festivo === "boolean" &&
    typeof item.es_vacacional === "boolean" &&
    item.temp_min_c !== undefined &&
    item.temp_max_c !== undefined &&
    item.factor_estacional !== undefined
  );
}

export async function obtenerCalendario(
  signal?: AbortSignal,
): Promise<CalendarioDia[]> {
  const response = await fetch(`${API_URL}/api/calendario`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(
      `No se pudo cargar el calendario: HTTP ${response.status}`,
    );
  }

  const contenido: unknown = await response.json();

  const registros = Array.isArray(contenido)
    ? contenido
    : (contenido as CalendarioListaResponse)?.registros;

  if (!Array.isArray(registros)) {
    throw new Error(
      "El endpoint de calendario no devolvió una lista válida.",
    );
  }

  return registros
    .filter(esCalendarioDia)
    .map((dia) => ({
      ...dia,
      fecha: dia.fecha.slice(0, 10),
      tipo_dia: dia.tipo_dia.trim(),
      temp_min_c: Number(dia.temp_min_c),
      temp_max_c: Number(dia.temp_max_c),
      factor_estacional: Number(dia.factor_estacional),
    }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export async function obtenerCalendarioPorFecha(
  fecha: string,
  signal?: AbortSignal,
): Promise<CalendarioDia> {
  const response = await fetch(
    `${API_URL}/api/calendario/${encodeURIComponent(fecha)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal,
    },
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`No existe información para la fecha ${fecha}.`);
    }

    throw new Error(
      `No se pudo cargar la fecha ${fecha}: HTTP ${response.status}`,
    );
  }

  const dia = (await response.json()) as CalendarioDia;

  return {
    ...dia,
    fecha: dia.fecha.slice(0, 10),
    tipo_dia: dia.tipo_dia.trim(),
    temp_min_c: Number(dia.temp_min_c),
    temp_max_c: Number(dia.temp_max_c),
    factor_estacional: Number(dia.factor_estacional),
  };
}