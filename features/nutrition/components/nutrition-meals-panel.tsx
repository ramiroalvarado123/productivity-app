"use client";

import { useMemo, useState } from "react";
import { useWorkspace } from "@/features/app-shell/workspace";
import { AiMealRegister } from "@/features/nutrition/components/ai-meal-register";
import { FoodPicker } from "@/features/nutrition/components/food-picker";
import { NutritionDaySummary, formatAmount } from "@/features/nutrition/components/nutrition-day-summary";
import { useNutritionGoal } from "@/features/nutrition/hooks/use-nutrition-goal";
import { NUTRITION_GOALS, macroTargetsFor } from "@/features/nutrition/logic/macro-goals";
import { calculateMealNutrition, groupMealsByMoment } from "@/features/nutrition/logic/nutrition-tracker";
import { DayStrip } from "@/shared/ui/day-strip";

const MEAL_MOMENTS = ["Desayuno", "Almuerzo", "Merienda", "Cena", "Colación"] as const;
type RegisterMode = "manual" | "ai";

/** Alimentación del día: resumen arriba, después registrar (a mano o con IA) y los registros. */
export function NutritionMealsPanel() {
  const { data, today, mealEntryDate, setMealEntryDate, setEstimate, historicalScore, entryDayLabel, dietTargetCalories, savedDietPlan, save } = useWorkspace();
  const [moment, setMoment] = useState<string>(MEAL_MOMENTS[0]);
  const [mode, setMode] = useState<RegisterMode>("manual");
  // Los registros se ven abiertos: lo que cargaste tiene que aparecer apenas lo guardás.
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [goalKey] = useNutritionGoal();

  const mealsForDay = useMemo(() => data.mealHistory.filter((meal) => meal.mealDate === mealEntryDate), [data.mealHistory, mealEntryDate]);
  const totals = useMemo(() => calculateMealNutrition(mealsForDay), [mealsForDay]);
  const groups = useMemo(() => groupMealsByMoment(mealsForDay), [mealsForDay]);

  // Macros objetivo: primero lo que eligió la persona, después su plan guardado y, si no hay nada, una referencia general.
  const goal = NUTRITION_GOALS.find((item) => item.key === goalKey);
  const plan = savedDietPlan?.macros;
  const macroTargets = goal && dietTargetCalories > 0
    ? macroTargetsFor(goal, dietTargetCalories)
    : plan && plan.proteinGrams > 0 && plan.carbsGrams > 0 && plan.fatGrams > 0
      ? { protein: plan.proteinGrams, carbs: plan.carbsGrams, fat: plan.fatGrams }
      : dietTargetCalories > 0
        ? macroTargetsFor({ key: "maintain", label: "", split: { protein: 25, carbs: 45, fat: 30 } }, dietTargetCalories)
        : null;

  return <article className="panel section-panel nutrition-meal-panel">
    <NutritionDaySummary title={entryDayLabel(mealEntryDate)} totals={totals} targetCalories={dietTargetCalories} macroTargets={macroTargets}>
      <DayStrip
        label="Elegí el día de comidas que querés ver"
        value={mealEntryDate}
        today={today}
        onChange={(date) => { setMealEntryDate(date); setEstimate(null); }}
        markedDates={new Set(data.mealHistory.map((meal) => meal.mealDate))}
      />
      {historicalScore(mealEntryDate)}
    </NutritionDaySummary>

    <section className="nutrition-register" aria-label="Registrar una comida">
      <div className="nutrition-moments" role="radiogroup" aria-label="Momento del día">
        {MEAL_MOMENTS.map((item) => <button key={item} type="button" role="radio" aria-checked={moment === item} className={moment === item ? "is-on" : ""} onClick={() => setMoment(item)}>{item}</button>)}
      </div>
      <div className="nutrition-mode" role="tablist" aria-label="Cómo registrar">
        <button type="button" role="tab" aria-selected={mode === "manual"} className={mode === "manual" ? "is-on" : ""} onClick={() => setMode("manual")}>A mano</button>
        <button type="button" role="tab" aria-selected={mode === "ai"} className={mode === "ai" ? "is-on" : ""} onClick={() => setMode("ai")}>✦ Con IA</button>
      </div>
      {mode === "manual" ? <FoodPicker moment={moment} date={mealEntryDate} /> : <AiMealRegister moment={moment} date={mealEntryDate} />}
    </section>

    <section className="nutrition-meal-log" aria-label="Comidas registradas">
      <div className="nutrition-subheading"><h3>Registros</h3></div>
      {groups.length ? groups.map((group) => {
        const isOpen = !collapsed.includes(group.name);
        return <div className="nutrition-meal-group" key={group.name}>
          <button type="button" className="nutrition-meal-group-toggle" aria-expanded={isOpen} onClick={() => setCollapsed((current) => isOpen ? [...current, group.name] : current.filter((name) => name !== group.name))}>
            <span><b>{group.name}</b><small>{group.meals.length}</small></span>
            <strong>≈ {formatAmount(group.calories)} kcal</strong><i aria-hidden="true">{isOpen ? "−" : "+"}</i>
          </button>
          {isOpen && <div className="nutrition-meal-group-details">
            {group.meals.map((meal) => <div className="nutrition-meal-detail-row" key={meal.id}>
              <div><b>{meal.detail || group.name}</b><small>≈ {formatAmount(meal.calories)} kcal · P {formatAmount(meal.protein, 1)} / C {formatAmount(meal.carbs, 1)} / G {formatAmount(meal.fat, 1)} g</small></div>
              <button type="button" className="nutrition-delete-meal" aria-label={"Eliminar registro de " + group.name} onClick={() => void save({ action: "delete_meal", id: meal.id })}>Eliminar</button>
            </div>)}
          </div>}
        </div>;
      }) : <p className="nutrition-meal-empty">Todavía no cargaste comidas {mealEntryDate === today ? "hoy" : "este día"}.</p>}
    </section>
  </article>;
}
