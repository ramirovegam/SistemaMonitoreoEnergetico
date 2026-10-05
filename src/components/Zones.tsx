import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Home,
  MapPin,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";

import {
  obtenerZonas,
  type Zona,
} from "../services/zonasService";


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


const BACKGROUNDS = [
  "#fff4ea",
  "#eef2ff",
  "#ecfdf5",
  "#fffbeb",
  "#ecfeff",
  "#fdf2f8",
  "#f5f3ff",
  "#f0fdfa",
];


const fmt = (value: number | null | undefined) => {
  if (value === null || value === undefined) {
    return "Sin dato";
  }

  return value.toLocaleString("es-MX");
};


const formatTipoUrbano = (tipo: string) => {
  return tipo
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, letra => letra.toUpperCase());
};


export default function Zones() {
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  const cargarZonas = async () => {
    try {
      setLoading(true);
      setError(null);

      const datos = await obtenerZonas();

      setZonas(datos);

      setSelectedId(idActual => {
        if (
          idActual !== null &&
          datos.some(zona => zona.id_zona === idActual)
        ) {
          return idActual;
        }

        return datos.length > 0 ? datos[0].id_zona : null;
      });
    } catch (err) {
      const mensaje =
        err instanceof Error
          ? err.message
          : "Ocurrió un error al cargar las zonas";

      setError(mensaje);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    cargarZonas();
  }, []);


  const zona = useMemo(
    () => zonas.find(item => item.id_zona === selectedId) ?? null,
    [zonas, selectedId],
  );


  const selectedIndex = zonas.findIndex(
    item => item.id_zona === selectedId,
  );

  const color =
    COLORS[
      (selectedIndex >= 0 ? selectedIndex : 0) % COLORS.length
    ];

  const background =
    BACKGROUNDS[
      (selectedIndex >= 0 ? selectedIndex : 0) % BACKGROUNDS.length
    ];


  const densidadPoblacional =
    zona &&
    zona.poblacion_total !== null &&
    zona.superficie_km2 > 0
      ? zona.poblacion_total / zona.superficie_km2
      : null;


  const habitantesPorVivienda =
    zona &&
    zona.poblacion_total !== null &&
    zona.viviendas_habitadas !== null &&
    zona.viviendas_habitadas > 0
      ? zona.poblacion_total / zona.viviendas_habitadas
      : null;


  if (loading) {
    return (
      <div className="card p-8">
        <div className="flex items-center justify-center gap-3">
          <RefreshCw
            size={20}
            className="animate-spin text-[#ff8a1f]"
          />
          <p className="text-sm text-[#9098b1]">
            Cargando zonas desde PostgreSQL...
          </p>
        </div>
      </div>
    );
  }


  if (error) {
    return (
      <div className="card p-8">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#fef2f2] flex items-center justify-center">
            <AlertTriangle
              size={22}
              color="#ef4444"
            />
          </div>

          <div>
            <h2 className="font-bold text-[#1a1a2e]">
              No se pudieron cargar las zonas
            </h2>

            <p className="text-xs text-[#9098b1] mt-1 max-w-xl">
              {error}
            </p>
          </div>

          <button
            type="button"
            onClick={cargarZonas}
            className="px-4 py-2 rounded-xl bg-[#ff8a1f] text-white text-xs font-semibold"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }


  if (!zona) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-[#9098b1]">
          La tabla energia.zona no tiene registros.
        </p>
      </div>
    );
  }


  const indicadores = [
    {
      label: "Población total",
      value: fmt(zona.poblacion_total),
      detail: "Habitantes registrados",
      icon: Users,
      color: "#6366f1",
      background: "#eef2ff",
    },
    {
      label: "Viviendas habitadas",
      value: fmt(zona.viviendas_habitadas),
      detail: "Viviendas registradas",
      icon: Home,
      color: "#10b981",
      background: "#ecfdf5",
    },
    {
      label: "Superficie",
      value: `${zona.superficie_km2.toLocaleString(
        "es-MX",
        {
          minimumFractionDigits: 3,
          maximumFractionDigits: 3,
        },
      )} km²`,
      detail: "Extensión territorial",
      icon: MapPin,
      color,
      background,
    },
    {
      label: "Factor socioeconómico",
      value: zona.factor_socioeconomico.toLocaleString(
        "es-MX",
        {
          minimumFractionDigits: 3,
          maximumFractionDigits: 3,
        },
      ),
      detail: "Índice registrado",
      icon: TrendingUp,
      color: "#f59e0b",
      background: "#fffbeb",
    },
  ];


  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-[#1a1a2e]"
            style={{ fontFamily: "Nunito, sans-serif" }}
          >
            Módulo de Zonas
          </h1>

          <p className="text-sm text-[#9098b1] mt-0.5">
            Información territorial obtenida de PostgreSQL
          </p>
        </div>

        <div className="px-3 py-1.5 rounded-full bg-[#ecfdf5] text-[#059669] text-xs font-semibold">
          {zonas.length} zonas registradas
        </div>
      </div>


      <div className="card p-4">
        <label
          htmlFor="selector-zona"
          className="block text-xs font-semibold text-[#9098b1] mb-2"
        >
          Seleccionar zona
        </label>

        <select
          id="selector-zona"
          value={selectedId ?? ""}
          onChange={event =>
            setSelectedId(Number(event.target.value))
          }
          className="w-full px-4 py-3 rounded-xl border border-[#e8eaf2] bg-white text-sm font-semibold text-[#1a1a2e] outline-none focus:border-[#ff8a1f]"
        >
          {zonas.map(item => (
            <option
              key={item.id_zona}
              value={item.id_zona}
            >
              {item.nombre}
            </option>
          ))}
        </select>
      </div>


      <div
        className="card p-5"
        style={{ borderLeft: `4px solid ${color}` }}
      >
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background }}
          >
            <MapPin
              size={21}
              color={color}
            />
          </div>

          <div className="flex-1">
            <p className="text-xs text-[#9098b1]">
              Zona seleccionada
            </p>

            <h2
              className="text-xl font-bold text-[#1a1a2e]"
              style={{ fontFamily: "Nunito, sans-serif" }}
            >
              {zona.nombre}
            </h2>

            <div className="flex flex-wrap gap-2 mt-2">
              <span className="px-2.5 py-1 rounded-full bg-[#f8f9fc] text-[11px] font-semibold text-[#606881]">
                {formatTipoUrbano(zona.tipo_urbano)}
              </span>

              <span className="px-2.5 py-1 rounded-full bg-[#f8f9fc] text-[11px] font-semibold text-[#606881]">
                Rezago:{" "}
                {zona.grado_rezago_representativo ??
                  "Sin información"}
              </span>

              <span className="px-2.5 py-1 rounded-full bg-[#f8f9fc] text-[11px] font-semibold text-[#606881]">
                ID: {zona.id_zona}
              </span>
            </div>
          </div>
        </div>
      </div>


      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {indicadores.map(item => (
          <div
            key={item.label}
            className="card p-4"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
              style={{ background: item.background }}
            >
              <item.icon
                size={16}
                color={item.color}
              />
            </div>

            <p className="text-[11px] text-[#9098b1] font-medium">
              {item.label}
            </p>

            <p
              className="text-lg font-bold text-[#1a1a2e] mt-0.5"
              style={{ fontFamily: "Nunito, sans-serif" }}
            >
              {item.value}
            </p>

            <p className="text-[10px] text-[#b0b6c8] mt-1">
              {item.detail}
            </p>
          </div>
        ))}
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-[#1a1a2e]">
            Indicadores derivados
          </h3>

          <p className="text-[11px] text-[#9098b1] mt-1 mb-5">
            Cálculos realizados con la información de la zona
          </p>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-[#f8f9fc]">
              <div>
                <p className="text-xs font-semibold text-[#1a1a2e]">
                  Densidad poblacional
                </p>

                <p className="text-[10px] text-[#9098b1] mt-0.5">
                  Población / superficie
                </p>
              </div>

              <p className="text-sm font-bold text-[#6366f1]">
                {densidadPoblacional === null
                  ? "Sin dato"
                  : `${fmt(
                      Math.round(densidadPoblacional),
                    )} hab/km²`}
              </p>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-[#f8f9fc]">
              <div>
                <p className="text-xs font-semibold text-[#1a1a2e]">
                  Habitantes por vivienda
                </p>

                <p className="text-[10px] text-[#9098b1] mt-0.5">
                  Población / viviendas habitadas
                </p>
              </div>

              <p className="text-sm font-bold text-[#10b981]">
                {habitantesPorVivienda === null
                  ? "Sin dato"
                  : habitantesPorVivienda.toLocaleString(
                      "es-MX",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      },
                    )}
              </p>
            </div>
          </div>
        </div>


        <div className="card p-5">
          <h3 className="text-sm font-semibold text-[#1a1a2e]">
            Clasificación territorial
          </h3>

          <p className="text-[11px] text-[#9098b1] mt-1 mb-5">
            Datos descriptivos registrados en energia.zona
          </p>

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#f8f9fc]">
              <Building2
                size={18}
                color="#6366f1"
              />

              <div>
                <p className="text-[10px] text-[#9098b1]">
                  Tipo urbano
                </p>

                <p className="text-xs font-bold text-[#1a1a2e]">
                  {formatTipoUrbano(zona.tipo_urbano)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#f8f9fc]">
              <TrendingUp
                size={18}
                color="#f59e0b"
              />

              <div>
                <p className="text-[10px] text-[#9098b1]">
                  Grado de rezago representativo
                </p>

                <p className="text-xs font-bold text-[#1a1a2e]">
                  {zona.grado_rezago_representativo ??
                    "Sin información"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>


      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-[#1a1a2e]">
              Catálogo de zonas
            </h3>

            <p className="text-[11px] text-[#9098b1] mt-1">
              Selecciona una zona para consultar el detalle
            </p>
          </div>

          <button
            type="button"
            onClick={cargarZonas}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#f8f9fc] text-xs font-semibold text-[#606881] hover:bg-[#eef0f6]"
          >
            <RefreshCw size={13} />
            Actualizar
          </button>
        </div>

        <div className="max-h-[430px] overflow-y-auto flex flex-col gap-2">
          {zonas.map((item, index) => {
            const itemColor =
              COLORS[index % COLORS.length];

            const activo =
              item.id_zona === selectedId;

            return (
              <button
                type="button"
                key={item.id_zona}
                onClick={() =>
                  setSelectedId(item.id_zona)
                }
                className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all"
                style={{
                  background: activo
                    ? `${itemColor}12`
                    : "#f8f9fc",
                  boxShadow: activo
                    ? `inset 0 0 0 1px ${itemColor}`
                    : undefined,
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: activo
                      ? itemColor
                      : `${itemColor}18`,
                  }}
                >
                  <MapPin
                    size={15}
                    color={
                      activo ? "white" : itemColor
                    }
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[#1a1a2e] truncate">
                    {item.nombre}
                  </p>

                  <p className="text-[10px] text-[#9098b1] mt-0.5">
                    {formatTipoUrbano(
                      item.tipo_urbano,
                    )}
                  </p>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-[#1a1a2e]">
                    {fmt(item.poblacion_total)}
                  </p>

                  <p className="text-[9px] text-[#9098b1]">
                    habitantes
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}