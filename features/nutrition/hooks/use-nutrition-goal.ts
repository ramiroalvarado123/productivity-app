"use client";
import { useCallback, useSyncExternalStore } from "react";
import { isNutritionGoalKey, type NutritionGoalKey } from "@/features/nutrition/logic/macro-goals";

/**
 * El objetivo nutricional elegido (perder peso, ganar masa…) se recuerda en el
 * dispositivo: es una preferencia de visualización y no hace falta en la base.
 * Un evento propio mantiene sincronizados al selector y al resumen del día.
 */
const KEY = "avora.nutritionGoal";
const EVENT = "avora:nutrition-goal";

function read(): NutritionGoalKey | null {
  try {
    const value = window.localStorage.getItem(KEY);
    return isNutritionGoalKey(value) ? value : null;
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useNutritionGoal() {
  const goal = useSyncExternalStore(subscribe, read, () => null);
  const setGoal = useCallback((next: NutritionGoalKey | null) => {
    try {
      if (next) window.localStorage.setItem(KEY, next);
      else window.localStorage.removeItem(KEY);
    } catch {
      // Sin almacenamiento (modo privado): la elección dura mientras no se recargue.
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [goal, setGoal] as const;
}
