import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Gauge,
  MapPin,
  Radio,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import {
  obtenerAlertas,
  type Alerta,
} from "../services/alertasService";

const PAGE_SIZE = 12;

const formatDateTime = (value: string | null): string => {
  if (!value) return "Sin fecha";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getPriorityLabel = (priority: number): string => {
  if (priority === 1) return "Baja";
  if (priority === 2) return "Media";
  if (priority === 3) return "Alta";
  return `Prioridad ${priority}`;
};

const getPriorityColor = (priority: number): string => {
  if (priority >= 3) return "#ef4444";
  if (priority === 2) return "#f59e0b";
  return "#6366f1";
};

const getPriorityBackground = (priority: number): string => {
  if (priority >= 3) return "#fef2f2";
  if (priority === 2) return "#fffbeb";
  return "#eef2ff";
};

const getQualityPercentage = (value: number): number => {
  const percentage = value <= 1 ? value * 100 : value;
  return Math.max(0, Math.min(100, percentage));
};

const getQualityColor = (percentage: number): string => {
  if (percentage >= 80) return "#10b981";
  if (percentage >= 50) return "#f59e0b";
  return "#ef4444";
};

interface AlertaDetailProps {
  alerta: Alerta;
  onClose: () => void;
}

function AlertaDetail({ alerta, onClose }: AlertaDetailProps) {
  const priorityColor = getPriorityColor(alerta.prioridad);
  const priorityBackground = getPriorityBackground(alerta.prioridad);
  const quality = getQualityPercentage(alerta.calidad_enlace);
  const qualityColor = getQualityColor(quality);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1a2e]/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-[#f0f1f7]">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: priorityBackground }}
            >
              <AlertTriangle size={22} color={priorityColor} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-[#1a1a2e]">
                Alerta #{alerta.id_alerta}
              </h2>
              <p className="text-xs text-[#9098b1]">
                Tipo de evento #{alerta.id_tipo_evento} · {alerta.estado}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#f2f3f7] flex items-center justify-center hover:bg-[#e5e7ef] transition-colors"
          >
            <X size={14} className="text-[#9098b1]" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                label: "Prioridad",
                value: getPriorityLabel(alerta.prioridad),
                color: priorityColor,
                background: priorityBackground,
              },
              {
                label: "Estado",
                value: alerta.estado,
                color: alerta.estado === "Activa" ? "#ef4444" : "#10b981",
                background:
                  alerta.estado === "Activa" ? "#fef2f2" : "#ecfdf5",
              },
              {
                label: "Fecha de generación",
                value: formatDateTime(alerta.ts_generacion),
                color: "#6366f1",
                background: "#eef2ff",
              },
              {
                label: "Fecha de cierre",
                value: alerta.ts_cierre
                  ? formatDateTime(alerta.ts_cierre)
                  : "Pendiente de cierre",
                color: "#9098b1",
                background: "#f8f9fc",
              },
              {
                label: "ID de evento",
                value:
                  alerta.id_evento === null
                    ? "Sin evento asociado"
                    : String(alerta.id_evento),
                color: "#f59e0b",
                background: "#fffbeb",
              },
              {
                label: "Resultado",
                value: alerta.resultado ?? "Sin resultado",
                color: "#606881",
                background: "#f8f9fc",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl p-4"
                style={{ background: item.background }}
              >
                <p className="text-[11px] text-[#9098b1] font-medium">
                  {item.label}
                </p>
                <p
                  className="text-sm font-bold mt-1"
                  style={{ color: item.color }}
                >
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#1a1a2e] mb-3">
              Medidor relacionado
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#f8f9fc] p-4">
                <div className="flex items-center gap-3">
                  <Radio size={18} color="#6366f1" />
                  <div>
                    <p className="text-[10px] text-[#9098b1]">Medidor</p>
                    <p className="text-sm font-bold text-[#1a1a2e]">
                      {alerta.medidor_numero_serie}
                    </p>
                    <p className="text-[11px] text-[#9098b1] mt-1">
                      {alerta.medidor_marca} · ID {alerta.id_medidor}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-[#f8f9fc] p-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <Gauge size={18} color={qualityColor} />
                    <p className="text-xs font-semibold text-[#1a1a2e]">
                      Calidad del enlace
                    </p>
                  </div>
                  <p className="text-sm font-bold" style={{ color: qualityColor }}>
                    {quality.toFixed(2)}%
                  </p>
                </div>
                <div className="h-2 rounded-full bg-[#e5e7ef] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${quality}%`, background: qualityColor }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#1a1a2e] mb-3">
              Servicio y ubicación
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#f8f9fc] p-4">
                <p className="text-[10px] text-[#9098b1]">Servicio</p>
                <p className="text-sm font-bold text-[#1a1a2e] mt-1">
                  {alerta.servicio_nombre}
                </p>
                <p className="text-[11px] text-[#9098b1] mt-1">
                  RPU {alerta.servicio_rpu} · ID {alerta.id_servicio}
                </p>
              </div>

              <div className="rounded-2xl bg-[#f8f9fc] p-4">
                <div className="flex items-center gap-3">
                  <MapPin size={18} color="#ff8a1f" />
                  <div>
                    <p className="text-[10px] text-[#9098b1]">Zona</p>
                    <p className="text-sm font-bold text-[#1a1a2e]">
                      {alerta.zona_nombre}
                    </p>
                    <p className="text-[11px] text-[#9098b1] mt-1">
                      ID de zona {alerta.id_zona}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#f0f1f7] p-4">
            <p className="text-xs font-semibold text-[#1a1a2e]">
              Tipo del evento
            </p>
            <p className="text-[11px] text-[#9098b1] mt-1 leading-relaxed">
              Actualmente se muestra el identificador del tipo de evento: {" "}
              <strong>#{alerta.id_tipo_evento}</strong>. El nombre y la
              descripción podrán mostrarse al integrar el modelo
              <code className="mx-1">tipo_evento</code> en el backend.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Alerts() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [search, setSearch] = useState("");
  const [filterZone, setFilterZone] = useState("Todas");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [filterPriority, setFilterPriority] = useState("Todas");
  const [selected, setSelected] = useState<Alerta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarAlertas = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const data = await obtenerAlertas();
      setAlertas(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar las alertas",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargarAlertas();
  }, []);

  const zonas = useMemo(() => {
    return [...new Set(alertas.map((alerta) => alerta.zona_nombre))].sort(
      (a, b) => a.localeCompare(b, "es"),
    );
  }, [alertas]);

  const prioridades = useMemo(() => {
    return [...new Set(alertas.map((alerta) => alerta.prioridad))].sort(
      (a, b) => a - b,
    );
  }, [alertas]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return alertas.filter((alerta) => {
      const matchSearch =
        query.length === 0 ||
        String(alerta.id_alerta).includes(query) ||
        String(alerta.id_tipo_evento).includes(query) ||
        String(alerta.id_evento ?? "").includes(query) ||
        alerta.medidor_numero_serie.toLowerCase().includes(query) ||
        alerta.medidor_marca.toLowerCase().includes(query) ||
        alerta.servicio_nombre.toLowerCase().includes(query) ||
        alerta.servicio_rpu.toLowerCase().includes(query) ||
        alerta.zona_nombre.toLowerCase().includes(query) ||
        (alerta.resultado ?? "").toLowerCase().includes(query);

      const matchZone =
        filterZone === "Todas" || alerta.zona_nombre === filterZone;

      const matchStatus =
        filterStatus === "Todos" || alerta.estado === filterStatus;

      const matchPriority =
        filterPriority === "Todas" ||
        String(alerta.prioridad) === filterPriority;

      return matchSearch && matchZone && matchStatus && matchPriority;
    });
  }, [alertas, search, filterZone, filterStatus, filterPriority]);

  const activeCount = alertas.filter(
    (alerta) => alerta.estado === "Activa",
  ).length;

  const closedCount = alertas.filter(
    (alerta) => alerta.estado === "Cerrada",
  ).length;

  const highestPriority =
    alertas.length === 0
      ? 0
      : Math.max(...alertas.map((alerta) => alerta.prioridad));

  const highestPriorityCount = alertas.filter(
    (alerta) => alerta.prioridad === highestPriority,
  ).length;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  if (loading) {
    return (
      <div className="card p-8">
        <div className="flex items-center justify-center gap-3">
          <RefreshCw size={20} className="animate-spin text-[#ff8a1f]" />
          <p className="text-sm text-[#9098b1]">
            Cargando alertas desde PostgreSQL...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-8 text-center">
        <AlertTriangle size={28} color="#ef4444" className="mx-auto mb-3" />
        <h2 className="font-bold text-[#1a1a2e]">
          No se pudieron cargar las alertas
        </h2>
        <p className="text-xs text-[#9098b1] mt-2">{error}</p>
        <button
          type="button"
          onClick={() => void cargarAlertas()}
          className="mt-4 px-4 py-2 rounded-xl bg-[#ff8a1f] text-white text-xs font-semibold"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-[#1a1a2e]"
            style={{ fontFamily: "Nunito, sans-serif" }}
          >
            Módulo de Alertas
          </h1>
          <p className="text-sm text-[#9098b1] mt-0.5">
            Alertas registradas en PostgreSQL
          </p>
        </div>

        <button
          type="button"
          onClick={() => void cargarAlertas()}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-[#e5e7ef] text-xs font-semibold text-[#606881]"
        >
          <RefreshCw size={13} />
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          {
            label: "Alertas registradas",
            value: alertas.length,
            icon: CircleAlert,
            color: "#6366f1",
            background: "#eef2ff",
          },
          {
            label: "Alertas activas",
            value: activeCount,
            icon: AlertTriangle,
            color: "#ef4444",
            background: "#fef2f2",
          },
          {
            label: "Alertas cerradas",
            value: closedCount,
            icon: CheckCircle2,
            color: "#10b981",
            background: "#ecfdf5",
          },
          {
            label:
              highestPriority === 0
                ? "Prioridad máxima"
                : `${getPriorityLabel(highestPriority)} prioridad`,
            value: highestPriorityCount,
            icon: Gauge,
            color: getPriorityColor(highestPriority),
            background: getPriorityBackground(highestPriority),
          },
        ].map((item) => (
          <div key={item.label} className="card p-4">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
              style={{ background: item.background }}
            >
              <item.icon size={16} color={item.color} />
            </div>
            <p className="text-[11px] text-[#9098b1] font-medium">
              {item.label}
            </p>
            <p className="text-lg font-bold text-[#1a1a2e] mt-0.5">
              {item.value.toLocaleString("es-MX")}
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
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Buscar por alerta, medidor, RPU, servicio o zona..."
            className="w-full bg-white border border-[#e5e7ef] rounded-2xl pl-10 pr-4 py-2.5 text-sm text-[#1a1a2e] placeholder-[#9098b1] focus:outline-none focus:border-[#ff8a1f]"
          />
        </div>

        <select
          value={filterZone}
          onChange={(event) => {
            setFilterZone(event.target.value);
            setPage(1);
          }}
          className="bg-white border border-[#e5e7ef] rounded-2xl px-4 py-2.5 text-sm text-[#1a1a2e]"
        >
          <option value="Todas">Todas las zonas</option>
          {zonas.map((zona) => (
            <option key={zona} value={zona}>
              {zona}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(event) => {
            setFilterStatus(event.target.value);
            setPage(1);
          }}
          className="bg-white border border-[#e5e7ef] rounded-2xl px-4 py-2.5 text-sm text-[#1a1a2e]"
        >
          <option value="Todos">Todos los estados</option>
          <option value="Activa">Activa</option>
          <option value="Cerrada">Cerrada</option>
        </select>

        <select
          value={filterPriority}
          onChange={(event) => {
            setFilterPriority(event.target.value);
            setPage(1);
          }}
          className="bg-white border border-[#e5e7ef] rounded-2xl px-4 py-2.5 text-sm text-[#1a1a2e]"
        >
          <option value="Todas">Todas las prioridades</option>
          {prioridades.map((prioridad) => (
            <option key={prioridad} value={String(prioridad)}>
              {getPriorityLabel(prioridad)} ({prioridad})
            </option>
          ))}
        </select>

        <span className="text-xs text-[#9098b1] font-medium">
          {filtered.length} registros
        </span>
      </div>

      {paged.length === 0 ? (
        <div className="card p-8 text-center">
          <CheckCircle2 size={30} color="#10b981" className="mx-auto mb-3" />
          <p className="text-sm text-[#9098b1]">
            No se encontraron alertas con los filtros seleccionados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {paged.map((alerta) => {
            const priorityColor = getPriorityColor(alerta.prioridad);
            const priorityBackground = getPriorityBackground(alerta.prioridad);

            return (
              <button
                type="button"
                key={alerta.id_alerta}
                onClick={() => setSelected(alerta)}
                className="card p-4 text-left hover:shadow-lg transition-all group"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: priorityBackground }}
                    >
                      <AlertTriangle size={18} color={priorityColor} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[11px] text-[#9098b1]">
                        Alerta #{alerta.id_alerta}
                      </p>
                      <p className="text-sm font-semibold text-[#1a1a2e] truncate">
                        Tipo de evento #{alerta.id_tipo_evento}
                      </p>
                    </div>
                  </div>

                  <span
                    className="text-[10px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                    style={{
                      color: alerta.estado === "Activa" ? "#ef4444" : "#059669",
                      background:
                        alerta.estado === "Activa" ? "#fef2f2" : "#ecfdf5",
                    }}
                  >
                    {alerta.estado}
                  </span>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <span
                    className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                    style={{ color: priorityColor, background: priorityBackground }}
                  >
                    Prioridad {getPriorityLabel(alerta.prioridad)}
                  </span>

                  <span className="text-[10px] text-[#9098b1]">
                    {formatDateTime(alerta.ts_generacion)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-[#f8f9fc] p-2.5">
                    <p className="text-[9px] text-[#9098b1]">Medidor</p>
                    <p className="text-xs font-bold text-[#1a1a2e] truncate mt-0.5">
                      {alerta.medidor_numero_serie}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#f8f9fc] p-2.5">
                    <p className="text-[9px] text-[#9098b1]">RPU</p>
                    <p className="text-xs font-bold text-[#6366f1] truncate mt-0.5">
                      {alerta.servicio_rpu}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-[#f0f1f7]">
                  <span className="text-[11px] text-[#9098b1] truncate">
                    <MapPin size={11} className="inline mr-1" />
                    {alerta.zona_nombre}
                  </span>
                  <ChevronRight
                    size={14}
                    className="text-[#9098b1] group-hover:text-[#ff8a1f] transition-colors flex-shrink-0"
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
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          disabled={currentPage === 1}
          className="px-4 py-2 text-xs font-semibold rounded-full border border-[#e5e7ef] text-[#9098b1] disabled:opacity-40 hover:border-[#ff8a1f] hover:text-[#ff8a1f] transition-colors"
        >
          Anterior
        </button>

        <span className="text-xs text-[#9098b1] font-medium px-2">
          {currentPage} / {totalPages}
        </span>

        <button
          type="button"
          onClick={() =>
            setPage((current) => Math.min(totalPages, current + 1))
          }
          disabled={currentPage === totalPages}
          className="px-4 py-2 text-xs font-semibold rounded-full border border-[#e5e7ef] text-[#9098b1] disabled:opacity-40 hover:border-[#ff8a1f] hover:text-[#ff8a1f] transition-colors"
        >
          Siguiente
        </button>
      </div>

      {selected && (
        <AlertaDetail
          alerta={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
