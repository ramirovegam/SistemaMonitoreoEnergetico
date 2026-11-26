const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

const ID_SESION = (() => {
  try {
    return (
      globalThis.crypto?.randomUUID?.() ??
      `sesion-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
  } catch {
    return `sesion-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
})();

export interface Sugerencia {
  intent: string;
  pregunta: string;
  descripcion: string;
}

export interface MensajeHistorial {
  rol: "usuario" | "asistente";
  contenido: string;
}

export interface SerieGrafica {
  clave: string;
  etiqueta: string;
}

export interface Grafica {
  tipo: "linea" | "barras";
  titulo: string;
  subtitulo?: string;
  eje_x: string;
  series: SerieGrafica[];
}

export interface DatosVisualizacion extends Grafica {
  datos: RegistroServicio[];
}

export type RegistroServicio = Record<string, unknown>;

export interface FormulaAplicada {
  nombre: string;
  expresion: string;
  resultado: unknown;
  interpretacion: string;
  metodo: string;
  fuentes: string[];
}

export interface RespuestaAsistente {
  pregunta: string;
  respuesta: string;
  fuentes: string[];
  formulas_aplicadas: FormulaAplicada[];
  datos_visualizacion: DatosVisualizacion[];
  modo: "conversacional" | "conceptual" | "datos";
  origen: "llm" | "local";
  aviso: string | null;
  /* Campos conservados para compatibilidad con respuestas anteriores. */
  fuente?: string[];
  metodo?: string | null;
  datos?: unknown;
  grafica?: DatosVisualizacion | null;
}

async function leerError(response: Response): Promise<string> {
  try {
    const cuerpo = (await response.json()) as { detail?: unknown };
    if (typeof cuerpo.detail === "string") return cuerpo.detail;
  } catch {
    /* la API no devolvió JSON */
  }
  return `La API devolvió el estado ${response.status}.`;
}

export async function obtenerSugerencias(): Promise<Sugerencia[]> {
  const response = await fetch(`${API_URL}/api/asistente/sugerencias`);
  if (!response.ok) throw new Error(await leerError(response));
  return (await response.json()) as Sugerencia[];
}

export async function consultarAsistente(
  pregunta: string,
  historial: MensajeHistorial[] = [],
): Promise<RespuestaAsistente> {
  const response = await fetch(`${API_URL}/api/asistente/consultar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-simet-session": ID_SESION,
    },
    body: JSON.stringify({ pregunta, historial: historial.slice(-12) }),
  });
  if (!response.ok) throw new Error(await leerError(response));
  return (await response.json()) as RespuestaAsistente;
}
