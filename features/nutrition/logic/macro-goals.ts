/**
 * Objetivos nutricionales y la distribución de macros que se recomienda para cada uno.
 * Los porcentajes son sobre las calorías diarias; proteínas y carbohidratos aportan 4 kcal/g
 * y las grasas 9 kcal/g. Son referencias generales, no una indicación médica.
 */
export type NutritionGoalKey = "lose" | "maintain" | "gain";

export type NutritionGoal = {
  key: NutritionGoalKey;
  label: string;
  /** Porcentaje de las calorías para proteínas / carbohidratos / grasas (suman 100). */
  split: { protein: number; carbs: number; fat: number };
};

export const NUTRITION_GOALS: NutritionGoal[] = [
  { key: "lose", label: "Perder peso", split: { protein: 35, carbs: 35, fat: 30 } },
  { key: "maintain", label: "Mantener", split: { protein: 25, carbs: 50, fat: 25 } },
  { key: "gain", label: "Ganar masa", split: { protein: 30, carbs: 50, fat: 20 } },
];

export function isNutritionGoalKey(value: unknown): value is NutritionGoalKey {
  return NUTRITION_GOALS.some((goal) => goal.key === value);
}

export function macroTargetsFor(goal: NutritionGoal, calories: number) {
  const safe = Number.isFinite(calories) && calories > 0 ? calories : 0;
  return {
    protein: Math.round(safe * goal.split.protein / 100 / 4),
    carbs: Math.round(safe * goal.split.carbs / 100 / 4),
    fat: Math.round(safe * goal.split.fat / 100 / 9),
  };
}
