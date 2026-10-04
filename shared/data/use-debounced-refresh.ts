"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Agrupa varios guardados seguidos en una sola recarga silenciosa.
 * La promesa que devuelve se resuelve cuando esa recarga terminó, para quien
 * necesite esperar el dato nuevo antes de soltar un estado optimista.
 */
export function useDebouncedRefresh(run: () => Promise<unknown>, delayMs: number) {
  const runRef = useRef(run);
  const timerRef = useRef<number | null>(null);
  const waitersRef = useRef<Array<() => void>>([]);

  useEffect(() => { runRef.current = run; }, [run]);
  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  return useCallback(() => new Promise<void>((resolve) => {
    waitersRef.current.push(resolve);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      const waiters = waitersRef.current;
      waitersRef.current = [];
      void Promise.resolve(runRef.current()).finally(() => waiters.forEach((resolve) => resolve()));
    }, delayMs);
  }), [delayMs]);
}
