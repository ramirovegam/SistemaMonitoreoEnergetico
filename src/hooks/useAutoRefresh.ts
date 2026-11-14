import { useCallback, useEffect, useRef, useState } from "react";

interface AutoRefreshOptions {
  intervalMs?: number;
  enabled?: boolean;
}

export interface AutoRefreshState {
  lastUpdated: Date | null;
  isRefreshing: boolean;
  isPaused: boolean;
  error: string | null;
  refreshNow: () => void;
  markUpdated: () => void;
}

/**
 * Actualización periódica con pausa en pestaña oculta y backoff exponencial
 * ante errores. El callback debe lanzar un error para activar el backoff.
 */
export function useAutoRefresh(
  onRefresh: () => Promise<unknown> | unknown,
  { intervalMs = 30_000, enabled = true }: AutoRefreshOptions = {},
): AutoRefreshState {
  const callbackRef = useRef(onRefresh);
  const timerRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);
  const failuresRef = useRef(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPaused, setIsPaused] = useState(
    () => typeof document !== "undefined" && document.hidden,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    callbackRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    const onVisibility = () => setIsPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const markUpdated = useCallback(() => {
    setLastUpdated(new Date());
    failuresRef.current = 0;
    setError(null);
  }, []);

  const execute = useCallback(
    async (manual = false) => {
      if (inFlightRef.current || document.hidden || !enabled) return;
      inFlightRef.current = true;
      setIsRefreshing(true);
      try {
        await callbackRef.current();
        setLastUpdated(new Date());
        failuresRef.current = 0;
        setError(null);
      } catch (caught) {
        failuresRef.current = Math.min(failuresRef.current + 1, 4);
        setError(
          caught instanceof Error
            ? caught.message
            : "No se pudo actualizar. Reintentaremos automáticamente.",
        );
      } finally {
        inFlightRef.current = false;
        setIsRefreshing(false);
      }
      const delay = manual
        ? intervalMs
        : Math.min(intervalMs * Math.max(failuresRef.current, 1), 5 * 60_000);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        void execute(false);
      }, delay);
    },
    [enabled, intervalMs],
  );

  useEffect(() => {
    if (!enabled) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      void execute(false);
    }, intervalMs);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [enabled, execute, intervalMs]);

  const wasPausedRef = useRef(isPaused);
  useEffect(() => {
    const wasPaused = wasPausedRef.current;
    wasPausedRef.current = isPaused;
    if (!wasPaused || isPaused || !enabled) return;
    // Al volver a la pestaña se refresca sin esperar el siguiente ciclo.
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      void execute(true);
    }, 400);
  }, [enabled, execute, isPaused]);

  const refreshNow = useCallback(() => {
    void execute(true);
  }, [execute]);

  return {
    lastUpdated,
    isRefreshing,
    isPaused,
    error,
    refreshNow,
    markUpdated,
  };
}

export function useRelativeTime(date: Date | null): string {
  const [label, setLabel] = useState("sin datos");

  useEffect(() => {
    if (!date) {
      setLabel("sin datos");
      return;
    }
    const update = () => {
      const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
      if (seconds < 8) setLabel("ahora");
      else if (seconds < 60) setLabel(`hace ${seconds} s`);
      else if (seconds < 3600) setLabel(`hace ${Math.floor(seconds / 60)} min`);
      else if (seconds < 86_400) setLabel(`hace ${Math.floor(seconds / 3600)} h`);
      else setLabel(`hace ${Math.floor(seconds / 86_400)} d`);
    };
    update();
    const timer = window.setInterval(update, 10_000);
    return () => window.clearInterval(timer);
  }, [date]);

  return label;
}
