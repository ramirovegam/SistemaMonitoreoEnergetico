import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { geoJSON as createLeafletGeoJSON } from "leaflet";
import type {
  GeoJSON as LeafletGeoJSON,
  Layer,
  PathOptions,
} from "leaflet";
import { AlertTriangle, MapPin, RefreshCw, Search, X } from "lucide-react";
import "leaflet/dist/leaflet.css";

interface PropiedadesZona {
  fid: number;
  Delegacion: number;
  NOMBRE_DEL: string;
  fuente?: string;
  verificado?: boolean;
  precision?: string;
  radio_km?: number;
}

type ZonaFeature = Feature<Geometry, PropiedadesZona>;
type ZonasGeoJSON = FeatureCollection<Geometry, PropiedadesZona>;

const CENTER: [number, number] = [19.2926, -99.6562];

const COLORS = [
  "#ff8a1f",
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#06b6d4",
  "#ec4899",
  "#8b5cf6",
  "#14b8a6",
];

const ZONAS_ESPERADAS = [
  "Toluca de Lerdo",
  "San Pablo Autopan",
  "San Cristóbal Huichochitlán",
  "San Lorenzo Tepaltitlán",
  "Santa Ana Tlapaltitlán",
  "Crespa Floresta",
  "Santa María Totoltepec",
  "Sauces",
  "San Buenaventura",
  "San Mateo Otzacatipan",
  "San Mateo Oxtotitlán",
  "San Pedro Totoltepec",
  "Capultitlán",
  "Santiago Tlacotepec",
  "San Andrés Cuexcontitlán",
  "Santa Cruz Atzcapotzaltongo",
  "Cacalomacán",
  "Santiago Miltepec",
  "San Diego de los Padres Cuexcontitlán",
  "San Felipe Tlalmimilolpan",
  "Calixtlahuaca",
  "San Juan Tilapa",
  "La Constitución Toltepec",
  "El Cerrillo Vista Hermosa",
  "San Nicolás Tolentino",
  "San José Guadalupe Otzacatipan",
  "San Miguel Totoltepec",
  "Ejido de la Y Sección Siete A Revolución",
  "Tlachaloya Segunda Sección",
  "Jicaltepec Autopan",
  "San Marcos Yachihuacaltepec",
  "Santiago Tlaxomulco",
  "San Antonio Buenavista",
  "Jicaltepec Cuexcontitlán",
  "Las Misiones [Conjunto Urbano]",
  "Arroyo Vista Hermosa",
  "Paseos San Martín [Conjunto Urbano]",
  "Tlachaloya",
  "Hacienda Santín (Rancho Santín)",
  "Fraccionamiento Real de San Pablo",
  "San Cayetano Morelos",
  "Santa Cruz Otzacatipan",
  "Fraccionamiento San Diego",
  "San Francisco Totoltepec",
  "Galaxias Toluca",
  "La Magdalena Otzacatipan",
] as const;

function colorPorZona(fid: number): string {
  return COLORS[Math.abs(fid - 1) % COLORS.length];
}

function normalizarNombre(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function esZonaFeature(value: unknown): value is ZonaFeature {
  if (!value || typeof value !== "object") return false;

  const feature = value as Partial<ZonaFeature>;
  const props = feature.properties as Partial<PropiedadesZona> | null | undefined;

  return (
    feature.type === "Feature" &&
    feature.geometry != null &&
    props != null &&
    typeof props.fid === "number" &&
    typeof props.Delegacion === "number" &&
    typeof props.NOMBRE_DEL === "string"
  );
}

function AjustarMapa({ geojson }: { geojson: ZonasGeoJSON | null }) {
  const map = useMap();

  useEffect(() => {
    if (!geojson?.features.length) return;

    const temporal = createLeafletGeoJSON(geojson);
    const bounds = temporal.getBounds();

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [30, 30],
        maxZoom: 13,
      });
    }
  }, [geojson, map]);

  return null;
}

function EnfocarZona({ zona }: { zona: ZonaFeature | null }) {
  const map = useMap();

  useEffect(() => {
    if (!zona) return;

    const temporal = createLeafletGeoJSON(zona);
    const bounds = temporal.getBounds();

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 15,
      });
    }
  }, [zona, map]);

  return null;
}

export default function MapModule() {
  const [geojson, setGeojson] = useState<ZonasGeoJSON | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [seleccionada, setSeleccionada] = useState<ZonaFeature | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zonasFaltantes, setZonasFaltantes] = useState<string[]>([]);
  const layerRef = useRef<LeafletGeoJSON | null>(null);

  const cargarGeoJSON = useCallback(async (): Promise<void> => {
    try {
      setCargando(true);
      setError(null);
      setZonasFaltantes([]);

      const response = await fetch("/data/zonas_toluca.geojson", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          `No se pudo cargar zonas_toluca.geojson: HTTP ${response.status}`,
        );
      }

      const contenido: unknown = await response.json();

      if (!contenido || typeof contenido !== "object") {
        throw new Error("El contenido del archivo GeoJSON no es válido.");
      }

      const data = contenido as Partial<ZonasGeoJSON>;

      if (data.type !== "FeatureCollection" || !Array.isArray(data.features)) {
        throw new Error("El archivo no contiene una FeatureCollection válida.");
      }

      const featuresValidas = data.features.filter(esZonaFeature);

      if (featuresValidas.length !== data.features.length) {
        console.warn(
          `${data.features.length - featuresValidas.length} elementos fueron descartados por no tener geometría o propiedades válidas.`,
        );
      }

      const nombresPermitidos = new Set(
        ZONAS_ESPERADAS.map((nombre) => normalizarNombre(nombre)),
      );

      const featuresFiltradas = featuresValidas.filter((feature) =>
        nombresPermitidos.has(
          normalizarNombre(feature.properties.NOMBRE_DEL),
        ),
      );

      const nombresCargados = new Set(
        featuresFiltradas.map((feature) =>
          normalizarNombre(feature.properties.NOMBRE_DEL),
        ),
      );

      const faltantes = ZONAS_ESPERADAS.filter(
        (nombre) => !nombresCargados.has(normalizarNombre(nombre)),
      );

      setZonasFaltantes([...faltantes]);
      setSeleccionada(null);
      setGeojson({
        type: "FeatureCollection",
        features: featuresFiltradas,
      });
    } catch (err) {
      setGeojson(null);
      setSeleccionada(null);
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los polígonos de Toluca.",
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarGeoJSON();
  }, [cargarGeoJSON]);

  const zonasVisibles = useMemo<ZonasGeoJSON | null>(() => {
    if (!geojson) return null;

    const termino = normalizarNombre(busqueda);
    if (!termino) return geojson;

    return {
      type: "FeatureCollection",
      features: geojson.features.filter((feature) =>
        normalizarNombre(feature.properties.NOMBRE_DEL).includes(termino),
      ),
    };
  }, [geojson, busqueda]);

  const claveGeoJSON = useMemo(() => {
    if (!zonasVisibles) return "sin-zonas";

    return zonasVisibles.features
      .map((feature) => feature.properties.fid)
      .join("-");
  }, [zonasVisibles]);

  const zonaSeleccionada = seleccionada?.properties;

  const estilo = useCallback(
    (feature?: Feature<Geometry, PropiedadesZona>): PathOptions => {
      const fid = feature?.properties?.fid ?? 1;
      const activa = zonaSeleccionada?.fid === fid;
      const color = colorPorZona(fid);

      return {
        color,
        fillColor: color,
        fillOpacity: activa ? 0.62 : 0.3,
        weight: activa ? 4 : 2,
        opacity: 0.95,
      };
    },
    [zonaSeleccionada?.fid],
  );

  const enlazarZona = useCallback(
    (feature: ZonaFeature, layer: Layer): void => {
      const props = feature.properties;
      const color = colorPorZona(props.fid);
      const precision = props.verificado
        ? "Polígono territorial verificado"
        : "Área geográfica aproximada";

      layer.bindTooltip(
        `<div style="min-width:190px;padding:4px">
          <div style="font-size:13px;font-weight:700;color:#1a1a2e">
            ${props.NOMBRE_DEL}
          </div>
          <div style="margin-top:4px;font-size:11px;font-weight:600;color:${color}">
            Zona ${props.Delegacion}
          </div>
          <div style="margin-top:5px;font-size:10px;color:#9098b1">
            ${precision}
          </div>
        </div>`,
        { sticky: true },
      );

      layer.on({
        click: () => setSeleccionada(feature),
        mouseover: () => {
          const pathLayer = layer as Layer & {
            setStyle?: (options: PathOptions) => void;
            bringToFront?: () => void;
          };

          pathLayer.setStyle?.({ fillOpacity: 0.58, weight: 4 });
          pathLayer.bringToFront?.();
        },
        mouseout: () => {
          layerRef.current?.resetStyle(layer);
        },
      });
    },
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#1a1a2e]">
            🗺️ Mapa territorial de Toluca
          </h2>
          <p className="text-[11px] text-[#9098b1]">
            {geojson?.features.length ?? 0} de {ZONAS_ESPERADAS.length} zonas cargadas
          </p>
        </div>

        <button
          type="button"
          onClick={() => void cargarGeoJSON()}
          disabled={cargando}
          className="flex items-center gap-1.5 rounded-full bg-[#f2f3f7] px-3 py-1.5 text-xs font-semibold text-[#606881] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={12} className={cargando ? "animate-spin" : ""} />
          {cargando ? "Cargando..." : "Actualizar mapa"}
        </button>
      </div>

      {error && (
        <div className="rounded-2xl bg-[#fef2f2] p-4 text-xs text-[#b91c1c]">
          <p className="font-bold">No se pudo cargar el mapa</p>
          <p className="mt-1">{error}</p>
          <p className="mt-2">
            Comprueba que exista public/data/zonas_toluca.geojson.
          </p>
        </div>
      )}

      {!error && zonasFaltantes.length > 0 && (
        <div className="flex gap-3 rounded-2xl bg-[#fffbeb] p-4 text-xs text-[#92400e]">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-bold">
              Faltan {zonasFaltantes.length} zonas en el GeoJSON
            </p>
            <p className="mt-1">{zonasFaltantes.join(", ")}</p>
          </div>
        </div>
      )}

      <div className="flex min-h-[600px] flex-col gap-4 xl:flex-row">
        <div className="card relative h-[600px] min-w-0 flex-1 overflow-hidden">
          <div className="absolute left-3 top-3 z-[1000]">
            <div className="relative">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9098b1]"
              />
              <input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Buscar zona..."
                className="w-64 rounded-full border border-[#e5e7ef] bg-white py-2.5 pl-8 pr-9 text-xs font-medium text-[#1a1a2e] shadow-md outline-none focus:border-[#ff8a1f]"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda("")}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9098b1] hover:text-[#1a1a2e]"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          <div className="absolute bottom-4 left-4 z-[1000] rounded-2xl border border-[#f0f1f7] bg-white/95 p-3 shadow-lg backdrop-blur-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9098b1]">
              Vista actual
            </p>
            <p className="mt-1 text-lg font-bold text-[#1a1a2e]">
              {zonasVisibles?.features.length ?? 0}
            </p>
            <p className="text-[10px] text-[#9098b1]">polígonos visibles</p>
          </div>

          <MapContainer
            center={CENTER}
            zoom={11}
            zoomControl
            style={{ height: "100%", width: "100%" }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <AjustarMapa geojson={zonasVisibles} />
            <EnfocarZona zona={seleccionada} />

            {zonasVisibles && zonasVisibles.features.length > 0 && (
              <GeoJSON
                key={`${claveGeoJSON}-${zonaSeleccionada?.fid ?? 0}`}
                ref={layerRef}
                data={zonasVisibles}
                style={estilo}
                onEachFeature={(feature, layer) =>
                  enlazarZona(feature as ZonaFeature, layer)
                }
              />
            )}
          </MapContainer>
        </div>

        <aside className="flex w-full flex-col gap-3 xl:w-72">
          {zonaSeleccionada ? (
            <div
              className="card p-4"
              style={{
                border: `2px solid ${colorPorZona(zonaSeleccionada.fid)}`,
              }}
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-bold text-[#1a1a2e]">
                  Zona seleccionada
                </p>
                <button
                  type="button"
                  onClick={() => setSeleccionada(null)}
                  aria-label="Cerrar zona seleccionada"
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f2f3f7]"
                >
                  <X size={11} />
                </button>
              </div>

              <div
                className="rounded-2xl p-3"
                style={{
                  background: `${colorPorZona(zonaSeleccionada.fid)}18`,
                }}
              >
                <p
                  className="text-sm font-bold"
                  style={{ color: colorPorZona(zonaSeleccionada.fid) }}
                >
                  {zonaSeleccionada.NOMBRE_DEL}
                </p>
                <p className="mt-1 text-[10px] text-[#9098b1]">
                  {zonaSeleccionada.verificado
                    ? "Polígono territorial verificado"
                    : "Área geográfica aproximada"}
                </p>
              </div>

              <div className="mt-3 flex justify-between border-b py-2 text-xs">
                <span className="text-[#9098b1]">FID</span>
                <strong>{zonaSeleccionada.fid}</strong>
              </div>
              <div className="flex justify-between border-b py-2 text-xs">
                <span className="text-[#9098b1]">Zona</span>
                <strong>{zonaSeleccionada.Delegacion}</strong>
              </div>
              <div className="flex justify-between border-b py-2 text-xs">
                <span className="text-[#9098b1]">Precisión</span>
                <strong>{zonaSeleccionada.precision ?? "Sin especificar"}</strong>
              </div>
              <div className="flex items-start justify-between gap-3 py-2 text-xs">
                <span className="shrink-0 text-[#9098b1]">Fuente</span>
                <strong className="text-right">
                  {zonaSeleccionada.fuente ?? "GeoJSON Toluca"}
                </strong>
              </div>
            </div>
          ) : (
            <div className="card p-5 text-center">
              <MapPin size={28} className="mx-auto text-[#ff8a1f]" />
              <p className="mt-2 text-xs font-semibold text-[#1a1a2e]">
                Selecciona una zona
              </p>
              <p className="mt-1 text-[10px] text-[#9098b1]">
                Haz clic sobre un polígono para consultar sus datos.
              </p>
            </div>
          )}

          <div className="card p-4">
            <p className="mb-3 text-xs font-bold text-[#1a1a2e]">
              Zonas ({zonasVisibles?.features.length ?? 0})
            </p>

            <div className="flex max-h-[470px] flex-col gap-1 overflow-y-auto pr-1">
              {zonasVisibles?.features.map((feature) => {
                const props = feature.properties;
                const activa = props.fid === zonaSeleccionada?.fid;

                return (
                  <button
                    type="button"
                    key={props.fid}
                    onClick={() => setSeleccionada(feature)}
                    className={`flex items-center gap-2 rounded-xl p-2 text-left transition-colors ${
                      activa ? "bg-[#fff4ea]" : "hover:bg-[#f8f9fc]"
                    }`}
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-sm"
                      style={{ background: colorPorZona(props.fid) }}
                    />
                    <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-[#1a1a2e]">
                      {props.NOMBRE_DEL}
                    </span>
                    <span className="text-[9px] text-[#9098b1]">
                      {props.Delegacion}
                    </span>
                  </button>
                );
              })}

              {!cargando && zonasVisibles?.features.length === 0 && (
                <p className="py-6 text-center text-[10px] text-[#9098b1]">
                  No se encontraron zonas con esa búsqueda.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
