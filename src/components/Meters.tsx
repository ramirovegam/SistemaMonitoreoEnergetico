import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { Search, CheckCircle, Clock, AlertCircle, X } from "lucide-react";
import { meters, Meter } from "../data/synthetic";

const fmt = (n: number) => n.toLocaleString("es-MX");

const statusConfig = {
  Activo: { color: "#10b981", bg: "#ecfdf5", icon: CheckCircle, label: "Activo" },
  Inactivo: { color: "#9098b1", bg: "#f3f4f8", icon: Clock, label: "Inactivo" },
  Mantenimiento: { color: "#f59e0b", bg: "#fffbeb", icon: AlertCircle, label: "Mantenimiento" },
  Falla: { color: "#ef4444", bg: "#fef2f2", icon: AlertCircle, label: "Falla" },
};

const commConfig = {
  Excelente: { color: "#10b981", bars: 4 },
  Buena: { color: "#ff8a1f", bars: 3 },
  Regular: { color: "#f59e0b", bars: 2 },
  Mala: { color: "#ef4444", bars: 1 },
};

function SignalBars({ quality }: { quality: string }) {
  const cfg = commConfig[quality as keyof typeof commConfig];
  return (
    <div className="flex items-end gap-0.5">
      {[1, 2, 3, 4].map(b => (
        <div key={b} className="w-1.5 rounded-sm transition-colors" style={{
          height: `${b * 4 + 4}px`,
          background: b <= cfg.bars ? cfg.color : "#e5e7ef",
        }} />
      ))}
    </div>
  );
}

function MeterDetail({ m, onClose }: { m: Meter; onClose: () => void }) {
  const cfg = statusConfig[m.status];
  const Icon = cfg.icon;
  const avg = Math.round(m.history.reduce((s, d) => s + d.value, 0) / m.history.length);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1a2e]/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-[#f0f1f7]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: cfg.bg }}>
              <Icon size={22} color={cfg.color} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1a1a2e]" style={{ fontFamily: "Nunito, sans-serif" }}>{m.id}</h2>
              <p className="text-xs text-[#9098b1]">{m.model} · FW {m.firmware}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#f2f3f7] flex items-center justify-center hover:bg-[#e5e7ef] transition-colors">
            <X size={14} className="text-[#9098b1]" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Estado", value: m.status, color: cfg.color, bg: cfg.bg },
              { label: "Zona", value: m.zone, color: "#ff8a1f", bg: "#fff4ea" },
              { label: "Instalación", value: m.installDate, color: "#9098b1", bg: "#f8f9fc" },
              { label: "Última Lectura", value: `${fmt(m.lastReading)} kWh`, color: "#ff8a1f", bg: "#fff4ea" },
              { label: "Fecha Lectura", value: m.lastReadingDate, color: "#9098b1", bg: "#f8f9fc" },
              { label: "Hogar vinculado", value: m.householdId, color: "#6366f1", bg: "#eef2ff" },
            ].map(item => (
              <div key={item.label} className="rounded-2xl p-3" style={{ background: item.bg }}>
                <p className="text-[11px] text-[#9098b1] font-medium mb-1">{item.label}</p>
                <p className="text-sm font-bold" style={{ color: item.color }}>{item.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl bg-[#f8f9fc] p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-[#9098b1] font-medium mb-1">Calidad de Comunicación</p>
              <p className="text-sm font-bold" style={{ color: commConfig[m.communicationQuality].color }}>
                {m.communicationQuality}
              </p>
            </div>
            <SignalBars quality={m.communicationQuality} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#1a1a2e]">Historial de Consumo — 30 días</h3>
              <span className="text-[11px] text-[#9098b1] badge-orange px-2 py-1">Prom: {fmt(avg)} kWh</span>
            </div>
            <ResponsiveContainer width="100%" height={190}>
              <LineChart data={m.history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f1f7" />
                <XAxis dataKey="date" tick={{ fill: "#9098b1", fontSize: 9 }} interval={6} />
                <YAxis tick={{ fill: "#9098b1", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "white", border: "1px solid #f0f1f7", borderRadius: 12, fontSize: 12 }} />
                <ReferenceLine y={avg} stroke="#f59e0b" strokeDasharray="4 4" opacity={0.7} />
                <Line type="monotone" dataKey="value" stroke="#ff8a1f" strokeWidth={2.5} dot={false} name="kWh" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Meters() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [filterZone, setFilterZone] = useState("Todas");
  const [selected, setSelected] = useState<Meter | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 10;

  const filtered = meters.filter(m => {
    const q = search.toLowerCase();
    return m.id.toLowerCase().includes(q) || m.householdId.toLowerCase().includes(q)
      ? (filterStatus === "Todos" || m.status === filterStatus) && (filterZone === "Todas" || m.zone === filterZone)
      : false;
  });

  const pages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const counts = {
    Activo: meters.filter(m => m.status === "Activo").length,
    Inactivo: meters.filter(m => m.status === "Inactivo").length,
    Mantenimiento: meters.filter(m => m.status === "Mantenimiento").length,
    Falla: meters.filter(m => m.status === "Falla").length,
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a2e]" style={{ fontFamily: "Nunito, sans-serif" }}>Módulo de Medidores</h1>
        <p className="text-sm text-[#9098b1] mt-0.5">Estado y telemetría de medidores inteligentes AMI</p>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-4 gap-3">
        {(Object.entries(counts) as [string, number][]).map(([status, count]) => {
          const cfg = statusConfig[status as keyof typeof statusConfig];
          const Icon = cfg.icon;
          const active = filterStatus === status;
          return (
            <button key={status} onClick={() => setFilterStatus(s => s === status ? "Todos" : status)}
              className={`card p-4 text-left transition-all ${active ? "" : "hover:shadow-md"}`}
              style={active ? { boxShadow: `0 0 0 2px ${cfg.color}, 0 4px 20px ${cfg.color}30` } : undefined}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: cfg.bg }}>
                <Icon size={16} color={cfg.color} />
              </div>
              <div className="text-2xl font-bold text-[#1a1a2e]" style={{ fontFamily: "Nunito, sans-serif" }}>{count}</div>
              <div className="text-[11px] font-medium mt-0.5" style={{ color: cfg.color }}>{status}</div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-52 relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9098b1]" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por ID de medidor u hogar…"
            className="w-full bg-white border border-[#e5e7ef] rounded-2xl pl-10 pr-4 py-2.5 text-sm text-[#1a1a2e] placeholder-[#9098b1] focus:outline-none focus:border-[#ff8a1f]" />
        </div>
        <select value={filterZone} onChange={e => { setFilterZone(e.target.value); setPage(1); }}
          className="bg-white border border-[#e5e7ef] rounded-2xl px-4 py-2.5 text-sm text-[#1a1a2e] focus:outline-none focus:border-[#ff8a1f]">
          {["Todas", "Norte", "Centro", "Sur", "Industrial"].map(z => <option key={z}>{z}</option>)}
        </select>
        <span className="text-xs text-[#9098b1] font-medium">{filtered.length} medidores</span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#f0f1f7] bg-[#f8f9fc]">
                {["ID Medidor", "Hogar", "Zona", "Estado", "Comunicación", "Última Lectura", "Instalación", "Modelo"].map(h => (
                  <th key={h} className="text-left px-4 py-3.5 text-[#9098b1] font-semibold uppercase tracking-wider text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((m) => {
                const cfg = statusConfig[m.status];
                const Icon = cfg.icon;
                return (
                  <tr key={m.id} onClick={() => setSelected(m)}
                    className="border-b border-[#f0f1f7] cursor-pointer hover:bg-[#fff4ea] transition-colors">
                    <td className="px-4 py-3 font-bold text-[#ff8a1f]">{m.id}</td>
                    <td className="px-4 py-3 text-[#9098b1] font-medium">{m.householdId}</td>
                    <td className="px-4 py-3 text-[#1a1a2e] font-medium">{m.zone}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 font-semibold" style={{ color: cfg.color }}>
                        <Icon size={11} /> {m.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <SignalBars quality={m.communicationQuality} />
                        <span className="font-medium" style={{ color: commConfig[m.communicationQuality].color }}>{m.communicationQuality}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-[#1a1a2e]">{fmt(m.lastReading)} kWh</td>
                    <td className="px-4 py-3 text-[#9098b1]">{m.installDate}</td>
                    <td className="px-4 py-3 text-[#9098b1]">{m.model}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
          className="px-4 py-2 text-xs font-semibold rounded-full border border-[#e5e7ef] text-[#9098b1] disabled:opacity-40 hover:border-[#ff8a1f] hover:text-[#ff8a1f] transition-colors">Anterior</button>
        <span className="text-xs text-[#9098b1] font-medium px-2">{page} / {pages}</span>
        <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
          className="px-4 py-2 text-xs font-semibold rounded-full border border-[#e5e7ef] text-[#9098b1] disabled:opacity-40 hover:border-[#ff8a1f] hover:text-[#ff8a1f] transition-colors">Siguiente</button>
      </div>

      {selected && <MeterDetail m={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
