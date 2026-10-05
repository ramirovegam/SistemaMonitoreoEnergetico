import { useEffect, useMemo, useRef, useState } from "react";
import {
  GeoJSON,
  MapContainer,
  TileLayer,
  useMap,
} from "react-leaflet";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { geoJSON as createLeafletGeoJSON } from "leaflet";
import type { GeoJSON as LeafletGeoJSON, Layer } from "leaflet";
import { MapPin, RefreshCw, Search, X } from "lucide-react";
import "leaflet/dist/leaflet.css";

interface PropiedadesZona {
  fid: number;
  Delegacion: number;
  NOMBRE_DEL: string;
  fuente?: string;
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

function AjustarMapa({ geojson }: { geojson: ZonasGeoJSON | null }) {
  const map = useMap();

  useEffect(() => {
    if (!geojson?.features.length) return;
    const temporal = createLeafletGeoJSON(geojson);
    const bounds = temporal.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [geojson, map]);

  return null;
}

export default function MapModule() {
  const [geojson, setGeojson] = useState<ZonasGeoJSON | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [seleccionada, setSeleccionada] = useState<ZonaFeature | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const layerRef = useRef<LeafletGeoJSON | null>(null);

  const cargarGeoJSON = async (): Promise<void> => {
    try {
      setCargando(true);
      setError(null);

      const response = await fetch("/data/zonas_toluca.geojson", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          `No se pudo cargar zonas_toluca.geojson: HTTP ${response.status}`,
        );
      }

      const data = (await response.json()) as ZonasGeoJSON;
      if (data.type !== "FeatureCollection" || !Array.isArray(data.features)) {
        throw new Error("El archivo no contiene una FeatureCollection válida.");
      }

      setGeojson(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los polígonos de Toluca.",
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    void cargarGeoJSON();
  }, []);

  const zonasVisibles = useMemo<ZonasGeoJSON | null>(() => {
    if (!geojson) return null;
    const termino = normalizarNombre(busqueda);
    if (!termino) return geojson;

    return {
      ...geojson,
      features: geojson.features.filter((feature) =>
        normalizarNombre(feature.properties.NOMBRE_DEL).includes(termino),
      ),
    };
  }, [geojson, busqueda]);

  const zonaSeleccionada = seleccionada?.properties;

  const estilo = (feature?: Feature<Geometry, PropiedadesZona>) => {
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
  };

  const enlazarZona = (feature: ZonaFeature, layer: Layer): void => {
    const props = feature.properties;
    const color = colorPorZona(props.fid);

    layer.bindTooltip(
      `<div style="min-width:190px;padding:4px">
        <div style="font-size:13px;font-weight:700;color:#1a1a2e">
          ${props.NOMBRE_DEL}
        </div>
        <div style="margin-top:4px;font-size:11px;font-weight:600;color:${color}">
          Delegación ${props.Delegacion}
        </div>
        <div style="margin-top:5px;font-size:10px;color:#9098b1">
          Polígono geográfico real
        </div>
      </div>`,
      { sticky: true },
    );

    layer.on({
      click: () => setSeleccionada(feature),
      mouseover: () => {
        const pathLayer = layer as Layer & {
          setStyle?: (options: Record<string, unknown>) => void;
          bringToFront?: () => void;
        };
        pathLayer.setStyle?.({ fillOpacity: 0.58, weight: 4 });
        pathLayer.bringToFront?.();
      },
      mouseout: () => {
        layerRef.current?.resetStyle(layer);
      },
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#1a1a2e]">
            🗺️ Mapa territorial de Toluca
          </h2>
          <p className="text-[11px] text-[#9098b1]">
            {geojson?.features.length ?? 0} polígonos geográficos reales cargados
          </p>
        </div>

        <button
          type="button"
          onClick={() => void cargarGeoJSON()}
          className="flex items-center gap-1.5 rounded-full bg-[#f2f3f7] px-3 py-1.5 text-xs font-semibold text-[#606881]"
        >
          <RefreshCw size={12} className={cargando ? "animate-spin" : ""} />
          Actualizar mapa
        </button>
      </div>

      {error && (
        <div className="rounded-2xl bg-[#fef2f2] p-4 text-xs text-[#b91c1c]">
          <p className="font-bold">No se pudo cargar el mapa real</p>
          <p className="mt-1">{error}</p>
          <p className="mt-2">
            Comprueba que exista public/data/zonas_toluca.geojson.
          </p>
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
                placeholder="Buscar delegación..."
                className="w-64 rounded-full border border-[#e5e7ef] bg-white py-2.5 pl-8 pr-4 text-xs font-medium text-[#1a1a2e] shadow-md outline-none focus:border-[#ff8a1f]"
              />
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
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <AjustarMapa geojson={zonasVisibles} />

            {zonasVisibles && (
              <GeoJSON
                key={`${busqueda}-${zonaSeleccionada?.fid ?? 0}`}
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
                  Polígono territorial real
                </p>
              </div>

              <div className="mt-3 flex justify-between border-b py-2 text-xs">
                <span className="text-[#9098b1]">FID</span>
                <strong>{zonaSeleccionada.fid}</strong>
              </div>
              <div className="flex justify-between border-b py-2 text-xs">
                <span className="text-[#9098b1]">Delegación</span>
                <strong>{zonaSeleccionada.Delegacion}</strong>
              </div>
              <div className="flex justify-between py-2 text-xs">
                <span className="text-[#9098b1]">Fuente</span>
                <strong className="max-w-[150px] truncate text-right">
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
              Delegaciones ({zonasVisibles?.features.length ?? 0})
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
                      className="h-3 w-3 flex-shrink-0 rounded-sm"
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
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
