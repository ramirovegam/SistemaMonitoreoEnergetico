import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Polygon, CircleMarker, Tooltip, useMap } from "react-leaflet";
import { Layers, Zap, Wifi, WifiOff, Wrench, AlertTriangle, Search, RefreshCw, Info, Filter, X } from "lucide-react";
import "leaflet/dist/leaflet.css";

// Toluca center
const CENTER: [number, number] = [19.2926, -99.6562];
const ZOOM = 13;

// Zone polygons (approximate Toluca sectors)
const ENERGY_ZONES = [
  {
    id: "Z1", name: "Zona Norte – La Pila", category: "Bajo Consumo",
    consumo: 38450, variacion: -2.4, medidores: 20,
    coords: [[19.320, -99.680], [19.330, -99.650], [19.315, -99.635], [19.305, -99.660]] as [number,number][],
    color: "#10b981",
  },
  {
    id: "Z2", name: "Centro Histórico", category: "Consumo Medio",
    consumo: 42300, variacion: +1.8, medidores: 20,
    coords: [[19.295, -99.665], [19.305, -99.645], [19.290, -99.638], [19.280, -99.658]] as [number,number][],
    color: "#f59e0b",
  },
  {
    id: "Z3", name: "Zona Sur – San Cristóbal", category: "Alto Consumo",
    consumo: 64700, variacion: +8.2, medidores: 20,
    coords: [[19.265, -99.660], [19.275, -99.640], [19.258, -99.632], [19.248, -99.652]] as [number,number][],
    color: "#ff8a1f",
  },
  {
    id: "Z4", name: "Zona Industrial Tollocan", category: "Posible Fraude",
    consumo: 187600, variacion: -12.5, medidores: 20,
    coords: [[19.280, -99.700], [19.295, -99.678], [19.278, -99.665], [19.262, -99.685]] as [number,number][],
    color: "#ef4444",
  },
  {
    id: "Z5", name: "Metepec – Periferia", category: "Sin Información",
    consumo: 0, variacion: 0, medidores: 3,
    coords: [[19.250, -99.608], [19.260, -99.590], [19.242, -99.585], [19.232, -99.602]] as [number,number][],
    color: "#9098b1",
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  "Bajo Consumo": "#10b981",
  "Consumo Medio": "#f59e0b",
  "Alto Consumo": "#ff8a1f",
  "Posible Fraude": "#ef4444",
  "Sin Información": "#9098b1",
};

const CATEGORY_BG: Record<string, string> = {
  "Bajo Consumo": "#ecfdf5",
  "Consumo Medio": "#fffbeb",
  "Alto Consumo": "#fff4ea",
  "Posible Fraude": "#fef2f2",
  "Sin Información": "#f3f4f8",
};

// Synthetic meters with Toluca coords
function generateMeters() {
  const statuses = ["Operativo", "Operativo", "Operativo", "Operativo",
    "Comunicación Intermitente", "Sin Comunicación", "Mantenimiento", "Fuera de Servicio"];
  const statusColors: Record<string, string> = {
    "Operativo": "#10b981",
    "Comunicación Intermitente": "#f59e0b",
    "Sin Comunicación": "#ef4444",
    "Mantenimiento": "#3b82f6",
    "Fuera de Servicio": "#9098b1",
  };

  return Array.from({ length: 80 }, (_, i) => {
    const status = statuses[i % statuses.length];
    const lat = 19.22 + (Math.sin(i * 0.7) + 1) * 0.055;
    const lng = -99.70 + (Math.cos(i * 0.5) + 1) * 0.055;
    return {
      id: `MED-${String(i + 1).padStart(4, "0")}`,
      lat, lng, status,
      color: statusColors[status],
      cliente: `Cliente ${i + 1} - Zona ${["Norte","Centro","Sur","Industrial"][i % 4]}`,
      ultimaLectura: `${(150 + Math.round(Math.sin(i) * 50))} kWh`,
      consumo: `${(180 + Math.round(Math.cos(i) * 60))} kWh/mes`,
    };
  });
}

const METERS = generateMeters();

const METER_STATUS_COLORS: Record<string, { color: string; bg: string; label: string }> = {
  "Operativo": { color: "#10b981", bg: "#ecfdf5", label: "Operativo" },
  "Comunicación Intermitente": { color: "#f59e0b", bg: "#fffbeb", label: "Com. Intermitente" },
  "Sin Comunicación": { color: "#ef4444", bg: "#fef2f2", label: "Sin Comunicación" },
  "Mantenimiento": { color: "#3b82f6", bg: "#eff6ff", label: "Mantenimiento" },
  "Fuera de Servicio": { color: "#9098b1", bg: "#f3f4f8", label: "Fuera de Servicio" },
};

function MapResetter({ view }: { view: string }) {
  const map = useMap();
  useEffect(() => {
    map.setView(CENTER, ZOOM);
  }, [view]);
  return null;
}

function EnergyMap({ filterCat }: { filterCat: string }) {
  const zones = filterCat === "Todas"
    ? ENERGY_ZONES
    : ENERGY_ZONES.filter(z => z.category === filterCat);

  return (
    <>
      {zones.map(zone => (
        <Polygon
          key={zone.id}
          positions={zone.coords}
          pathOptions={{ color: zone.color, fillColor: zone.color, fillOpacity: 0.3, weight: 2 }}
        >
          <Tooltip sticky>
            <div className="text-xs min-w-[200px] p-1">
              <p className="font-bold text-[#1a1a2e] text-sm mb-1">{zone.name}</p>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-2 h-2 rounded-full" style={{ background: zone.color }} />
                <span className="font-semibold" style={{ color: zone.color }}>{zone.category}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                <span className="text-gray-500">Consumo mensual:</span>
                <span className="font-semibold">{zone.consumo > 0 ? `${zone.consumo.toLocaleString("es-MX")} kWh` : "N/D"}</span>
                <span className="text-gray-500">Variación:</span>
                <span className={`font-semibold ${zone.variacion > 0 ? "text-orange-500" : zone.variacion < 0 ? "text-green-500" : "text-gray-400"}`}>
                  {zone.variacion > 0 ? "+" : ""}{zone.variacion}%
                </span>
                <span className="text-gray-500">Medidores:</span>
                <span className="font-semibold">{zone.medidores}</span>
              </div>
            </div>
          </Tooltip>
        </Polygon>
      ))}
    </>
  );
}

function MetersMap({ selectedMeter, setSelectedMeter }: {
  selectedMeter: string | null;
  setSelectedMeter: (id: string | null) => void;
}) {
  return (
    <>
      {METERS.map(m => (
        <CircleMarker
          key={m.id}
          center={[m.lat, m.lng]}
          radius={m.id === selectedMeter ? 10 : 6}
          pathOptions={{
            color: m.color,
            fillColor: m.color,
            fillOpacity: 0.85,
            weight: m.id === selectedMeter ? 3 : 1.5,
          }}
          eventHandlers={{ click: () => setSelectedMeter(m.id === selectedMeter ? null : m.id) }}
        >
          <Tooltip>
            <span className="text-xs font-semibold">{m.id} — {m.status}</span>
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  );
}

function fmt(n: number) { return n.toLocaleString("es-MX"); }

export default function MapModule() {
  const [view, setView] = useState<"categorias" | "medidores">("categorias");
  const [filterCat, setFilterCat] = useState("Todas");
  const [selectedMeter, setSelectedMeter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const selectedMeterData = selectedMeter ? METERS.find(m => m.id === selectedMeter) : null;

  const zoneCounts = {
    "Bajo Consumo": ENERGY_ZONES.filter(z => z.category === "Bajo Consumo").length,
    "Consumo Medio": ENERGY_ZONES.filter(z => z.category === "Consumo Medio").length,
    "Alto Consumo": ENERGY_ZONES.filter(z => z.category === "Alto Consumo").length,
    "Posible Fraude": ENERGY_ZONES.filter(z => z.category === "Posible Fraude").length,
    "Sin Información": ENERGY_ZONES.filter(z => z.category === "Sin Información").length,
  };

  const meterCounts = {
    "Operativo": METERS.filter(m => m.status === "Operativo").length,
    "Comunicación Intermitente": METERS.filter(m => m.status === "Comunicación Intermitente").length,
    "Sin Comunicación": METERS.filter(m => m.status === "Sin Comunicación").length,
    "Mantenimiento": METERS.filter(m => m.status === "Mantenimiento").length,
    "Fuera de Servicio": METERS.filter(m => m.status === "Fuera de Servicio").length,
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header + view switcher */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#1a1a2e]" style={{ fontFamily: "Nunito, sans-serif" }}>
            🗺️ Mapa Inteligente — Toluca
          </h2>
          <p className="text-[11px] text-[#9098b1]">Monitoreo geoespacial en tiempo real</p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f2f3f7] text-[#9098b1] text-xs font-semibold hover:text-[#ff8a1f] transition-colors">
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} /> Actualizar
          </button>
          <div className="flex rounded-full bg-[#f2f3f7] p-1">
            {[
              { key: "categorias" as const, label: "⚡ Categorías Energéticas" },
              { key: "medidores" as const, label: "📍 Estado de Medidores" },
            ].map(v => (
              <button key={v.key} onClick={() => setView(v.key)}
                className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                  view === v.key ? "bg-white text-[#1a1a2e] shadow-sm" : "text-[#9098b1]"
                }`}>
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-4 h-[600px]">
        {/* Map */}
        <div className="flex-1 card overflow-hidden relative">
          {/* Search bar overlay */}
          <div className="absolute top-3 left-3 z-[1000] flex gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9098b1]" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar zona o medidor…"
                className="bg-white rounded-full pl-8 pr-4 py-2 text-xs text-[#1a1a2e] placeholder-[#9098b1] border border-[#e5e7ef] w-56 focus:outline-none focus:border-[#ff8a1f] shadow-md"
              />
            </div>
            {view === "categorias" && (
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                className="bg-white rounded-full px-3 py-2 text-xs text-[#1a1a2e] border border-[#e5e7ef] focus:outline-none focus:border-[#ff8a1f] shadow-md">
                <option>Todas</option>
                {Object.keys(CATEGORY_COLORS).map(c => <option key={c}>{c}</option>)}
              </select>
            )}
          </div>

          {/* Legend overlay */}
          <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-2xl p-3 shadow-lg border border-[#f0f1f7]">
            <p className="text-[10px] font-bold text-[#9098b1] uppercase tracking-wider mb-2">Leyenda</p>
            {view === "categorias" ? (
              <div className="flex flex-col gap-1.5">
                {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
                  <div key={cat} className="flex items-center gap-2 text-[11px]">
                    <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: color, opacity: 0.7 }} />
                    <span className="text-[#1a1a2e] font-medium">{cat}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {Object.entries(METER_STATUS_COLORS).map(([status, cfg]) => (
                  <div key={status} className="flex items-center gap-2 text-[11px]">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                    <span className="text-[#1a1a2e] font-medium">{cfg.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <MapContainer center={CENTER} zoom={ZOOM} style={{ height: "100%", width: "100%" }}
            zoomControl={false}
            className="z-0">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapResetter view={view} />
            {view === "categorias" && <EnergyMap filterCat={filterCat} />}
            {view === "medidores" && (
              <MetersMap selectedMeter={selectedMeter} setSelectedMeter={setSelectedMeter} />
            )}
          </MapContainer>
        </div>

        {/* Side panel */}
        <div className="w-72 flex flex-col gap-3 overflow-y-auto">
          {view === "categorias" ? (
            <>
              <div className="card p-4">
                <p className="text-xs font-bold text-[#1a1a2e] mb-3">Zonas por Clasificación</p>
                <div className="flex flex-col gap-2">
                  {(Object.entries(zoneCounts) as [string, number][]).map(([cat, count]) => (
                    <div key={cat}
                      className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-[#f8f9fc] transition-colors"
                      onClick={() => setFilterCat(f => f === cat ? "Todas" : cat)}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                        style={{ background: CATEGORY_COLORS[cat] }}>
                        {count}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#1a1a2e] leading-tight">{cat}</p>
                        <p className="text-[10px] text-[#9098b1]">{count} zona{count !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-4">
                <p className="text-xs font-bold text-[#1a1a2e] mb-3">Detalle de Zonas</p>
                <div className="flex flex-col gap-2">
                  {ENERGY_ZONES.map(z => (
                    <div key={z.id} className="p-2.5 rounded-xl cursor-pointer transition-all"
                      style={{ background: CATEGORY_BG[z.category] }}
                      onClick={() => setFilterCat(z.category)}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full" style={{ background: z.category === "Sin Información" ? "#9098b1" : CATEGORY_COLORS[z.category] }} />
                        <p className="text-[11px] font-bold text-[#1a1a2e] truncate">{z.name}</p>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span style={{ color: CATEGORY_COLORS[z.category] }} className="font-semibold">{z.category}</span>
                        <span className="text-[#9098b1]">{z.consumo > 0 ? `${(z.consumo/1000).toFixed(1)}k kWh` : "N/D"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="card p-4">
                <p className="text-xs font-bold text-[#1a1a2e] mb-3">Estado de la Red</p>
                <div className="flex flex-col gap-2">
                  {(Object.entries(meterCounts) as [string, number][]).map(([status, count]) => {
                    const cfg = METER_STATUS_COLORS[status];
                    const pct = Math.round((count / METERS.length) * 100);
                    return (
                      <div key={status}>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="font-semibold text-[#1a1a2e]">{cfg.label}</span>
                          <span className="font-bold" style={{ color: cfg.color }}>{count}</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${pct}%`, background: cfg.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 pt-3 border-t border-[#f0f1f7] text-center">
                  <p className="text-xs text-[#9098b1]">Total en red:</p>
                  <p className="text-xl font-bold text-[#1a1a2e]" style={{ fontFamily: "Nunito, sans-serif" }}>{METERS.length} medidores</p>
                </div>
              </div>

              {selectedMeterData ? (
                <div className="card p-4 border-2" style={{ borderColor: selectedMeterData.color }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-[#1a1a2e]">Medidor Seleccionado</p>
                    <button onClick={() => setSelectedMeter(null)}
                      className="w-5 h-5 rounded-full bg-[#f2f3f7] flex items-center justify-center">
                      <X size={10} className="text-[#9098b1]" />
                    </button>
                  </div>
                  <div className="rounded-2xl p-3 mb-3" style={{ background: METER_STATUS_COLORS[selectedMeterData.status]?.bg }}>
                    <p className="text-lg font-bold font-mono" style={{ color: selectedMeterData.color }}>{selectedMeterData.id}</p>
                    <p className="text-[11px] font-semibold mt-0.5" style={{ color: selectedMeterData.color }}>
                      ● {selectedMeterData.status}
                    </p>
                  </div>
                  {[
                    { label: "Cliente / Ubicación", value: selectedMeterData.cliente },
                    { label: "Última lectura", value: selectedMeterData.ultimaLectura },
                    { label: "Consumo actual", value: selectedMeterData.consumo },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between text-xs py-2 border-b border-[#f0f1f7] last:border-0">
                      <span className="text-[#9098b1] font-medium">{item.label}</span>
                      <span className="font-semibold text-[#1a1a2e]">{item.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card p-4 text-center">
                  <div className="text-3xl mb-2">📍</div>
                  <p className="text-xs font-semibold text-[#1a1a2e]">Selecciona un medidor</p>
                  <p className="text-[10px] text-[#9098b1] mt-1">Haz clic sobre un punto en el mapa</p>
                </div>
              )}

              <div className="card p-4">
                <p className="text-xs font-bold text-[#1a1a2e] mb-2">Alertas de Red</p>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-[#fef2f2]">
                    <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
                    <span className="text-[11px] font-semibold text-[#ef4444]">{meterCounts["Sin Comunicación"]} sin comunicación</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-[#fffbeb]">
                    <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                    <span className="text-[11px] font-semibold text-[#f59e0b]">{meterCounts["Comunicación Intermitente"]} intermitentes</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-[#eff6ff]">
                    <span className="w-2 h-2 rounded-full bg-[#3b82f6]" />
                    <span className="text-[11px] font-semibold text-[#3b82f6]">{meterCounts["Mantenimiento"]} en mantenimiento</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
