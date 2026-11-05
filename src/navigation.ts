import type { ComponentType } from "react";
import {
  Activity,
  Bell,
  BookOpen,
  CalendarDays,
  DollarSign,
  Home,
  LayoutDashboard,
  LineChart,
  Map,
} from "lucide-react";

export type Page =
  | "dashboard"
  | "zonas"
  | "hogares"
  | "medidores"
  | "analisis-energetico"
  | "historial-lecturas"
  | "calendario-energetico"
  | "alertas"
  | "tarifas";

export type NavGroup = "Operación" | "Análisis" | "Administración";

export interface NavItem {
  key: Page;
  label: string;
  description: string;
  group: NavGroup;
  icon: ComponentType<{ size?: number; className?: string }>;
}

export const NAV_ITEMS: NavItem[] = [
  {
    key: "dashboard",
    label: "Resumen",
    description: "Estado general, consumo del día, mapa y alertas recientes",
    group: "Operación",
    icon: LayoutDashboard,
  },
  {
    key: "zonas",
    label: "Zonas",
    description: "Indicadores territoriales, ranking y estado de medición",
    group: "Operación",
    icon: Map,
  },
  {
    key: "hogares",
    label: "Servicios",
    description: "Servicios registrados, medidores asociados y carga contratada",
    group: "Operación",
    icon: Home,
  },
  {
    key: "medidores",
    label: "Medidores",
    description: "Inventario, estado, calidad de enlace y alertas por medidor",
    group: "Operación",
    icon: Activity,
  },
  {
    key: "alertas",
    label: "Alertas",
    description: "Eventos activos, prioridad, seguimiento y vínculo con medidores",
    group: "Operación",
    icon: Bell,
  },
  {
    key: "analisis-energetico",
    label: "Análisis",
    description: "Curvas horarias, comparación mensual, perfil y mapa de calor",
    group: "Análisis",
    icon: LineChart,
  },
  {
    key: "historial-lecturas",
    label: "Lecturas",
    description: "Historial, calidad del dato, huecos y exportación CSV",
    group: "Análisis",
    icon: BookOpen,
  },
  {
    key: "calendario-energetico",
    label: "Calendario",
    description: "Días festivos, vacacionales, temperatura y factor estacional",
    group: "Análisis",
    icon: CalendarDays,
  },
  {
    key: "tarifas",
    label: "Tarifas",
    description: "Catálogo tarifario, límite DAC y servicios asignados",
    group: "Administración",
    icon: DollarSign,
  },
];

export const NAV_GROUPS: NavGroup[] = ["Operación", "Análisis", "Administración"];

/**
 * Cada página tiene una ruta estable. Se usa hash para que la recarga funcione
 * también en alojamientos estáticos que no reescriben todas las rutas a index.html.
 */
export const PAGE_ROUTES: Record<Page, string> = {
  dashboard: "resumen",
  zonas: "zonas",
  hogares: "servicios",
  medidores: "medidores",
  "analisis-energetico": "analisis",
  "historial-lecturas": "lecturas",
  "calendario-energetico": "calendario",
  alertas: "alertas",
  tarifas: "tarifas",
};

function normalizarRuta(value: string): string {
  return value
    .replace(/^#/, "")
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase();
}

export function pageFromRoute(value: string): Page | null {
  const ruta = normalizarRuta(value);
  const entry = Object.entries(PAGE_ROUTES).find(([, slug]) => slug === ruta);
  return (entry?.[0] as Page | undefined) ?? null;
}

/**
 * Lee primero el hash (recarga segura) y, como compatibilidad, la ruta del
 * pathname. Si no hay coincidencia, la aplicación abre Resumen.
 */
export function getPageFromLocation(location: Pick<Location, "hash" | "pathname">): Page {
  return (
    pageFromRoute(location.hash) ??
    pageFromRoute(location.pathname) ??
    "dashboard"
  );
}

export function routeHash(page: Page): string {
  return `#/${PAGE_ROUTES[page]}`;
}

export function getPageLabel(page: Page): string {
  return NAV_ITEMS.find((item) => item.key === page)?.label ?? "SIMET";
}
