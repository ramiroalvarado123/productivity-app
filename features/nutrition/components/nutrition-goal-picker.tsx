"use client";
import { NUTRITION_GOALS, macroTargetsFor } from "@/features/nutrition/logic/macro-goals";
import { useNutritionGoal } from "@/features/nutrition/hooks/use-nutrition-goal";

/** Opciones de objetivo y los gramos de proteínas, carbohidratos y grasas que se recomiendan. */
export function NutritionGoalPicker({ calories }: { calories: number }) {
  const [goalKey, setGoalKey] = useNutritionGoal();
  const goal = NUTRITION_GOALS.find((item) => item.key === goalKey) ?? null;
  const targets = goal && calories > 0 ? macroTargetsFor(goal, calories) : null;
  return <div className="nutrition-goal-picker">
    <div className="nutrition-goal-options" role="radiogroup" aria-label="Objetivo nutricional">
      {NUTRITION_GOALS.map((item) => <button
        key={item.key}
        type="button"
        role="radio"
        aria-checked={goalKey === item.key}
        className={goalKey === item.key ? "is-on" : ""}
        onClick={() => setGoalKey(goalKey === item.key ? null : item.key)}
      >{item.label}</button>)}
    </div>
    {goal && <div className="nutrition-goal-macros">
      {targets ? <>
        <span><b>{targets.protein} g</b>Proteínas</span>
        <span><b>{targets.carbs} g</b>Carbohidratos</span>
        <span><b>{targets.fat} g</b>Grasas</span>
      </> : <small>Definí tus calorías para ver los macros.</small>}
    </div>}
  </div>;
}
