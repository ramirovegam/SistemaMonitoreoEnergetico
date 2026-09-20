import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Search, Users, Tag, ChevronRight, X, Zap } from "lucide-react";
import { households, Household, Zone } from "../data/synthetic";

const fmt = (n: number) => n.toLocaleString("es-MX");

const zoneColors: Record<Zone, string> = {
  Norte: "#ff8a1f",
  Centro: "#6366f1",
  Sur: "#10b981",
  Industrial: "#f59e0b",
};

const zoneBg: Record<Zone, string> = {
  Norte: "#fff4ea",
  Centro: "#eef2ff",
  Sur: "#ecfdf5",
  Industrial: "#fffbeb",
};

const typeEmoji: Record<string, string> = {
  Casa: "🏠", Departamento: "🏢", Comercio: "🏪", Industria: "🏭",
};

function HouseholdDetail({ h, onClose }: { h: Household; onClose: () => void }) {
  const histData = h.consumption30d.map((v, i) => {
    const d = new Date("2026-09-09");
    d.setDate(d.getDate() - (29 - i));
    return { day: d.toISOString().split("T")[0].slice(5), valor: v };
  });

  const color = zoneColors[h.zone];
  const bg = zoneBg[h.zone];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1a2e]/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-[#f0f1f7]">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{typeEmoji[h.type]}</div>
            <div>
              <h2 className="text-lg font-bold text-[#1a1a2e]" style={{ fontFamily: "Nunito, sans-serif" }}>{h.name}</h2>
              <p className="text-xs text-[#9098b1] font-medium">{h.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#f2f3f7] flex items-center justify-center hover:bg-[#e5e7ef] transition-colors">
            <X size={14} className="text-[#9098b1]" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Zona", value: h.zone, color, bg },
              { label: "Tipo", value: h.type, color: "#6366f1", bg: "#eef2ff" },
              { label: "Ocupantes", value: h.occupants === 0 ? "N/A" : `${h.occupants} personas`, color: "#9098b1", bg: "#f8f9fc" },
              { label: "Tarifa", value: h.tariff, color: "#10b981", bg: "#ecfdf5" },
              { label: "Medidor", value: h.meterId, color: "#ff8a1f", bg: "#fff4ea" },
              { label: "Consumo Prom.", value: `${fmt(h.avgConsumption)} kWh/mes`, color: "#9098b1", bg: "#f8f9fc" },
            ].map(item => (
              <div key={item.label} className="rounded-2xl p-3" style={{ background: item.bg }}>
                <p className="text-[11px] text-[#9098b1] font-medium mb-1">{item.label}</p>
                <p className="text-sm font-bold" style={{ color: item.color }}>{item.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl bg-[#f8f9fc] p-3">
            <p className="text-[11px] text-[#9098b1] font-medium mb-1">Dirección</p>
            <p className="text-sm text-[#1a1a2e] font-medium">{h.address}</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#1a1a2e]">Historial de Consumo — 30 días</h3>
              <span className="text-[11px] text-[#9098b1]">kWh diarios</span>
            </div>
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={histData}>
                <defs>
                  <linearGradient id="hgrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f1f7" />
                <XAxis dataKey="day" tick={{ fill: "#9098b1", fontSize: 9 }} interval={6} />
                <YAxis tick={{ fill: "#9098b1", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "white", border: "1px solid #f0f1f7", borderRadius: 12, fontSize: 12 }} />
                <Area type="monotone" dataKey="valor" stroke={color} fill="url(#hgrad)" strokeWidth={2.5} name="kWh" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Households() {
  const [search, setSearch] = useState("");
  const [filterZone, setFilterZone] = useState<Zone | "Todas">("Todas");
  const [filterType, setFilterType] = useState("Todos");
  const [selected, setSelected] = useState<Household | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 12;

  const filtered = households.filter(h => {
    const q = search.toLowerCase();
    const match = h.id.toLowerCase().includes(q) || h.address.toLowerCase().includes(q) || h.name.toLowerCase().includes(q);
    return match && (filterZone === "Todas" || h.zone === filterZone) && (filterType === "Todos" || h.type === filterType);
  });

  const pages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a2e]" style={{ fontFamily: "Nunito, sans-serif" }}>Módulo de Hogares</h1>
        <p className="text-sm text-[#9098b1] mt-0.5">Visualización de hogares sintéticos HSD</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-52 relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9098b1]" />
          <input
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por ID, dirección, nombre…"
            className="w-full bg-white border border-[#e5e7ef] rounded-2xl pl-10 pr-4 py-2.5 text-sm text-[#1a1a2e] placeholder-[#9098b1] focus:outline-none focus:border-[#ff8a1f]"
          />
        </div>
        <select value={filterZone} onChange={e => { setFilterZone(e.target.value as Zone | "Todas"); setPage(1); }}
          className="bg-white border border-[#e5e7ef] rounded-2xl px-4 py-2.5 text-sm text-[#1a1a2e] focus:outline-none focus:border-[#ff8a1f]">
          {["Todas", "Norte", "Centro", "Sur", "Industrial"].map(z => <option key={z}>{z}</option>)}
        </select>
        <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}
          className="bg-white border border-[#e5e7ef] rounded-2xl px-4 py-2.5 text-sm text-[#1a1a2e] focus:outline-none focus:border-[#ff8a1f]">
          {["Todos", "Casa", "Departamento", "Comercio", "Industria"].map(t => <option key={t}>{t}</option>)}
        </select>
        <span className="text-xs text-[#9098b1] font-medium">{filtered.length} registros</span>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {paged.map(h => (
          <button key={h.id} onClick={() => setSelected(h)}
            className="card p-4 text-left hover:shadow-lg transition-all group">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="text-2xl">{typeEmoji[h.type]}</div>
                <div>
                  <p className="text-[11px] text-[#9098b1] font-medium">{h.id}</p>
                  <p className="text-sm font-semibold text-[#1a1a2e]">{h.type}</p>
                </div>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{
                background: zoneBg[h.zone], color: zoneColors[h.zone]
              }}>Zona {h.zone}</span>
            </div>

            <p className="text-[11px] text-[#9098b1] mb-3 truncate">{h.address}</p>

            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Users, val: h.occupants || "—", label: "ocup.", color: "#9098b1" },
                { icon: Tag, val: h.tariff, label: "tarifa", color: "#10b981" },
                { icon: Zap, val: fmt(h.avgConsumption), label: "kWh/mes", color: "#ff8a1f" },
              ].map((it, i) => (
                <div key={i} className="rounded-xl bg-[#f8f9fc] py-2 px-2 text-center">
                  <p className="text-xs font-bold" style={{ color: it.color }}>{it.val}</p>
                  <p className="text-[10px] text-[#9098b1] mt-0.5">{it.label}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#f0f1f7]">
              <span className="text-[11px] text-[#9098b1] font-medium">{h.meterId}</span>
              <ChevronRight size={14} className="text-[#9098b1] group-hover:text-[#ff8a1f] transition-colors" />
            </div>
          </button>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-2">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
          className="px-4 py-2 text-xs font-semibold rounded-full border border-[#e5e7ef] text-[#9098b1] disabled:opacity-40 hover:border-[#ff8a1f] hover:text-[#ff8a1f] transition-colors">
          Anterior
        </button>
        <span className="text-xs text-[#9098b1] font-medium px-2">{page} / {pages}</span>
        <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
          className="px-4 py-2 text-xs font-semibold rounded-full border border-[#e5e7ef] text-[#9098b1] disabled:opacity-40 hover:border-[#ff8a1f] hover:text-[#ff8a1f] transition-colors">
          Siguiente
        </button>
      </div>

      {selected && <HouseholdDetail h={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
