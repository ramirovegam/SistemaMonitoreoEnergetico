import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Calendar,
  ChevronRight,
  Gauge,
  MapPin,
  Radio,
  RefreshCw,
  Search,
  Server,
  X,
} from "lucide-react";

import {
  obtenerMedidores,
  type Medidor,
} from "../services/medidoresService";

const PAGE_SIZE = 12;

const formatDate = (value: string | null): string => {
  if (!value) return "Sin fecha";

  const parts = value.split("-");
  if (parts.length !== 3) return value;

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
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

interface MedidorDetailProps {
  medidor: Medidor;
  onClose: () => void;
}

function MedidorDetail({ medidor, onClose }: MedidorDetailProps) {
  const quality = getQualityPercentage(medidor.calidad_enlace);
  const qualityColor = getQualityColor(quality);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1a2e]/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-[#f0f1f7]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#eef2ff] flex items-center justify-center">
              <Radio size={22} color="#6366f1" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-[#1a1a2e]">
                Medidor {medidor.numero_serie}
              </h2>
              <p className="text-xs text-[#9098b1]">
                ID {medidor.id_medidor} · {medidor.marca}
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
              { label: "Número de serie", value: medidor.numero_serie },
              { label: "Marca", value: medidor.marca },
              { label: "Estado", value: medidor.estado },
              { label: "Multiplicador", value: String(medidor.multiplicador) },
              {
                label: "Fecha de instalación",
                value: formatDate(medidor.fecha_instalacion),
              },
              {
                label: "Fecha de retiro",
                value: medidor.fecha_retiro
                  ? formatDate(medidor.fecha_retiro)
                  : "No retirado",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl bg-[#f8f9fc] p-4"
              >
                <p className="text-[11px] text-[#9098b1]">{item.label}</p>
                <p className="text-sm font-bold text-[#1a1a2e] mt-1">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl bg-[#f8f9fc] p-4">
            <div className="flex justify-between items-center mb-3">
              <div>
                <p className="text-xs font-semibold text-[#1a1a2e]">
                  Calidad del enlace
                </p>
                <p className="text-[10px] text-[#9098b1]">
                  Indicador de conectividad
                </p>
              </div>

              <p
                className="text-lg font-bold"
                style={{ color: qualityColor }}
              >
                {quality.toFixed(2)}%
              </p>
            </div>

            <div className="h-2.5 rounded-full bg-[#e5e7ef] overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${quality}%`,
                  background: qualityColor,
                }}
              />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#1a1a2e] mb-3">
              Servicio asociado
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#f8f9fc] p-4">
                <p className="text-[10px] text-[#9098b1]">Servicio</p>
                <p className="text-sm font-bold text-[#1a1a2e] mt-1">
                  {medidor.servicio_nombre}
                </p>
                <p className="text-[11px] text-[#9098b1] mt-1">
                  RPU {medidor.servicio_rpu}
                </p>
              </div>

              <div className="rounded-2xl bg-[#f8f9fc] p-4">
                <p className="text-[10px] text-[#9098b1]">Zona</p>
                <p className="text-sm font-bold text-[#1a1a2e] mt-1">
                  {medidor.zona_nombre}
                </p>
                <p className="text-[11px] text-[#9098b1] mt-1">
                  {medidor.tipo_servicio_nombre}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Meters() {
  const [medidores, setMedidores] = useState<Medidor[]>([]);
  const [search, setSearch] = useState("");
  const [filterZone, setFilterZone] = useState("Todas");
  const [filterBrand, setFilterBrand] = useState("Todas");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [selected, setSelected] = useState<Medidor | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarMedidores = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const data = await obtenerMedidores();
      setMedidores(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar los medidores",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargarMedidores();
  }, []);

  const zonas = useMemo(() => {
    return [...new Set(medidores.map((medidor) => medidor.zona_nombre))].sort(
      (a, b) => a.localeCompare(b, "es"),
    );
  }, [medidores]);

  const marcas = useMemo(() => {
    return [...new Set(medidores.map((medidor) => medidor.marca))].sort(
      (a, b) => a.localeCompare(b, "es"),
    );
  }, [medidores]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return medidores.filter((medidor) => {
      const matchSearch =
        query.length === 0 ||
        medidor.numero_serie.toLowerCase().includes(query) ||
        medidor.marca.toLowerCase().includes(query) ||
        medidor.servicio_nombre.toLowerCase().includes(query) ||
        medidor.servicio_rpu.toLowerCase().includes(query) ||
        medidor.zona_nombre.toLowerCase().includes(query) ||
        String(medidor.id_medidor).includes(query);

      const matchZone =
        filterZone === "Todas" || medidor.zona_nombre === filterZone;
      const matchBrand =
        filterBrand === "Todas" || medidor.marca === filterBrand;
      const matchStatus =
        filterStatus === "Todos" || medidor.estado === filterStatus;

      return matchSearch && matchZone && matchBrand && matchStatus;
    });
  }, [medidores, search, filterZone, filterBrand, filterStatus]);

  const installedCount = medidores.filter(
    (medidor) => medidor.estado === "Instalado",
  ).length;

  const retiredCount = medidores.filter(
    (medidor) => medidor.estado === "Retirado",
  ).length;

  const averageQuality =
    medidores.length === 0
      ? 0
      : medidores.reduce(
          (total, medidor) =>
            total + getQualityPercentage(medidor.calidad_enlace),
          0,
        ) / medidores.length;

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
            Cargando medidores desde PostgreSQL...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-8 text-center">
        <h2 className="font-bold text-[#1a1a2e]">
          No se pudieron cargar los medidores
        </h2>
        <p className="text-xs text-[#9098b1] mt-2">{error}</p>
        <button
          type="button"
          onClick={() => void cargarMedidores()}
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
          <h1 className="text-2xl font-bold text-[#1a1a2e]">
            Módulo de Medidores
          </h1>
          <p className="text-sm text-[#9098b1] mt-0.5">
            Medidores registrados en PostgreSQL
          </p>
        </div>

        <button
          type="button"
          onClick={() => void cargarMedidores()}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-[#e5e7ef] text-xs font-semibold text-[#606881]"
        >
          <RefreshCw size={13} />
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          {
            label: "Medidores registrados",
            value: medidores.length,
            icon: Server,
            color: "#6366f1",
            background: "#eef2ff",
          },
          {
            label: "Instalados",
            value: installedCount,
            icon: Activity,
            color: "#10b981",
            background: "#ecfdf5",
          },
          {
            label: "Retirados",
            value: retiredCount,
            icon: Calendar,
            color: "#9098b1",
            background: "#f8f9fc",
          },
          {
            label: "Calidad promedio",
            value: `${averageQuality.toFixed(2)}%`,
            icon: Gauge,
            color: getQualityColor(averageQuality),
            background: "#fff4ea",
          },
        ].map((item) => (
          <div key={item.label} className="card p-4">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
              style={{ background: item.background }}
            >
              <item.icon size={16} color={item.color} />
            </div>
            <p className="text-[11px] text-[#9098b1]">{item.label}</p>
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
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Buscar por ID, serie, marca, RPU o servicio..."
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
          value={filterBrand}
          onChange={(event) => {
            setFilterBrand(event.target.value);
            setPage(1);
          }}
          className="bg-white border border-[#e5e7ef] rounded-2xl px-4 py-2.5 text-sm text-[#1a1a2e]"
        >
          <option value="Todas">Todas las marcas</option>
          {marcas.map((marca) => (
            <option key={marca} value={marca}>
              {marca}
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
          <option value="Instalado">Instalado</option>
          <option value="Retirado">Retirado</option>
        </select>

        <span className="text-xs text-[#9098b1]">
          {filtered.length} registros
        </span>
      </div>

      {paged.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-[#9098b1]">
            No se encontraron medidores.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paged.map((medidor) => {
            const quality = getQualityPercentage(medidor.calidad_enlace);
            const qualityColor = getQualityColor(quality);

            return (
              <button
                type="button"
                key={medidor.id_medidor}
                onClick={() => setSelected(medidor)}
                className="card p-4 text-left hover:shadow-lg transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-[#eef2ff] flex items-center justify-center">
                      <Radio size={18} color="#6366f1" />
                    </div>
                    <div>
                      <p className="text-[11px] text-[#9098b1]">
                        ID {medidor.id_medidor}
                      </p>
                      <p className="text-sm font-semibold text-[#1a1a2e]">
                        {medidor.numero_serie}
                      </p>
                    </div>
                  </div>

                  <span
                    className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
                    style={{
                      color:
                        medidor.estado === "Instalado" ? "#059669" : "#9098b1",
                      background:
                        medidor.estado === "Instalado" ? "#ecfdf5" : "#f8f9fc",
                    }}
                  >
                    {medidor.estado}
                  </span>
                </div>

                <p className="text-[11px] text-[#9098b1] mb-3 truncate">
                  {medidor.marca} · {medidor.zona_nombre}
                </p>

                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-[#f8f9fc] p-2 text-center">
                    <p className="text-xs font-bold text-[#606881]">
                      {medidor.multiplicador}
                    </p>
                    <p className="text-[10px] text-[#9098b1]">mult.</p>
                  </div>

                  <div className="rounded-xl bg-[#f8f9fc] p-2 text-center">
                    <p
                      className="text-xs font-bold"
                      style={{ color: qualityColor }}
                    >
                      {quality.toFixed(1)}%
                    </p>
                    <p className="text-[10px] text-[#9098b1]">enlace</p>
                  </div>

                  <div className="rounded-xl bg-[#f8f9fc] p-2 text-center">
                    <p className="text-xs font-bold text-[#6366f1] truncate">
                      {medidor.servicio_rpu}
                    </p>
                    <p className="text-[10px] text-[#9098b1]">RPU</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#f0f1f7]">
                  <span className="text-[11px] text-[#9098b1] truncate">
                    <MapPin size={11} className="inline mr-1" />
                    {medidor.tipo_servicio_nombre}
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
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          disabled={currentPage === 1}
          className="px-4 py-2 text-xs font-semibold rounded-full border border-[#e5e7ef] text-[#9098b1] disabled:opacity-40 hover:border-[#ff8a1f] hover:text-[#ff8a1f]"
        >
          Anterior
        </button>

        <span className="text-xs text-[#9098b1]">
          {currentPage} / {totalPages}
        </span>

        <button
          type="button"
          onClick={() =>
            setPage((current) => Math.min(totalPages, current + 1))
          }
          disabled={currentPage === totalPages}
          className="px-4 py-2 text-xs font-semibold rounded-full border border-[#e5e7ef] text-[#9098b1] disabled:opacity-40 hover:border-[#ff8a1f] hover:text-[#ff8a1f]"
        >
          Siguiente
        </button>
      </div>

      {selected && (
        <MedidorDetail
          medidor={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
