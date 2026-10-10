"use client";
import type { ReactNode } from "react";
import type { NutritionValues } from "@/features/nutrition/logic/nutrition-tracker";

export function formatAmount(value: number, places = 0) {
  return Number(value || 0).toLocaleString("es-AR", {
    minimumFractionDigits: Number(value) % 1 === 0 ? 0 : Math.min(places, 1),
    maximumFractionDigits: places,
  });
}

type MacroTargets = { protein: number; carbs: number; fat: number } | null;

/** Resumen del día: calorías contra el objetivo y los tres macros. Va primero en la pantalla. */
export function NutritionDaySummary({ title, children, totals, targetCalories, macroTargets }: {
  title: string;
  /** El selector de día, dentro del resumen para que quede arriba de todo. */
  children: ReactNode;
  totals: NutritionValues;
  targetCalories: number;
  macroTargets: MacroTargets;
}) {
  const over = targetCalories > 0 && totals.calories > targetCalories;
  const macros = [
    { key: "protein", label: "Proteínas", value: totals.protein, target: macroTargets?.protein ?? 0 },
    { key: "fat", label: "Grasas", value: totals.fat, target: macroTargets?.fat ?? 0 },
    { key: "carbs", label: "Carbohidratos", value: totals.carbs, target: macroTargets?.carbs ?? 0 },
  ] as const;
  return <section className="nutrition-day-summary" aria-label="Resumen nutricional del día">
    <div className="nutrition-summary-heading"><div><span>RESUMEN DEL DÍA</span><h3>{title}</h3></div></div>
    {children}
    <div className="nutrition-calorie-main">
      <div><span>Calorías</span><b>{formatAmount(totals.calories)} <small>kcal</small></b></div>
      <div className="nutrition-calorie-remaining">
        <span>{targetCalories ? (over ? "Por encima del objetivo" : "Restantes") : "Objetivo diario"}</span>
        <b>{targetCalories ? formatAmount(Math.abs(targetCalories - totals.calories)) + " kcal" : "Sin definir"}</b>
      </div>
    </div>
    <div className={"nutrition-progress-track" + (over ? " is-over" : "")} role="progressbar" aria-label="Avance de calorías" aria-valuemin={0} aria-valuemax={targetCalories || 100} aria-valuenow={targetCalories ? Math.min(totals.calories, targetCalories) : 0}>
      <i style={{ width: (targetCalories ? Math.min(100, totals.calories / targetCalories * 100) : 0) + "%" }} />
    </div>
    <div className="nutrition-macro-grid">
      {macros.map((macro) => (
        <div className={"nutrition-macro-item " + macro.key} key={macro.key}>
          <div><span>{macro.label}</span><b>{formatAmount(macro.value, 1)}<small> g</small></b></div>
          <div className="nutrition-progress-track" role="progressbar" aria-label={"Avance de " + macro.label} aria-valuemin={0} aria-valuemax={macro.target || 100} aria-valuenow={macro.target ? Math.min(macro.value, macro.target) : 0}>
            <i style={{ width: (macro.target ? Math.min(100, macro.value / macro.target * 100) : 0) + "%" }} />
          </div>
          {macro.target > 0 && <small>de {formatAmount(macro.target, 0)} g</small>}
        </div>
      ))}
    </div>
  </section>;
}
