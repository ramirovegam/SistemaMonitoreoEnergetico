import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Bot,
  Check,
  ChevronDown,
  CircleAlert,
  Copy,
  Eraser,
  Send,
  Sparkles,
  Wifi,
  WifiOff,
} from "lucide-react";

import { PageHeader } from "./ui/PageHeader";
import { Button } from "./ui/Button";
import { Skeleton } from "./ui/Feedback";
import { cn } from "./ui/cn";
import {
  consultarAsistente,
  obtenerSugerencias,
  type DatosVisualizacion,
  type MensajeHistorial,
  type RespuestaAsistente,
  type SerieGrafica,
  type Sugerencia,
} from "../services/asistenteService";

const PREGUNTAS_BASE: Sugerencia[] = [
  {
    intent: "resumen",
    pregunta: "¿Cuál es el consumo total y con qué semilla se generó?",
    descripcion: "Conteos, integridad y semilla",
  },
  {
    intent: "zonas",
    pregunta: "Haz un ranking de las 10 zonas con mayor consumo real",
    descripcion: "Comparativa por zona",
  },
  {
    intent: "tarifas",
    pregunta: "¿Qué tipo de servicio consume más y cómo se relaciona con DAC?",
    descripcion: "Servicios, tarifas y umbrales",
  },
  {
    intent: "alertas",
    pregunta: "¿Qué medidores tienen más alertas abiertas?",
    descripcion: "Alertas y calidad de enlace",
  },
  {
    intent: "tendencia",
    pregunta: "Proyecta el consumo a 15 días con intervalo de confianza",
    descripcion: "Estimación verificada",
  },
  {
    intent: "concepto",
    pregunta: "¿Qué significa Tarifa DAC?",
    descripcion: "Glosario de SIMET",
  },
];

type Registro = Record<string, unknown>;
type EstadoConexion = "verificando" | "en-linea" | "local";

interface ConfiguracionGrafica extends DatosVisualizacion {
  data: Registro[];
}

interface Mensaje {
  id: number;
  rol: "usuario" | "asistente";
  texto: string;
  pregunta?: string;
  respuesta?: RespuestaAsistente;
  historial?: MensajeHistorial[];
  error?: string;
}

const CLAVE_HISTORIAL = "simet-asistente-historial-v1";

function cargarHistorial(): Mensaje[] {
  try {
    const crudo = localStorage.getItem(CLAVE_HISTORIAL);
    if (!crudo) return [];
    const datos: unknown = JSON.parse(crudo);
    if (!Array.isArray(datos)) return [];
    return datos
      .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
      .filter(
        (item) =>
          (item.rol === "usuario" || item.rol === "asistente") &&
          typeof item.texto === "string" &&
          item.texto.length <= 800,
      )
      .slice(-12)
      .map((item, indice) => {
        const respuesta =
          item.respuesta && typeof item.respuesta === "object"
            ? (item.respuesta as RespuestaAsistente)
            : undefined;
        return {
          id: indice + 1,
          rol: item.rol as "usuario" | "asistente",
          texto: item.texto as string,
          pregunta:
            typeof item.pregunta === "string"
              ? item.pregunta.slice(0, 800)
              : undefined,
          respuesta:
            respuesta && typeof respuesta.respuesta === "string" ? respuesta : undefined,
          error: typeof item.error === "string" ? item.error : undefined,
        };
      });
  } catch {
    return [];
  }
}

function guardarHistorial(mensajes: Mensaje[]): void {
  try {
    if (mensajes.length === 0) {
      localStorage.removeItem(CLAVE_HISTORIAL);
      return;
    }
    const datos = mensajes.slice(-12).map((mensaje) => ({
      rol: mensaje.rol,
      texto: mensaje.texto,
      pregunta: mensaje.pregunta,
      respuesta: mensaje.respuesta,
      error: mensaje.error,
    }));
    localStorage.setItem(CLAVE_HISTORIAL, JSON.stringify(datos));
  } catch {
    // Sin almacenamiento local la conversación permanece solo en memoria.
  }
}

function comoNumero(valor: unknown): number {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
}

function comoTexto(valor: unknown): string {
  return valor === null || valor === undefined ? "" : String(valor);
}

function textoEnLinea(valor: string): ReactNode[] {
  return valor
    .split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
    .filter(Boolean)
    .map((parte, indice) => {
      if (parte.startsWith("**") && parte.endsWith("**")) {
        return <strong key={indice}>{parte.slice(2, -2)}</strong>;
      }
      if (parte.startsWith("`") && parte.endsWith("`")) {
        return (
          <code key={indice} className="font-mono text-[0.9em]">
            {parte.slice(1, -1)}
          </code>
        );
      }
      return parte;
    });
}

function Markdown({ texto }: { texto: string }) {
  const lineas = texto.split("\n");
  const bloques: ReactNode[] = [];
  let lista: { nivel: number; contenido: string }[] = [];

  const vaciarLista = () => {
    if (lista.length === 0) return;
    bloques.push(
      <ul key={`lista-${bloques.length}`} className="ml-4 space-y-1">
        {lista.map((item, indice) => (
          <li
            key={indice}
            className={
              item.nivel > 0
                ? "ml-4 list-[circle] text-muted"
                : "list-disc text-fg"
            }
          >
            {textoEnLinea(item.contenido)}
          </li>
        ))}
      </ul>,
    );
    lista = [];
  };

  lineas.forEach((linea, indice) => {
    const encabezado = linea.match(/^(#{1,4})\s+(.+)$/);
    const viñeta = linea.match(/^(\s*)(?:[-*]|\d+\.)\s+(.+)$/);
    if (encabezado) {
      vaciarLista();
      bloques.push(
        <h4
          key={`titulo-${indice}`}
          className="mt-2 text-sm font-semibold text-fg first:mt-0"
        >
          {textoEnLinea(encabezado[2])}
        </h4>,
      );
      return;
    }
    if (viñeta) {
      lista.push({
        nivel: viñeta[1].length >= 2 ? 1 : 0,
        contenido: viñeta[2],
      });
      return;
    }
    if (!linea.trim()) {
      vaciarLista();
      return;
    }
    vaciarLista();
    bloques.push(
      <p key={`parrafo-${indice}`} className="leading-relaxed">
        {textoEnLinea(linea)}
      </p>,
    );
  });
  vaciarLista();

  return <div className="space-y-2 text-sm text-fg">{bloques}</div>;
}

function construirGrafica(
  respuesta: RespuestaAsistente | null,
): ConfiguracionGrafica | null {
  const grafica = respuesta?.datos_visualizacion?.[0] ?? respuesta?.grafica;
  if (!grafica) return null;
  const filas = Array.isArray(grafica.datos) ? (grafica.datos as Registro[]) : [];
  const eje = grafica.eje_x;
  const agrupar = eje === "mes" || eje === "tipo_servicio";

  let data: Registro[];
  if (agrupar) {
    const grupos = new Map<string, Registro>();
    for (const fila of filas) {
      const clave = comoTexto(fila[eje]);
      const destino: Registro = grupos.get(clave) ?? { [eje]: clave };
      for (const serie of grafica.series) {
        destino[serie.clave] =
          comoNumero(destino[serie.clave]) + comoNumero(fila[serie.clave]);
      }
      grupos.set(clave, destino);
    }
    data = [...grupos.values()].sort((a, b) =>
      comoTexto(a[eje]).localeCompare(comoTexto(b[eje])),
    );
    if (eje === "mes") data = data.slice(-12);
  } else {
    data = filas.slice(0, 15).map((fila) => ({
      ...fila,
      [eje]: comoTexto(fila[eje]),
    }));
  }

  if (data.length === 0) return null;
  return { ...grafica, data };
}

function Visualizacion({
  config,
  altura = "h-64",
}: {
  config: ConfiguracionGrafica;
  altura?: string;
}) {
  const colores = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
  ];
  const comun = {
    margin: { top: 8, right: 8, left: 0, bottom: 0 },
  };
  const rejilla = (
    <CartesianGrid
      stroke="var(--chart-grid)"
      strokeDasharray="3 3"
      vertical={false}
    />
  );
  const ejes = (
    <>
      <XAxis
        dataKey={config.eje_x}
        stroke="var(--chart-axis)"
        tick={{ fontSize: 11 }}
        tickLine={false}
        axisLine={false}
        interval="preserveStartEnd"
      />
      <YAxis
        stroke="var(--chart-axis)"
        tick={{ fontSize: 11 }}
        tickLine={false}
        axisLine={false}
        width={72}
      />
    </>
  );
  const herramienta = (
    <Tooltip
      contentStyle={{
        background: "var(--surface-raised)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        color: "var(--fg)",
      }}
    />
  );

  return (
    <div className={cn("mt-3 w-full", altura)} aria-label={config.titulo}>
      <ResponsiveContainer width="100%" height="100%">
        {config.tipo === "linea" ? (
          <LineChart data={config.data} {...comun}>
            {rejilla}
            {ejes}
            {herramienta}
            <Legend wrapperStyle={{ color: "var(--muted)", fontSize: 11 }} />
            {config.series.map((serie: SerieGrafica, indice: number) => (
              <Line
                key={serie.clave}
                type="monotone"
                dataKey={serie.clave}
                name={serie.etiqueta}
                stroke={colores[indice % colores.length]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        ) : (
          <BarChart data={config.data} {...comun}>
            {rejilla}
            {ejes}
            {herramienta}
            <Legend wrapperStyle={{ color: "var(--muted)", fontSize: 11 }} />
            {config.series.map((serie: SerieGrafica, indice: number) => (
              <Bar
                key={serie.clave}
                dataKey={serie.clave}
                name={serie.etiqueta}
                fill={colores[indice % colores.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function Evidencia({ datos }: { datos: unknown }) {
  if (Array.isArray(datos)) {
    const filas = datos as Registro[];
    if (filas.length === 0) {
      return <p className="text-sm text-muted">Sin filas para mostrar.</p>;
    }
    const columnas = Object.keys(filas[0]).slice(0, 6);
    return (
      <div className="table-scroll">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border text-muted">
            <tr>
              {columnas.map((columna) => (
                <th key={columna} className="px-3 py-2 font-semibold">
                  {columna.replace(/_/g, " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filas.slice(0, 8).map((fila, indice) => (
              <tr key={indice}>
                {columnas.map((columna) => (
                  <td key={columna} className="px-3 py-2 text-fg">
                    {comoTexto(fila[columna])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (datos && typeof datos === "object") {
    return (
      <dl className="grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
        {Object.entries(datos as Record<string, unknown>)
          .slice(0, 12)
          .map(([clave, valor]) => (
            <div
              key={clave}
              className="flex justify-between gap-3 border-b border-border py-2"
            >
              <dt className="text-muted">{clave.replace(/_/g, " ")}</dt>
              <dd className="text-right font-medium tabular-nums text-fg">
                {comoTexto(valor)}
              </dd>
            </div>
          ))}
      </dl>
    );
  }

  return <p className="text-sm text-muted">Sin evidencia estructurada.</p>;
}

function EstadoCargando() {
  return (
    <div className="flex gap-3" aria-busy="true" aria-live="polite">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-contrast"
        aria-hidden="true"
      >
        <Bot size={16} />
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-border bg-surface px-4 py-3">
        <p className="text-xs font-medium text-muted">
          Consultando métricas y redactando…
        </p>
        <div className="mt-3 space-y-2" aria-hidden="true">
          <Skeleton className="h-3 w-56 max-w-full" />
          <Skeleton className="h-3 w-72 max-w-full" />
          <Skeleton className="h-3 w-44 max-w-full" />
        </div>
        <div className="mt-3 flex items-center gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((indice) => (
            <span
              key={indice}
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent motion-reduce:animate-none"
              style={{ animationDelay: `${indice * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function EstadoVacio({
  sugerencias,
  onElegir,
}: {
  sugerencias: Sugerencia[];
  onElegir: (pregunta: string) => void;
}) {
  return (
    <div className="my-auto flex w-full flex-col items-center py-4 text-center">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-contrast"
        aria-hidden="true"
      >
        <Sparkles size={20} />
      </div>
      <h2 className="mt-4 text-xl font-semibold tracking-[-0.02em] text-fg">
        ¿Qué quieres saber de SIMET?
      </h2>
      <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted">
        Escribe cualquier pregunta abierta sobre SIMET, pide una comparativa o
        formulas una consulta compleja en lenguaje natural. Estos atajos son
        opcionales.
      </p>
      <div className="mt-8 grid w-full max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sugerencias.slice(0, 6).map((sugerencia) => (
          <button
            key={sugerencia.intent}
            type="button"
            onClick={() => onElegir(sugerencia.pregunta)}
            className="group rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-accent hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
          >
            <span className="text-sm font-medium text-fg">
              {sugerencia.pregunta}
            </span>
            <span className="mt-2 block text-xs text-muted-2">
              {sugerencia.descripcion}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function TarjetaRespuesta({
  mensaje,
  copiado,
  esUltima,
  onCopiar,
  onReintentar,
  onRegenerar,
  onElegir,
}: {
  mensaje: Mensaje;
  copiado: boolean;
  esUltima: boolean;
  onCopiar: () => void;
  onReintentar: () => void;
  onRegenerar: () => void;
  onElegir: (pregunta: string) => void;
}) {
  const respuesta = mensaje.respuesta;
  const grafica = useMemo(
    () => construirGrafica(respuesta ?? null),
    [respuesta],
  );
  const usaFuenteLocal = respuesta?.modo !== "datos" && respuesta?.metodo !== "búsqueda documental";
  const sugerenciasSiguientes =
    respuesta?.modo === "datos"
      ? ["Explícame la fuente de estos datos", "Calcula el factor de carga del sistema"]
      : ["¿Qué puedo consultar en SIMET?", "¿Qué significa Tarifa DAC?"];

  return (
    <div className="flex gap-3">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-contrast"
        aria-hidden="true"
      >
        <Bot size={16} />
      </div>
      <article className="min-w-0 max-w-[85%] rounded-2xl rounded-tl-sm border border-border bg-surface px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {respuesta ? (
            <>
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent-strong">
                {respuesta.origen === "llm" ? "Redacción LLM" : "Verificación local"}
              </span>
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted">
                {respuesta.modo}
              </span>
              {respuesta.metodo ? (
                <span className="min-w-0 break-words text-[11px] text-muted">
                  {respuesta.metodo}
                </span>
              ) : null}
            </>
          ) : (
            <span className="rounded-full bg-danger-soft px-2 py-0.5 text-[10px] font-semibold text-danger-strong">
              Sin respuesta
            </span>
          )}
        </div>

        {mensaje.error ? (
          <div className="mt-3 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2">
            <p className="flex items-start gap-2 text-sm text-danger-strong">
              <CircleAlert size={14} className="mt-0.5 shrink-0" />
              <span>{mensaje.texto}</span>
            </p>
            <Button
              variant="ghost"
              size="xs"
              className="mt-2"
              onClick={onReintentar}
            >
              Reintentar
            </Button>
          </div>
        ) : (
          <div className="mt-3">
            <Markdown texto={mensaje.texto} />
          </div>
        )}

        {respuesta?.aviso ? (
          <p className="mt-3 break-words text-xs text-muted">{respuesta.aviso}</p>
        ) : null}

        {grafica ? (
          <div className="mt-4 rounded-xl border border-border bg-surface-2 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="min-w-0 break-words text-xs font-semibold text-fg">
                  {grafica.titulo}
                </h3>
                {grafica.subtitulo ? (
                  <p className="mt-1 break-words text-[10px] text-muted-2">
                    {grafica.subtitulo}
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 text-[10px] text-muted-2">
                Calculado en backend
              </span>
            </div>
            <Visualizacion config={grafica} altura="h-56 sm:h-64" />
          </div>
        ) : null}

        {respuesta ? (
          <div className="mt-4 space-y-2 border-t border-border pt-3">
            <details className="detalle-sin-marcador group rounded-lg border border-border bg-surface-2">
              <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs font-medium text-muted">
                <ChevronDown
                  size={13}
                  className="shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                  aria-hidden="true"
                />
                Fuentes verificadas
                <span className="ml-auto text-[10px] text-muted-2">
                  {respuesta.fuentes.length || (usaFuenteLocal ? 1 : 0)}
                </span>
              </summary>
              <div className="flex flex-wrap gap-1.5 border-t border-border px-3 py-2">
                {respuesta.fuentes.length ? (
                  respuesta.fuentes.map((fuente) => (
                    <span
                      key={fuente}
                      className="min-w-0 break-all rounded-full border border-border bg-surface px-2 py-0.5 font-mono text-[10px] text-muted"
                    >
                      {fuente}
                    </span>
                  ))
                ) : usaFuenteLocal ? (
                  <span className="text-[10px] text-muted-2">
                    Base de Conocimiento SIMET
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-2">
                    Sin fuentes verificadas en esta respuesta
                  </span>
                )}
              </div>
            </details>

            <details className="detalle-sin-marcador group rounded-lg border border-border bg-surface-2">
              <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs font-medium text-muted">
                <ChevronDown
                  size={13}
                  className="shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                  aria-hidden="true"
                />
                Fórmulas calculadas
                <span className="ml-auto text-[10px] text-muted-2">
                  {respuesta.formulas_aplicadas.length}
                </span>
              </summary>
              <div className="space-y-2 border-t border-border px-3 py-2">
                {respuesta.formulas_aplicadas.length ? (
                  respuesta.formulas_aplicadas.map((formula, indice) => (
                    <div
                      key={`${formula.nombre}-${indice}`}
                      className="min-w-0 rounded-md border border-border bg-surface px-2 py-2"
                    >
                      <p className="break-words text-xs font-medium text-fg">
                        {formula.nombre}
                      </p>
                      <p className="mt-1 break-all font-mono text-[10px] text-muted">
                        {formula.expresion}
                      </p>
                      <pre className="mt-1 max-h-28 overflow-auto whitespace-pre-wrap break-words text-[10px] text-muted">
                        {comoTexto(JSON.stringify(formula.resultado, null, 2))}
                      </pre>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-muted-2">
                    No se aplicaron fórmulas en esta consulta.
                  </p>
                )}
              </div>
            </details>

            {respuesta.datos !== undefined ? (
              <details className="detalle-sin-marcador group rounded-lg border border-border bg-surface-2">
                <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs font-medium text-muted">
                  <ChevronDown
                    size={13}
                    className="shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                  Datos consultados
                </summary>
                <div className="border-t border-border px-3 py-3">
                  <Evidencia datos={respuesta.datos} />
                </div>
              </details>
            ) : null}
          </div>
        ) : null}

        {esUltima && !mensaje.error && respuesta ? (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
            {sugerenciasSiguientes.map((pregunta) => (
              <button
                key={pregunta}
                type="button"
                onClick={() => onElegir(pregunta)}
                className="rounded-full border border-border bg-surface px-2 py-1 text-[10px] text-muted transition-colors hover:border-accent hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
              >
                {pregunta}
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-3 flex justify-end gap-1">
          {!mensaje.error && mensaje.pregunta ? (
            <Button
              variant="ghost"
              size="xs"
              onClick={onRegenerar}
              aria-label="Regenerar respuesta"
            >
              Regenerar
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="xs"
            onClick={onCopiar}
            disabled={!mensaje.texto}
            aria-label="Copiar respuesta"
          >
            {copiado ? <Check size={13} /> : <Copy size={13} />}
            {copiado ? "Copiado" : "Copiar"}
          </Button>
        </div>
      </article>
    </div>
  );
}

function construirHistorial(
  mensajes: Mensaje[],
  preguntaActual?: string,
): MensajeHistorial[] {
  const historial: MensajeHistorial[] = [];
  for (const mensaje of mensajes) {
    if (mensaje.rol === "usuario" && mensaje.texto) {
      historial.push({ rol: "usuario", contenido: mensaje.texto });
    }
    if (mensaje.rol === "asistente" && mensaje.respuesta?.respuesta) {
      historial.push({
        rol: "asistente",
        contenido: mensaje.respuesta.respuesta,
      });
    }
  }
  if (preguntaActual) {
    historial.push({ rol: "usuario", contenido: preguntaActual });
  }
  return historial.slice(-12);
}

export default function Asistente() {
  const [mensajes, setMensajes] = useState<Mensaje[]>(() => cargarHistorial());
  const [entrada, setEntrada] = useState("");
  const [cargando, setCargando] = useState(false);
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>(PREGUNTAS_BASE);
  const [estadoConexion, setEstadoConexion] =
    useState<EstadoConexion>("verificando");
  const [copiado, setCopiado] = useState<number | null>(null);

  const idRef = useRef(mensajes.reduce((maximo, mensaje) => Math.max(maximo, mensaje.id), 0));
  const sesionRef = useRef(0);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let activo = true;
    obtenerSugerencias()
      .then((lista) => {
        if (!activo) return;
        if (lista.length > 0) setSugerencias(lista);
        setEstadoConexion("en-linea");
      })
      .catch(() => {
        if (activo) setEstadoConexion("local");
      });
    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    area.style.height = "auto";
    area.style.height = `${Math.min(area.scrollHeight, 160)}px`;
  }, [entrada]);

  useEffect(() => {
    const fin = finRef.current;
    if (!fin) return;
    const sinMovimiento = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    fin.scrollIntoView({
      behavior: sinMovimiento ? "auto" : "smooth",
      block: "end",
    });
  }, [mensajes, cargando]);

  useEffect(() => {
    if (copiado === null) return;
    const temporizador = window.setTimeout(() => setCopiado(null), 1800);
    return () => window.clearTimeout(temporizador);
  }, [copiado]);

  useEffect(() => {
    guardarHistorial(mensajes);
  }, [mensajes]);

  const actualizar = (id: number, cambios: Partial<Mensaje>) => {
    setMensajes((previos) =>
      previos.map((mensaje) =>
        mensaje.id === id ? { ...mensaje, ...cambios } : mensaje,
      ),
    );
  };

  const responder = async (
    pregunta: string,
    idAsistente: number,
    sesion: number,
    historial: MensajeHistorial[],
  ) => {
    setCargando(true);
    try {
      const respuesta = await consultarAsistente(pregunta, historial);
      if (sesionRef.current === sesion) {
        actualizar(idAsistente, {
          texto: respuesta.respuesta,
          respuesta,
          error: undefined,
        });
      }
    } catch (error) {
      if (sesionRef.current === sesion) {
        actualizar(idAsistente, {
          texto: "No se pudo consultar al asistente.",
          error:
            error instanceof Error
              ? error.message
              : "Revisa la conexión con la API.",
        });
      }
    } finally {
      if (sesionRef.current === sesion) setCargando(false);
    }
  };

  const enviar = async (texto: string) => {
    const limpio = texto.trim();
    if (!limpio || limpio.length > 800 || cargando) return;

    const idUsuario = ++idRef.current;
    const idAsistente = ++idRef.current;
    const sesion = sesionRef.current;
    const historial = construirHistorial(mensajes, limpio);
    setMensajes((previos) => [
      ...previos,
      { id: idUsuario, rol: "usuario", texto: limpio },
      {
        id: idAsistente,
        rol: "asistente",
        texto: "",
        pregunta: limpio,
        historial,
      },
    ]);
    setEntrada("");
    areaRef.current?.focus();
    await responder(limpio, idAsistente, sesion, historial);
  };

  const reintentar = (mensaje: Mensaje) => {
    if (mensaje.rol !== "asistente" || !mensaje.pregunta || cargando) return;
    const historial =
      mensaje.historial ?? construirHistorial(mensajes, mensaje.pregunta);
    actualizar(mensaje.id, {
      texto: "",
      respuesta: undefined,
      error: undefined,
      historial,
    });
    void responder(mensaje.pregunta, mensaje.id, sesionRef.current, historial);
  };

  const limpiar = () => {
    sesionRef.current += 1;
    setMensajes([]);
    setEntrada("");
    setCargando(false);
    setCopiado(null);
    areaRef.current?.focus();
  };

  const copiar = async (mensaje: Mensaje) => {
    if (!mensaje.texto || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(mensaje.texto);
      setCopiado(mensaje.id);
    } catch {
      setCopiado(null);
    }
  };

  const copiarConversacion = async () => {
    const texto = mensajes
      .map(
        (mensaje) =>
          `${mensaje.rol === "usuario" ? "Tú" : "SIMET"}: ${mensaje.texto}`,
      )
      .filter((linea) => !linea.endsWith(": "))
      .join("\n\n");
    if (!texto || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(-1);
    } catch {
      setCopiado(null);
    }
  };

  const alEnviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    void enviar(entrada);
  };

  const alTeclear = (evento: KeyboardEvent<HTMLTextAreaElement>) => {
    if (evento.key === "Enter" && !evento.shiftKey) {
      evento.preventDefault();
      void enviar(entrada);
    }
  };

  const ultimoIdAsistente = [...mensajes]
    .reverse()
    .find((mensaje) => mensaje.rol === "asistente")?.id;
  const ultimaRespuesta = [...mensajes]
    .reverse()
    .find((mensaje) => mensaje.respuesta)?.respuesta;
  const detalleProveedor = ultimaRespuesta?.aviso
    ? " · modo local"
    : ultimaRespuesta?.origen === "llm"
      ? " · LLM"
      : ultimaRespuesta?.origen === "local"
        ? " · modo local"
        : "";
  const textoEstado =
    estadoConexion === "en-linea"
      ? `Agente en línea${detalleProveedor}`
      : estadoConexion === "local"
        ? "Atajos locales; requiere API"
        : "Conectando…";

  return (
    <div className="flex h-[calc(100dvh-11rem)] min-h-[520px] flex-col gap-4">
      <PageHeader
        title="Asistente"
        description="Agente analítico conversacional con grounding estricto. Puedes escribir preguntas abiertas; las cifras salen solo de fuentes verificadas de SIMET."
        className="shrink-0"
        meta={
          <span
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-1 text-xs text-muted"
            title={textoEstado}
          >
            {estadoConexion === "en-linea" ? (
              <Wifi size={13} className="text-success-fill" aria-hidden="true" />
            ) : estadoConexion === "local" ? (
              <WifiOff
                size={13}
                className="text-warning-fill"
                aria-hidden="true"
              />
            ) : (
              <span
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent motion-reduce:animate-none"
                aria-hidden="true"
              />
            )}
            {textoEstado}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void copiarConversacion()}
              disabled={mensajes.length === 0}
            >
              <Copy size={15} aria-hidden="true" />
              {copiado === -1 ? "Copiado" : "Copiar todo"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={limpiar}
              disabled={mensajes.length === 0 && !entrada}
            >
              <Eraser size={15} aria-hidden="true" />
              Nueva consulta
            </Button>
          </div>
        }
      />

      <section
        className="card flex min-h-0 flex-1 flex-col overflow-hidden"
        aria-label="Conversación con el asistente"
      >
        <div
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-6 sm:px-6"
          role="log"
          aria-live="polite"
          aria-relevant="additions text"
        >
          {mensajes.length === 0 ? (
            <EstadoVacio
              sugerencias={sugerencias}
              onElegir={(pregunta) => void enviar(pregunta)}
            />
          ) : (
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
              {mensajes.map((mensaje) => {
                if (mensaje.rol === "usuario") {
                  return (
                    <div key={mensaje.id} className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-br-sm border border-border bg-surface-3 px-4 py-3 text-sm leading-relaxed text-fg">
                        {mensaje.texto}
                      </div>
                    </div>
                  );
                }
                if (cargando && !mensaje.texto && !mensaje.error) {
                  return <EstadoCargando key={mensaje.id} />;
                }
                return (
                  <TarjetaRespuesta
                    key={mensaje.id}
                    mensaje={mensaje}
                    copiado={copiado === mensaje.id}
                    esUltima={mensaje.id === ultimoIdAsistente}
                    onCopiar={() => void copiar(mensaje)}
                    onReintentar={() => reintentar(mensaje)}
                    onRegenerar={() => reintentar(mensaje)}
                    onElegir={(pregunta) => void enviar(pregunta)}
                  />
                );
              })}
            </div>
          )}
          <div ref={finRef} className="h-px" aria-hidden="true" />
        </div>

        <form
          onSubmit={alEnviar}
          className="shrink-0 border-t border-border bg-surface-2 px-3 pb-3 pt-3 sm:px-4 sm:pb-4"
        >
          <div className="mx-auto flex max-w-5xl items-end gap-2 rounded-2xl border border-border bg-surface-raised p-2 focus-within:border-accent">
            <label htmlFor="pregunta-asistente" className="sr-only">
              Pregunta para el asistente
            </label>
            <textarea
              id="pregunta-asistente"
              ref={areaRef}
              rows={1}
              value={entrada}
              maxLength={800}
              onChange={(evento) => setEntrada(evento.target.value)}
              onKeyDown={alTeclear}
              placeholder="Pregunta abierta sobre SIMET, datos o fórmulas"
              className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-fg placeholder:text-muted focus-visible:outline-none"
            />
            <Button
              type="submit"
              variant="primary"
              size="icon"
              className="h-10 w-10 rounded-xl"
              disabled={cargando || !entrada.trim()}
              aria-label="Enviar pregunta"
            >
              <Send size={16} aria-hidden="true" />
            </Button>
          </div>
          <p className="mx-auto mt-2 max-w-5xl text-[10px] text-muted">
            Enter para enviar · Shift+Enter para salto de línea
          </p>
        </form>
      </section>
    </div>
  );
}
