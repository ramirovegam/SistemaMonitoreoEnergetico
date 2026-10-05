import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Building2,
  ChevronRight,
  CircleDollarSign,
  Gauge,
  Leaf,
  MapPin,
  RefreshCw,
  Search,
  Sun,
  Users,
  X,
  Zap,
} from "lucide-react";

import {
  obtenerServicios,
  type Servicio,
} from "../services/serviciosService";


const PAGE_SIZE = 12;


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


const fmt = (
  value: number | null | undefined,
) => {
  if (value === null || value === undefined) {
    return "Sin dato";
  }

  return value.toLocaleString("es-MX");
};


const formatText = (value: string): string => {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (character: string) => character.toUpperCase(),
    );
};


const getTypeIcon = (category: string) => {
  const normalized = category.toUpperCase();

  if (normalized.includes("RESIDENCIAL")) {
    return "🏠";
  }

  if (normalized.includes("COMERCIAL")) {
    return "🏪";
  }

  if (normalized.includes("INDUSTRIAL")) {
    return "🏭";
  }

  if (normalized.includes("PUBLICO")) {
    return "🏛️";
  }

  return "🏢";
};


interface ServicioDetailProps {
  servicio: Servicio;
  onClose: () => void;
}


function ServicioDetail({
  servicio,
  onClose,
}: ServicioDetailProps) {
  const color =
    COLORS[
      servicio.id_zona % COLORS.length
    ];

  const background =
    BACKGROUNDS[
      servicio.id_zona % BACKGROUNDS.length
    ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1a2e]/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between p-6 border-b border-[#f0f1f7]">
          <div className="flex items-center gap-3">

            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
              style={{ background }}
            >
              {getTypeIcon(
                servicio.tipo_servicio_categoria,
              )}
            </div>

            <div>
              <h2
                className="text-lg font-bold text-[#1a1a2e]"
                style={{
                  fontFamily:
                    "Nunito, sans-serif",
                }}
              >
                {servicio.nombre}
              </h2>

              <p className="text-xs text-[#9098b1] font-medium">
                Servicio #{servicio.id_servicio}
                {" · "}
                RPU {servicio.rpu}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#f2f3f7] flex items-center justify-center hover:bg-[#e5e7ef] transition-colors"
          >
            <X
              size={14}
              className="text-[#9098b1]"
            />
          </button>
        </div>


        <div className="p-6 flex flex-col gap-5">

          <div>
            <h3 className="text-sm font-semibold text-[#1a1a2e] mb-3">
              Información del servicio
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              {[
                {
                  label: "Zona",
                  value: servicio.zona_nombre,
                  color,
                  background,
                },
                {
                  label: "Tipo de servicio",
                  value:
                    servicio.tipo_servicio_nombre,
                  color: "#6366f1",
                  background: "#eef2ff",
                },
                {
                  label: "Categoría",
                  value: formatText(
                    servicio.tipo_servicio_categoria,
                  ),
                  color: "#10b981",
                  background: "#ecfdf5",
                },
                {
                  label: "Ocupación estimada",
                  value:
                    servicio.ocupacion_estimada ===
                    null
                      ? "Sin información"
                      : `${fmt(
                          servicio.ocupacion_estimada,
                        )} personas`,
                  color: "#606881",
                  background: "#f8f9fc",
                },
                {
                  label: "Carga contratada",
                  value:
                    `${servicio.carga_contratada_kw.toLocaleString(
                      "es-MX",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      },
                    )} kW`,
                  color: "#ff8a1f",
                  background: "#fff4ea",
                },
                {
                  label: "Sistema solar",
                  value: servicio.tiene_solar
                    ? "Sí"
                    : "No",
                  color: servicio.tiene_solar
                    ? "#059669"
                    : "#9098b1",
                  background: servicio.tiene_solar
                    ? "#ecfdf5"
                    : "#f8f9fc",
                },
                {
                  label: "ID de tarifa",
                  value: `Tarifa #${servicio.id_tarifa}`,
                  color: "#f59e0b",
                  background: "#fffbeb",
                },
                {
                  label: "Clave del tipo",
                  value:
                    servicio.tipo_servicio_clave,
                  color: "#8b5cf6",
                  background: "#f5f3ff",
                },
              ].map(item => (
                <div
                  key={item.label}
                  className="rounded-2xl p-3"
                  style={{
                    background: item.background,
                  }}
                >
                  <p className="text-[11px] text-[#9098b1] font-medium mb-1">
                    {item.label}
                  </p>

                  <p
                    className="text-sm font-bold"
                    style={{
                      color: item.color,
                    }}
                  >
                    {item.value}
                  </p>
                </div>
              ))}

            </div>
          </div>


          <div>
            <h3 className="text-sm font-semibold text-[#1a1a2e] mb-3">
              Parámetros del tipo de servicio
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

              <div className="rounded-2xl bg-[#fff4ea] p-4 text-center">
                <Zap
                  size={18}
                  color="#ff8a1f"
                  className="mx-auto mb-2"
                />

                <p className="text-base font-bold text-[#ff8a1f]">
                  {servicio.consumo_base_kwh_h.toLocaleString(
                    "es-MX",
                    {
                      minimumFractionDigits: 3,
                      maximumFractionDigits: 3,
                    },
                  )}
                </p>

                <p className="text-[10px] text-[#9098b1] mt-1">
                  Consumo base kWh/h
                </p>
              </div>


              <div className="rounded-2xl bg-[#eef2ff] p-4 text-center">
                <Gauge
                  size={18}
                  color="#6366f1"
                  className="mx-auto mb-2"
                />

                <p className="text-base font-bold text-[#6366f1]">
                  {servicio.factor_dispersion.toLocaleString(
                    "es-MX",
                    {
                      minimumFractionDigits: 3,
                      maximumFractionDigits: 3,
                    },
                  )}
                </p>

                <p className="text-[10px] text-[#9098b1] mt-1">
                  Factor de dispersión
                </p>
              </div>


              <div className="rounded-2xl bg-[#ecfdf5] p-4 text-center">
                <Leaf
                  size={18}
                  color="#10b981"
                  className="mx-auto mb-2"
                />

                <p className="text-base font-bold text-[#10b981]">
                  {servicio.sensibilidad_temp.toLocaleString(
                    "es-MX",
                    {
                      minimumFractionDigits: 3,
                      maximumFractionDigits: 3,
                    },
                  )}
                </p>

                <p className="text-[10px] text-[#9098b1] mt-1">
                  Sensibilidad térmica
                </p>
              </div>

            </div>
          </div>


          <div>
            <h3 className="text-sm font-semibold text-[#1a1a2e] mb-3">
              Ubicación geográfica
            </h3>

            <div className="rounded-2xl bg-[#f8f9fc] p-4">
              <div className="flex items-center gap-3">
                <MapPin
                  size={20}
                  color={color}
                />

                <div>
                  <p className="text-xs font-bold text-[#1a1a2e]">
                    {servicio.zona_nombre}
                  </p>

                  <p className="text-[11px] text-[#9098b1] mt-1">
                    Latitud:{" "}
                    {servicio.latitud.toFixed(6)}
                    {" · "}
                    Longitud:{" "}
                    {servicio.longitud.toFixed(6)}
                  </p>
                </div>
              </div>
            </div>
          </div>


          <div className="rounded-2xl border border-[#f0f1f7] p-4">
            <p className="text-xs font-semibold text-[#1a1a2e]">
              Nota sobre el consumo
            </p>

            <p className="text-[11px] text-[#9098b1] mt-1 leading-relaxed">
              El consumo base pertenece al tipo de
              servicio y representa un parámetro de
              referencia. No corresponde a una
              lectura real del servicio. El historial
              de consumo podrá mostrarse cuando se
              conecte la tabla de mediciones o
              lecturas energéticas.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}


export default function Households() {
  const [servicios, setServicios] =
    useState<Servicio[]>([]);

  const [search, setSearch] =
    useState("");

  const [filterZone, setFilterZone] =
    useState("Todas");

  const [filterType, setFilterType] =
    useState("Todos");

  const [filterSolar, setFilterSolar] =
    useState("Todos");

  const [selected, setSelected] =
    useState<Servicio | null>(null);

  const [page, setPage] =
    useState(1);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);


  const cargarServicios = async () => {
    try {
      setLoading(true);
      setError(null);

      const datos =
        await obtenerServicios();

      setServicios(datos);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Error al cargar los servicios";

      setError(message);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    cargarServicios();
  }, []);


  const zonas = useMemo(() => {
    return [
      ...new Set(
        servicios.map(
          servicio =>
            servicio.zona_nombre,
        ),
      ),
    ].sort((a, b) =>
      a.localeCompare(b, "es"),
    );
  }, [servicios]);


  const tipos = useMemo(() => {
    return [
      ...new Set(
        servicios.map(
          servicio =>
            servicio.tipo_servicio_nombre,
        ),
      ),
    ].sort((a, b) =>
      a.localeCompare(b, "es"),
    );
  }, [servicios]);


  const filtered = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return servicios.filter(servicio => {
      const matchSearch =
        query.length === 0 ||
        servicio.nombre
          .toLowerCase()
          .includes(query) ||
        servicio.rpu
          .toLowerCase()
          .includes(query) ||
        String(servicio.id_servicio)
          .includes(query) ||
        servicio.zona_nombre
          .toLowerCase()
          .includes(query) ||
        servicio.tipo_servicio_nombre
          .toLowerCase()
          .includes(query);

      const matchZone =
        filterZone === "Todas" ||
        servicio.zona_nombre === filterZone;

      const matchType =
        filterType === "Todos" ||
        servicio.tipo_servicio_nombre ===
          filterType;

      const matchSolar =
        filterSolar === "Todos" ||
        (filterSolar === "Con solar" &&
          servicio.tiene_solar) ||
        (filterSolar === "Sin solar" &&
          !servicio.tiene_solar);

      return (
        matchSearch &&
        matchZone &&
        matchType &&
        matchSolar
      );
    });
  }, [
    servicios,
    search,
    filterZone,
    filterType,
    filterSolar,
  ]);


  const pages = Math.max(
    1,
    Math.ceil(
      filtered.length / PAGE_SIZE,
    ),
  );


  const currentPage =
    Math.min(page, pages);


  const paged = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );


  const totalSolar =
    servicios.filter(
      servicio =>
        servicio.tiene_solar,
    ).length;


  if (loading) {
    return (
      <div className="card p-8">
        <div className="flex items-center justify-center gap-3">
          <RefreshCw
            size={20}
            className="animate-spin text-[#ff8a1f]"
          />

          <p className="text-sm text-[#9098b1]">
            Cargando servicios desde PostgreSQL...
          </p>
        </div>
      </div>
    );
  }


  if (error) {
    return (
      <div className="card p-8">
        <div className="text-center">
          <h2 className="font-bold text-[#1a1a2e]">
            No se pudieron cargar los servicios
          </h2>

          <p className="text-xs text-[#9098b1] mt-2">
            {error}
          </p>

          <button
            type="button"
            onClick={cargarServicios}
            className="mt-4 px-4 py-2 rounded-xl bg-[#ff8a1f] text-white text-xs font-semibold"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="flex flex-col gap-6">

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-[#1a1a2e]"
            style={{
              fontFamily:
                "Nunito, sans-serif",
            }}
          >
            Módulo de Servicios
          </h1>

          <p className="text-sm text-[#9098b1] mt-0.5">
            Servicios registrados en PostgreSQL
          </p>
        </div>

        <button
          type="button"
          onClick={cargarServicios}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-[#e5e7ef] text-xs font-semibold text-[#606881]"
        >
          <RefreshCw size={13} />
          Actualizar
        </button>
      </div>


      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">

        {[
          {
            label: "Servicios registrados",
            value: fmt(servicios.length),
            icon: Building2,
            color: "#6366f1",
            background: "#eef2ff",
          },
          {
            label: "Zonas con servicios",
            value: fmt(zonas.length),
            icon: MapPin,
            color: "#ff8a1f",
            background: "#fff4ea",
          },
          {
            label: "Tipos de servicio",
            value: fmt(tipos.length),
            icon: CircleDollarSign,
            color: "#f59e0b",
            background: "#fffbeb",
          },
          {
            label: "Servicios con solar",
            value: fmt(totalSolar),
            icon: Sun,
            color: "#10b981",
            background: "#ecfdf5",
          },
        ].map(item => (
          <div
            key={item.label}
            className="card p-4"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
              style={{
                background:
                  item.background,
              }}
            >
              <item.icon
                size={16}
                color={item.color}
              />
            </div>

            <p className="text-[11px] text-[#9098b1] font-medium">
              {item.label}
            </p>

            <p className="text-lg font-bold text-[#1a1a2e] mt-0.5">
              {item.value}
            </p>
          </div>
        ))}

      </div>


      <div className="flex flex-wrap gap-3 items-center">

        <div className="flex-1 min-w-52 relative">
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9098b1]"
          />

          <input
            value={search}
            onChange={event => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Buscar por ID, RPU, nombre, zona o tipo..."
            className="w-full bg-white border border-[#e5e7ef] rounded-2xl pl-10 pr-4 py-2.5 text-sm text-[#1a1a2e] placeholder-[#9098b1] focus:outline-none focus:border-[#ff8a1f]"
          />
        </div>


        <select
          value={filterZone}
          onChange={event => {
            setFilterZone(
              event.target.value,
            );
            setPage(1);
          }}
          className="bg-white border border-[#e5e7ef] rounded-2xl px-4 py-2.5 text-sm text-[#1a1a2e] focus:outline-none focus:border-[#ff8a1f]"
        >
          <option value="Todas">
            Todas las zonas
          </option>

          {zonas.map(zona => (
            <option
              key={zona}
              value={zona}
            >
              {zona}
            </option>
          ))}
        </select>


        <select
          value={filterType}
          onChange={event => {
            setFilterType(
              event.target.value,
            );
            setPage(1);
          }}
          className="bg-white border border-[#e5e7ef] rounded-2xl px-4 py-2.5 text-sm text-[#1a1a2e] focus:outline-none focus:border-[#ff8a1f]"
        >
          <option value="Todos">
            Todos los tipos
          </option>

          {tipos.map(tipo => (
            <option
              key={tipo}
              value={tipo}
            >
              {tipo}
            </option>
          ))}
        </select>


        <select
          value={filterSolar}
          onChange={event => {
            setFilterSolar(
              event.target.value,
            );
            setPage(1);
          }}
          className="bg-white border border-[#e5e7ef] rounded-2xl px-4 py-2.5 text-sm text-[#1a1a2e] focus:outline-none focus:border-[#ff8a1f]"
        >
          <option value="Todos">
            Todos
          </option>

          <option value="Con solar">
            Con solar
          </option>

          <option value="Sin solar">
            Sin solar
          </option>
        </select>


        <span className="text-xs text-[#9098b1] font-medium">
          {filtered.length} registros
        </span>

      </div>


      {paged.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-[#9098b1]">
            No se encontraron servicios con
            los filtros seleccionados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

          {paged.map(servicio => {
            const color =
              COLORS[
                servicio.id_zona %
                  COLORS.length
              ];

            const background =
              BACKGROUNDS[
                servicio.id_zona %
                  BACKGROUNDS.length
              ];

            return (
              <button
                type="button"
                key={servicio.id_servicio}
                onClick={() =>
                  setSelected(servicio)
                }
                className="card p-4 text-left hover:shadow-lg transition-all group"
              >
                <div className="flex items-start justify-between mb-3">

                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                      style={{
                        background,
                      }}
                    >
                      {getTypeIcon(
                        servicio.tipo_servicio_categoria,
                      )}
                    </div>

                    <div>
                      <p className="text-[11px] text-[#9098b1] font-medium">
                        ID{" "}
                        {servicio.id_servicio}
                        {" · "}
                        {servicio.rpu}
                      </p>

                      <p className="text-sm font-semibold text-[#1a1a2e] truncate max-w-44">
                        {servicio.nombre}
                      </p>
                    </div>
                  </div>

                  <span
                    className="text-[10px] font-semibold px-2.5 py-1 rounded-full max-w-32 truncate"
                    style={{
                      background,
                      color,
                    }}
                  >
                    {servicio.zona_nombre}
                  </span>

                </div>


                <p className="text-[11px] text-[#9098b1] mb-3 truncate">
                  {
                    servicio.tipo_servicio_nombre
                  }
                  {" · "}
                  {formatText(
                    servicio.tipo_servicio_categoria,
                  )}
                </p>


                <div className="grid grid-cols-3 gap-2">

                  <div className="rounded-xl bg-[#f8f9fc] py-2 px-2 text-center">
                    <p className="text-xs font-bold text-[#606881]">
                      {servicio.ocupacion_estimada ??
                        "—"}
                    </p>

                    <p className="text-[10px] text-[#9098b1] mt-0.5">
                      ocup.
                    </p>
                  </div>


                  <div className="rounded-xl bg-[#f8f9fc] py-2 px-2 text-center">
                    <p className="text-xs font-bold text-[#ff8a1f]">
                      {servicio.carga_contratada_kw.toLocaleString(
                        "es-MX",
                        {
                          maximumFractionDigits: 2,
                        },
                      )}
                    </p>

                    <p className="text-[10px] text-[#9098b1] mt-0.5">
                      kW carga
                    </p>
                  </div>


                  <div className="rounded-xl bg-[#f8f9fc] py-2 px-2 text-center">
                    <p
                      className="text-xs font-bold"
                      style={{
                        color:
                          servicio.tiene_solar
                            ? "#10b981"
                            : "#9098b1",
                      }}
                    >
                      {servicio.tiene_solar
                        ? "Sí"
                        : "No"}
                    </p>

                    <p className="text-[10px] text-[#9098b1] mt-0.5">
                      solar
                    </p>
                  </div>

                </div>


                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#f0f1f7]">
                  <span className="text-[11px] text-[#9098b1] font-medium">
                    Tarifa #
                    {servicio.id_tarifa}
                  </span>

                  <ChevronRight
                    size={14}
                    className="text-[#9098b1] group-hover:text-[#ff8a1f] transition-colors"
                  />
                </div>
              </button>
            );
          })}

        </div>
      )}


      <div className="flex items-center justify-center gap-2">

        <button
          type="button"
          onClick={() =>
            setPage(current =>
              Math.max(1, current - 1),
            )
          }
          disabled={currentPage === 1}
          className="px-4 py-2 text-xs font-semibold rounded-full border border-[#e5e7ef] text-[#9098b1] disabled:opacity-40 hover:border-[#ff8a1f] hover:text-[#ff8a1f] transition-colors"
        >
          Anterior
        </button>

        <span className="text-xs text-[#9098b1] font-medium px-2">
          {currentPage} / {pages}
        </span>

        <button
          type="button"
          onClick={() =>
            setPage(current =>
              Math.min(
                pages,
                current + 1,
              ),
            )
          }
          disabled={
            currentPage === pages
          }
          className="px-4 py-2 text-xs font-semibold rounded-full border border-[#e5e7ef] text-[#9098b1] disabled:opacity-40 hover:border-[#ff8a1f] hover:text-[#ff8a1f] transition-colors"
        >
          Siguiente
        </button>

      </div>


      {selected && (
        <ServicioDetail
          servicio={selected}
          onClose={() =>
            setSelected(null)
          }
        />
      )}

    </div>
  );
}