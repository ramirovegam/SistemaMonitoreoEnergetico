import { useEffect, useMemo, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Activity, CalendarRange, Gauge, RefreshCw, Search, TrendingUp, Zap,
} from "lucide-react";
import {
  obtenerLecturas,
  obtenerMedidoresAnalisis,
  obtenerPerfilHorario,
  obtenerPeriodos,
  obtenerResumenAnalisis,
  type LecturaEnergetica,
  type MedidorAnalisis,
  type PerfilHorario,
  type PeriodoFacturacion,
  type ResumenAnalisis,
} from "../services/analisisEnergeticoService";

const fmt = (value: number): string =>
  value.toLocaleString("es-MX", { maximumFractionDigits: 3 });

const formatDateTime = (value: string | null): string =>
  value ? new Date(value).toLocaleString("es-MX") : "Sin datos";

const tipoDiaLabel = (value: string): string => {
  if (value === "H") return "Hábil / laboral";
  if (value === "S") return "Sábado";
  if (value === "D") return "Domingo";
  return `Tipo ${value}`;
};

export default function EnergyAnalysis() {
  const [medidores, setMedidores] = useState<MedidorAnalisis[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tipoDia, setTipoDia] = useState("H");
  const [meterSearch, setMeterSearch] = useState("");
  const [showMeterResults, setShowMeterResults] = useState(false);
  const [lecturas, setLecturas] = useState<LecturaEnergetica[]>([]);
  const [perfil, setPerfil] = useState<PerfilHorario[]>([]);
  const [periodos, setPeriodos] = useState<PeriodoFacturacion[]>([]);
  const [resumen, setResumen] = useState<ResumenAnalisis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => medidores.find((item) => item.id_medidor === selectedId) ?? null,
    [medidores, selectedId],
  );

  const filteredMeters = useMemo(() => {
    const query = meterSearch.trim().toLowerCase();
    if (!query) return medidores.slice(0, 25);

    return medidores
      .filter((item) =>
        item.numero_serie.toLowerCase().includes(query) ||
        item.servicio_rpu.toLowerCase().includes(query) ||
        item.servicio_nombre.toLowerCase().includes(query) ||
        item.zona_nombre.toLowerCase().includes(query) ||
        String(item.id_medidor).includes(query),
      )
      .slice(0, 30);
  }, [medidores, meterSearch]);

  const cargarCatalogo = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const data = await obtenerMedidoresAnalisis();
      setMedidores(data);
      setSelectedId((current) => current ?? data[0]?.id_medidor ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el catálogo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargarCatalogo();
  }, []);

  useEffect(() => {
    if (!selected) return;

    const cargarDatos = async (): Promise<void> => {
      try {
        setLoading(true);
        setError(null);

        const [lecturasData, resumenData, perfilData, periodosData] =
          await Promise.all([
            obtenerLecturas(selected.id_medidor),
            obtenerResumenAnalisis(selected.id_medidor),
            obtenerPerfilHorario(selected.id_tipo_servicio, tipoDia),
            obtenerPeriodos(selected.id_servicio),
          ]);

        setLecturas(lecturasData);
        setResumen(resumenData);
        setPerfil(perfilData);
        setPeriodos(periodosData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudieron cargar los datos.");
      } finally {
        setLoading(false);
      }
    };

    void cargarDatos();
  }, [selected, tipoDia]);

  const lecturaChart = lecturas.map((item) => ({
    fecha: new Date(item.ts).toLocaleString("es-MX", {
      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
    }),
    real: item.consumo_real_kwh,
    estimado: item.consumo_kwh,
  }));

  const perfilChart = perfil.map((item) => ({
    hora: `${String(item.hora).padStart(2, "0")}:00`,
    factor: item.factor,
  }));

  const periodosChart = [...periodos].reverse().map((item) => ({
    periodo: item.folio,
    consumo: item.consumo_real_kwh,
  }));

  if (loading && medidores.length === 0) {
    return (
      <div className="card p-8 text-center text-sm text-[#9098b1]">
        Cargando análisis energético...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Análisis Energético</h1>
          <p className="text-sm text-[#9098b1]">
            Lecturas, perfil horario y periodos de facturación
          </p>
        </div>
        <button
          type="button"
          onClick={() => void cargarCatalogo()}
          className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-xs font-semibold text-[#606881]"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="rounded-2xl bg-[#fef2f2] p-4 text-xs text-[#b91c1c]">
          {error}
        </div>
      )}

      <div className="card grid grid-cols-1 gap-4 p-4 lg:grid-cols-3">
        <div className="relative lg:col-span-2">
          <label htmlFor="meter-search" className="mb-1 block text-xs font-semibold text-[#606881]">
            Buscar medidor
          </label>
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9098b1]" />
            <input
              id="meter-search"
              value={meterSearch}
              onFocus={() => setShowMeterResults(true)}
              onChange={(event) => {
                setMeterSearch(event.target.value);
                setShowMeterResults(true);
              }}
              placeholder="Buscar por serie, ejemplo MEDI-2600000001-1"
              className="w-full rounded-xl border border-[#e5e7ef] bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#ff8a1f]"
            />
          </div>

          {showMeterResults && (
            <div className="absolute left-0 right-0 z-40 mt-1 max-h-72 overflow-y-auto rounded-2xl border border-[#e5e7ef] bg-white p-2 shadow-xl">
              {filteredMeters.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#9098b1]">
                  No se encontraron medidores
                </div>
              ) : (
                filteredMeters.map((item) => (
                  <button
                    type="button"
                    key={item.id_medidor}
                    onClick={() => {
                      setSelectedId(item.id_medidor);
                      setMeterSearch(item.numero_serie);
                      setShowMeterResults(false);
                    }}
                    className="w-full rounded-xl px-3 py-2.5 text-left hover:bg-[#f8f9fc]"
                  >
                    <p className="text-xs font-bold text-[#1a1a2e]">
                      {item.numero_serie}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[#9098b1]">
                      RPU {item.servicio_rpu} · {item.servicio_nombre}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[#b0b6c8]">
                      {item.zona_nombre} · {item.tipo_servicio_nombre}
                    </p>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <label>
          <span className="mb-1 block text-xs font-semibold text-[#606881]">
            Tipo de día
          </span>
          <select
            value={tipoDia}
            onChange={(event) => setTipoDia(event.target.value)}
            className="w-full rounded-xl border border-[#e5e7ef] bg-white px-3 py-2.5 text-sm"
          >
            <option value="H">Hábil / laboral</option>
            <option value="S">Sábado</option>
            <option value="D">Domingo</option>
          </select>
        </label>
      </div>

      {selected && (
        <div className="rounded-xl bg-white px-4 py-3 text-xs text-[#9098b1]">
          <strong className="text-[#1a1a2e]">{selected.numero_serie}</strong>
          {" · "}RPU {selected.servicio_rpu}
          {" · "}{selected.tipo_servicio_nombre}
          {" · "}{selected.zona_nombre}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Lecturas", value: String(resumen?.total_lecturas ?? 0), icon: Activity, color: "#6366f1", bg: "#eef2ff" },
          { label: "Consumo total", value: `${fmt(resumen?.consumo_total_kwh ?? 0)} kWh`, icon: Zap, color: "#ff8a1f", bg: "#fff4ea" },
          { label: "Promedio por lectura", value: `${fmt(resumen?.consumo_promedio_kwh ?? 0)} kWh`, icon: Gauge, color: "#10b981", bg: "#ecfdf5" },
          { label: "Consumo máximo", value: `${fmt(resumen?.consumo_maximo_kwh ?? 0)} kWh`, icon: TrendingUp, color: "#ef4444", bg: "#fef2f2" },
        ].map((item) => (
          <div key={item.label} className="card p-4">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: item.bg }}>
              <item.icon size={16} color={item.color} />
            </div>
            <p className="text-[11px] text-[#9098b1]">{item.label}</p>
            <p className="text-lg font-bold text-[#1a1a2e]">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-[#1a1a2e]">Sección de lecturas</h3>
        <p className="mb-4 text-[11px] text-[#9098b1]">
          Máximo registrado: {formatDateTime(resumen?.hora_maximo ?? null)}
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={lecturaChart}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f1f7" />
            <XAxis dataKey="fecha" tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Area type="monotone" dataKey="real" stroke="#ff8a1f" fill="#fff4ea" name="Consumo real" />
            <Area type="monotone" dataKey="estimado" stroke="#6366f1" fill="transparent" name="Consumo estimado" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-[#1a1a2e]">Perfil horario</h3>
          <p className="mb-4 text-[11px] text-[#9098b1]">
            Forma esperada del consumo durante un día {tipoDiaLabel(tipoDia).toLowerCase()}
          </p>
          {perfilChart.length === 0 ? (
            <div className="flex h-[240px] flex-col items-center justify-center rounded-2xl bg-[#f8f9fc] text-center">
              <Gauge size={28} color="#b0b6c8" />
              <p className="mt-3 text-sm font-semibold text-[#606881]">
                Sin perfil para este tipo de servicio
              </p>
              <p className="mt-1 text-[11px] text-[#9098b1]">
                No hay factores para el tipo de día {tipoDia}.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={perfilChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f1f7" />
                <XAxis dataKey="hora" tick={{ fontSize: 9 }} interval={2} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="factor" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} name="Factor" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-[#1a1a2e]">Comparación de periodos</h3>
          <p className="mb-4 text-[11px] text-[#9098b1]">Consumo real por periodo de facturación</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={periodosChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f1f7" />
              <XAxis dataKey="periodo" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="consumo" fill="#10b981" radius={[6, 6, 0, 0]} name="kWh" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[#f0f1f7] p-5">
          <CalendarRange size={16} color="#6366f1" />
          <h3 className="text-sm font-semibold text-[#1a1a2e]">Periodos de facturación</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-[#f8f9fc] text-[#9098b1]">
              <tr><th className="p-3">Folio</th><th>Inicio</th><th>Fin</th><th>Tarifa</th><th>Consumo</th><th>DAC</th></tr>
            </thead>
            <tbody>
              {periodos.map((item) => (
                <tr key={item.id_periodo} className="border-t border-[#f0f1f7]">
                  <td className="p-3 font-semibold">{item.folio}</td>
                  <td>{item.fecha_inicio}</td><td>{item.fecha_fin}</td>
                  <td>{item.tarifa_codigo}</td>
                  <td>{fmt(item.consumo_real_kwh)} kWh</td>
                  <td>{item.clasificacion_dac ? "Sí" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
