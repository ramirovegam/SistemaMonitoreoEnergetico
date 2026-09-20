export type Zone = "Norte" | "Centro" | "Sur" | "Industrial";
export type AlertType =
  | "Pico de demanda"
  | "Pérdida de comunicación"
  | "Falla de medición"
  | "Fraude simulado"
  | "Mantenimiento";
export type AlertPriority = "Alta" | "Media" | "Baja";
export type AlertStatus = "Activa" | "Resuelta" | "En revisión";
export type MeterStatus = "Activo" | "Inactivo" | "Mantenimiento" | "Falla";
export type CommunicationQuality = "Excelente" | "Buena" | "Regular" | "Mala";
export type HousingType = "Casa" | "Departamento" | "Comercio" | "Industria";
export type Tariff = "DAC" | "1C" | "2" | "3" | "OM";

export interface Household {
  id: string;
  name: string;
  zone: Zone;
  type: HousingType;
  occupants: number;
  tariff: Tariff;
  meterId: string;
  address: string;
  avgConsumption: number;
  consumption30d: number[];
}

export interface Meter {
  id: string;
  householdId: string;
  zone: Zone;
  status: MeterStatus;
  installDate: string;
  lastReading: number;
  lastReadingDate: string;
  communicationQuality: CommunicationQuality;
  history: { date: string; value: number }[];
  model: string;
  firmware: string;
}

export interface Alert {
  id: string;
  type: AlertType;
  priority: AlertPriority;
  status: AlertStatus;
  detectedAt: string;
  zone: Zone;
  meterId: string;
  description: string;
  resolvedAt?: string;
}

export interface ZoneData {
  name: Zone;
  totalConsumption: number;
  avgConsumption: number;
  households: number;
  alerts: number;
  color: string;
  hourlyProfile: number[];
}

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const rand = rng(42);
const r = () => rand();

function randInt(min: number, max: number) {
  return Math.floor(r() * (max - min + 1)) + min;
}
function choice<T>(arr: T[]): T {
  return arr[Math.floor(r() * arr.length)];
}
function normal(mean: number, std: number) {
  const u = r();
  const v = r();
  return mean + std * Math.sqrt(-2 * Math.log(u + 0.001)) * Math.cos(2 * Math.PI * v);
}

const zones: Zone[] = ["Norte", "Centro", "Sur", "Industrial"];
const housingTypes: HousingType[] = ["Casa", "Departamento", "Comercio", "Industria"];
const tariffs: Tariff[] = ["DAC", "1C", "2", "3", "OM"];
const meterModels = ["EDMI Mk7C", "Landis+Gyr E350", "Itron CF55", "L&G ZMG405", "Honeywell 780"];
const streets = [
  "Av. Tollocan", "Blvd. Miguel Alemán", "Paseo Tollocan", "Av. Alfredo del Mazo",
  "Calle Morelos", "Av. Independencia", "Blvd. Aeropuerto", "Calle Hidalgo",
];

function dateOffset(days: number): string {
  const d = new Date("2026-09-09");
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

export const households: Household[] = Array.from({ length: 80 }, (_, i) => {
  const zone = zones[i % 4];
  const type = zone === "Industrial" ? "Industria" : choice(housingTypes.slice(0, 3));
  const occupants = type === "Industria" ? 0 : randInt(1, 6);
  const tariff = zone === "Industrial" ? "OM" : choice(tariffs.slice(0, 4));
  const avgConsumption =
    zone === "Industrial" ? normal(2800, 400) :
    type === "Comercio" ? normal(450, 80) :
    normal(180, 40);

  return {
    id: `HOG-${String(i + 1).padStart(4, "0")}`,
    name: `${choice(["Familia", "Hogar", "Inmueble", "Unidad"])} ${i + 1}`,
    zone,
    type,
    occupants,
    tariff,
    meterId: `MED-${String(i + 1).padStart(4, "0")}`,
    address: `${choice(streets)} ${randInt(100, 999)}, ${zone === "Norte" ? "Col. La Pila" : zone === "Centro" ? "Centro Histórico" : zone === "Sur" ? "Col. San Cristóbal" : "Zona Industrial"}`,
    avgConsumption: Math.max(50, Math.round(avgConsumption)),
    consumption30d: Array.from({ length: 30 }, () => Math.max(30, Math.round(normal(avgConsumption, avgConsumption * 0.12)))),
  };
});

const meterStatuses: MeterStatus[] = ["Activo", "Activo", "Activo", "Activo", "Inactivo", "Mantenimiento", "Falla"];
const commQualities: CommunicationQuality[] = ["Excelente", "Buena", "Regular", "Mala"];

export const meters: Meter[] = households.map((h, i) => {
  const installDays = randInt(180, 1800);
  const status = choice(meterStatuses);
  const lastVal = Math.round(normal(h.avgConsumption, h.avgConsumption * 0.1));

  return {
    id: h.meterId,
    householdId: h.id,
    zone: h.zone,
    status,
    installDate: dateOffset(installDays),
    lastReading: Math.max(0, lastVal),
    lastReadingDate: dateOffset(randInt(0, 2)),
    communicationQuality: status === "Falla" || status === "Inactivo" ? "Mala" : choice(commQualities),
    model: meterModels[i % meterModels.length],
    firmware: `v${randInt(2, 4)}.${randInt(0, 9)}.${randInt(0, 9)}`,
    history: Array.from({ length: 30 }, (_, d) => ({
      date: dateOffset(29 - d),
      value: Math.max(0, Math.round(normal(h.avgConsumption, h.avgConsumption * 0.15))),
    })),
  };
});

const alertTypes: AlertType[] = [
  "Pico de demanda", "Pérdida de comunicación", "Falla de medición",
  "Fraude simulado", "Mantenimiento",
];
const alertStatuses: AlertStatus[] = ["Activa", "Activa", "En revisión", "Resuelta"];
const alertPriorities: AlertPriority[] = ["Alta", "Media", "Baja"];

const alertDescriptions: Record<AlertType, string[]> = {
  "Pico de demanda": ["Consumo supera 3σ del promedio histórico", "Demanda excede límite tarifario en 45%", "Spike detectado a las 19:30 hrs"],
  "Pérdida de comunicación": ["Sin respuesta del medidor por >4 horas", "Timeout de comunicación RF", "Medidor sin heartbeat desde ayer"],
  "Falla de medición": ["Lectura de 0 kWh con carga conectada", "Pulsos inconsistentes detectados", "Diferencia >20% entre lecturas"],
  "Fraude simulado": ["Consumo inverso detectado", "Bypass de medidor sospechoso", "Patrón de consumo anómalo por 7 días"],
  "Mantenimiento": ["Batería interna <15%", "Firmware desactualizado", "Revisión programada pendiente"],
};

export const alerts: Alert[] = Array.from({ length: 35 }, (_, i) => {
  const type = choice(alertTypes);
  const status = choice(alertStatuses);
  const priority: AlertPriority =
    type === "Fraude simulado" ? "Alta" :
    type === "Pico de demanda" ? choice(["Alta", "Media"]) :
    type === "Mantenimiento" ? "Baja" :
    choice(alertPriorities);

  const detectedDays = randInt(0, 30);
  return {
    id: `ALT-${String(i + 1).padStart(4, "0")}`,
    type,
    priority,
    status,
    detectedAt: dateOffset(detectedDays),
    zone: choice(zones),
    meterId: `MED-${String(randInt(1, 80)).padStart(4, "0")}`,
    description: choice(alertDescriptions[type]),
    resolvedAt: status === "Resuelta" ? dateOffset(randInt(0, detectedDays)) : undefined,
  };
});

// Zone summaries
export const zoneData: ZoneData[] = [
  {
    name: "Norte",
    totalConsumption: 38450,
    avgConsumption: 192,
    households: 20,
    alerts: alerts.filter(a => a.zone === "Norte").length,
    color: "#00c8ff",
    hourlyProfile: [12, 10, 9, 8, 9, 14, 22, 35, 38, 36, 34, 33, 35, 33, 32, 34, 40, 48, 52, 50, 42, 35, 25, 16],
  },
  {
    name: "Centro",
    totalConsumption: 42300,
    avgConsumption: 211,
    households: 20,
    alerts: alerts.filter(a => a.zone === "Centro").length,
    color: "#3b82f6",
    hourlyProfile: [8, 7, 7, 6, 8, 18, 32, 45, 48, 46, 45, 47, 49, 48, 46, 45, 46, 44, 38, 32, 25, 18, 12, 9],
  },
  {
    name: "Sur",
    totalConsumption: 34700,
    avgConsumption: 174,
    households: 20,
    alerts: alerts.filter(a => a.zone === "Sur").length,
    color: "#8b5cf6",
    hourlyProfile: [10, 9, 8, 7, 8, 12, 20, 30, 32, 30, 29, 28, 30, 29, 28, 30, 38, 46, 50, 48, 40, 32, 22, 14],
  },
  {
    name: "Industrial",
    totalConsumption: 187600,
    avgConsumption: 2345,
    households: 20,
    alerts: alerts.filter(a => a.zone === "Industrial").length,
    color: "#f59e0b",
    hourlyProfile: [30, 28, 25, 22, 25, 45, 75, 92, 98, 100, 99, 97, 95, 93, 96, 98, 94, 80, 60, 45, 38, 35, 32, 30],
  },
];

// Monthly consumption for analytics
export const monthlyData = [
  { month: "Mar", Norte: 35200, Centro: 39800, Sur: 31400, Industrial: 172000 },
  { month: "Abr", Norte: 36100, Centro: 40200, Sur: 32100, Industrial: 178000 },
  { month: "May", Norte: 37800, Centro: 41500, Sur: 33200, Industrial: 181000 },
  { month: "Jun", Norte: 41200, Centro: 44100, Sur: 36500, Industrial: 195000 },
  { month: "Jul", Norte: 43500, Centro: 46300, Sur: 38900, Industrial: 201000 },
  { month: "Ago", Norte: 42100, Centro: 45000, Sur: 37200, Industrial: 198000 },
  { month: "Sep", Norte: 38450, Centro: 42300, Sur: 34700, Industrial: 187600 },
];

export const dailyData = Array.from({ length: 30 }, (_, i) => ({
  day: dateOffset(29 - i),
  total: randInt(270000, 310000),
  anomalies: randInt(0, 5),
}));

export const missingReadings = [
  { zone: "Norte", pct: 3.2 },
  { zone: "Centro", pct: 2.1 },
  { zone: "Sur", pct: 5.4 },
  { zone: "Industrial", pct: 1.8 },
];

// Summary stats
export const summaryStats = {
  totalConsumption: 303050,
  monitoredHouseholds: 80,
  activeMeters: meters.filter(m => m.status === "Activo").length,
  activeAlerts: alerts.filter(a => a.status === "Activa" || a.status === "En revisión").length,
  todayReadings: randInt(72, 78),
  avgConsumptionByZone: 756,
};
