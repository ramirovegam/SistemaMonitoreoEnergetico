import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemeMode = "light" | "dark" | "auto";
export type Accent = "orange" | "lime" | "cyan" | "violet" | "teal";
export type ResolvedTheme = "light" | "dark";

export const ACCENTS: Array<{
  id: Accent;
  label: string;
  swatch: string;
}> = [
  { id: "orange", label: "Naranja", swatch: "var(--swatch-orange)" },
  { id: "lime", label: "Lima", swatch: "var(--swatch-lime)" },
  { id: "cyan", label: "Cian", swatch: "var(--swatch-cyan)" },
  { id: "violet", label: "Violeta", swatch: "var(--swatch-violet)" },
  { id: "teal", label: "Verde azulado", swatch: "var(--swatch-teal)" },
];

export const THEME_MODES: Array<{
  id: ThemeMode;
  label: string;
  description: string;
}> = [
  { id: "light", label: "Claro", description: "Superficies claras" },
  { id: "dark", label: "Oscuro", description: "Superficies cálidas oscuras" },
  { id: "auto", label: "Auto", description: "Sigue el sistema operativo" },
];

const THEME_KEY = "simet-theme";
const ACCENT_KEY = "simet-accent";

interface ThemeContextValue {
  mode: ThemeMode;
  accent: Accent;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: Accent) => void;
  cycleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readMode(): ThemeMode {
  const value = document.documentElement.dataset.mode;
  return value === "light" || value === "dark" || value === "auto" ? value : "auto";
}

function readAccent(): Accent {
  const value = document.documentElement.dataset.accent;
  return value === "lime" || value === "cyan" || value === "violet" || value === "teal"
    ? value
    : "orange";
}

function getSystemDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readMode);
  const [accent, setAccentState] = useState<Accent>(readAccent);
  const [systemDark, setSystemDark] = useState(getSystemDark);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    setSystemDark(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const resolvedTheme: ResolvedTheme =
    mode === "auto" ? (systemDark ? "dark" : "light") : mode;

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolvedTheme;
    root.dataset.mode = mode;
    root.dataset.accent = accent;
    root.style.colorScheme = resolvedTheme;
  }, [accent, mode, resolvedTheme]);

  const setMode = useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);
    try {
      localStorage.setItem(THEME_KEY, nextMode);
    } catch {
      /* almacenamiento no disponible */
    }
  }, []);

  const setAccent = useCallback((nextAccent: Accent) => {
    setAccentState(nextAccent);
    try {
      localStorage.setItem(ACCENT_KEY, nextAccent);
    } catch {
      /* almacenamiento no disponible */
    }
  }, []);

  const cycleMode = useCallback(() => {
    setModeState((current) => {
      const next: ThemeMode =
        current === "light" ? "dark" : current === "dark" ? "auto" : "light";
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        /* almacenamiento no disponible */
      }
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      accent,
      resolvedTheme,
      setMode,
      setAccent,
      cycleMode,
    }),
    [accent, cycleMode, mode, resolvedTheme, setAccent, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme debe usarse dentro de ThemeProvider");
  }
  return context;
}

