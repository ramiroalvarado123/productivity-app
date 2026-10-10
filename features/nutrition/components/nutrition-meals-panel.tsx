"use client";

import Image from "next/image";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { useWorkspace } from "@/features/app-shell/workspace";
import { FOOD_CATEGORIES, FOOD_LIBRARY } from "@/features/nutrition/logic/food-library";
import { calculateFoodNutrition, calculateMealNutrition, groupMealsByMoment, normalizeFoodSearch } from "@/features/nutrition/logic/nutrition-tracker";
import type { FoodSelection } from "@/features/nutrition/logic/nutrition-tracker";
import { LockedFeature } from "@/features/pro/components/locked-feature";
import { SaveButtonContent } from "@/shared/ui/save-button";
import { DayStrip } from "@/shared/ui/day-strip";

const MEAL_MOMENTS = ["Desayuno", "Media mañana", "Almuerzo", "Merienda", "Cena", "Colación nocturna", "Otro"] as const;
type MealMoment = typeof MEAL_MOMENTS[number];

function formatAmount(value: number, places = 0) {
  return Number(value || 0).toLocaleString("es-AR", {
    minimumFractionDigits: Number(value) % 1 === 0 ? 0 : Math.min(places, 1),
    maximumFractionDigits: places,
  });
}

export function NutritionMealsPanel() {
  const workspace = useWorkspace();
  const {
    data,
    today,
    mealEntryDate,
    setMealEntryDate,
    aiDescription,
    setAiDescription,
    mealPhoto,
    setMealPhoto,
    photoPreview,
    setPhotoPreview,
    estimating,
    estimate,
    setEstimate,
    selectMealPhoto,
    estimateMeal,
    historicalScore,
    entryDayLabel,
    isPro,
    openPro,
    dietTargetCalories,
    savedDietPlan,
    saving,
    save,
    savePhase,
  } = workspace;
  const [mealMoment, setMealMoment] = useState<MealMoment>("Otro");
  const [customMoment, setCustomMoment] = useState("Comida");
  const [foodSearch, setFoodSearch] = useState("");
  const [foodPortions, setFoodPortions] = useState<Record<string, number>>({});
  const [expandedMoments, setExpandedMoments] = useState<string[]>([]);
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const manualDetailsRef = useRef<HTMLDetailsElement>(null);

  const mealsForDay = useMemo(
    () => data.mealHistory.filter((meal) => meal.mealDate === mealEntryDate),
    [data.mealHistory, mealEntryDate],
  );
  const dayTotals = useMemo(() => calculateMealNutrition(mealsForDay), [mealsForDay]);
  const mealGroups = useMemo(() => groupMealsByMoment(mealsForDay), [mealsForDay]);
  const mealMomentName = mealMoment === "Otro" ? customMoment.trim() || "Otro" : mealMoment;
  const selectedFoods: FoodSelection[] = useMemo(
    () => FOOD_LIBRARY.flatMap((food) => {
      const portions = foodPortions[food.id] ?? 0;
      return portions > 0 ? [{ food, portions }] : [];
    }),
    [foodPortions],
  );
  const selectionTotals = useMemo(() => calculateFoodNutrition(selectedFoods), [selectedFoods]);
  const searchTerm = normalizeFoodSearch(foodSearch);
  const macroPlan = savedDietPlan?.macros;
  const macroTargets = macroPlan && macroPlan.proteinGrams > 0 && macroPlan.carbsGrams > 0 && macroPlan.fatGrams > 0
    ? { protein: macroPlan.proteinGrams, carbs: macroPlan.carbsGrams, fat: macroPlan.fatGrams, source: "Según tu plan guardado" }
    : dietTargetCalories > 0
      ? {
          protein: Math.round(dietTargetCalories * 0.25 / 4),
          carbs: Math.round(dietTargetCalories * 0.45 / 4),
          fat: Math.round(dietTargetCalories * 0.3 / 9),
          source: "Metas estimadas a partir de tu objetivo calórico",
        }
      : null;

  function updateEstimateNumber(field: "estimatedCalories" | "protein" | "carbs" | "fat", value: string) {
    if (!estimate) return;
    setEstimate({ ...estimate, [field]: Math.max(0, Number(value) || 0) });
  }

  async function saveAiEstimate() {
    if (!estimate) return;
    const detail = [estimate.mealName.trim(), estimate.detail.trim()].filter(Boolean).join(" — ");
    const saved = await save({
      action: "add_meal",
      date: mealEntryDate,
      name: mealMomentName,
      detail,
      calories: estimate.estimatedCalories,
      protein: estimate.protein,
      carbs: estimate.carbs,
      fat: estimate.fat,
    });
    if (!saved) return;
    setEstimate(null);
    setAiDescription("");
    setMealPhoto(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview("");
  }

  function changeFoodPortions(foodId: string, increase: boolean) {
    setFoodPortions((current) => {
      const previous = current[foodId] ?? 0;
      const next = increase ? (previous ? Math.round((previous + 0.25) * 100) / 100 : 1) : Math.max(0, Math.round((previous - 0.25) * 100) / 100);
      const updated = { ...current };
      if (next <= 0) delete updated[foodId];
      else updated[foodId] = next;
      return updated;
    });
  }

  async function addSelectedFoods() {
    if (!selectedFoods.length) return;
    const details = selectedFoods.map(({ food, portions }) => formatAmount(portions, 2) + " × " + food.name + " (" + food.portion + ")").join(" · ");
    const saved = await save({
      action: "add_meal",
      date: mealEntryDate,
      name: mealMomentName,
      detail: details,
      calories: selectionTotals.calories,
      protein: selectionTotals.protein,
      carbs: selectionTotals.carbs,
      fat: selectionTotals.fat,
    });
    if (saved) setFoodPortions({});
  }

  function submitManualMeal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    void save({
      action: "add_meal",
      date: mealEntryDate,
      name: mealMomentName,
      detail: String(values.get("detail") || "").trim(),
      calories: values.get("calories"),
      protein: values.get("protein"),
      carbs: values.get("carbs"),
      fat: values.get("fat"),
    }).then((saved) => { if (saved) form.reset(); });
  }

  function toggleMoment(name: string) {
    setExpandedMoments((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);
  }

  function setOpenCategory(category: string, isOpen: boolean) {
    setOpenCategories((current) => {
      const updated = new Set(current);
      if (isOpen) updated.add(category);
      else updated.delete(category);
      return updated;
    });
  }

  function renderFoodCategory(category: string) {
    const foods = FOOD_LIBRARY.filter((food) => food.category === category && (
      !searchTerm || normalizeFoodSearch([food.name, food.portion, ...(food.keywords ?? [])].join(" ")).includes(searchTerm)
    ));
    if (!foods.length) return null;
    return (
      <details
        className="nutrition-food-category"
        key={category}
        open={Boolean(searchTerm) || openCategories.has(category) || undefined}
        onToggle={(event) => {
          if (searchTerm) return;
          const isOpen = (event.currentTarget as HTMLDetailsElement).open;
          setOpenCategory(category, isOpen);
        }}
      >
        <summary><span>{category}</span><small>{foods.length} alimentos</small></summary>
        <div className="nutrition-food-options">
          {foods.map((food) => {
            const portions = foodPortions[food.id] ?? 0;
            return (
              <div className="nutrition-food-option" key={food.id}>
                <div className="nutrition-food-option-copy">
                  <b>{food.name}</b>
                  <small>{food.portion} · ≈ {food.calories} kcal · P {formatAmount(food.protein, 1)} / C {formatAmount(food.carbs, 1)} / G {formatAmount(food.fat, 1)} g</small>
                </div>
                <div className="nutrition-food-portion">
                  <button type="button" aria-label={"Quitar porción de " + food.name} onClick={() => changeFoodPortions(food.id, false)} disabled={!portions}>−</button>
                  <span>{portions ? formatAmount(portions, 2) + "×" : "—"}</span>
                  <button type="button" aria-label={"Agregar porción de " + food.name} onClick={() => changeFoodPortions(food.id, true)}>+</button>
                </div>
              </div>
            );
          })}
        </div>
      </details>
    );
  }

  return (
    <article className="panel section-panel nutrition-meal-panel">
      <div className="panel-heading">
        <div><p>ENERGÍA DE {entryDayLabel(mealEntryDate)}</p><h2>Comidas</h2></div>
      </div>
      <DayStrip
        label="Elegí el día de comidas que querés registrar"
        value={mealEntryDate}
        today={today}
        onChange={(date) => { setMealEntryDate(date); setEstimate(null); }}
        markedDates={new Set(data.mealHistory.map((meal) => meal.mealDate))}
      />
      {historicalScore(mealEntryDate)}

      <div className="nutrition-moment-control">
        <label>Momento de comida
          <select value={mealMoment} onChange={(event) => setMealMoment(event.target.value as MealMoment)}>
            {MEAL_MOMENTS.map((moment) => <option value={moment} key={moment}>{moment}</option>)}
          </select>
        </label>
        {mealMoment === "Otro" && <label>Nombre personalizado
          <input value={customMoment} onChange={(event) => setCustomMoment(event.target.value)} placeholder="Ej. Pre entrenamiento" maxLength={40} />
        </label>}
      </div>

      {isPro ? (
        <div className="ai-meal-box nutrition-ai-meal-box">
          <div className="ai-meal-title"><span>✦</span><div><b>Registro con IA</b><small>Estimá los valores y revisalos antes de guardar.</small></div></div>
          <textarea value={aiDescription} onChange={(event) => setAiDescription(event.target.value)} placeholder="Ej. milanesa con puré, porción mediana…" aria-label="Describí la comida" />
          <div className="ai-photo-row">
            <label className="photo-button">📷 {mealPhoto ? "Cambiar foto" : "Sacar o subir foto"}
              <input type="file" accept="image/*" capture="environment" onChange={(event) => void selectMealPhoto(event.target.files?.[0])} />
            </label>
            {photoPreview && <div className="photo-preview"><Image src={photoPreview} alt="Comida a analizar" width={38} height={38} unoptimized /><button type="button" aria-label="Quitar foto" onClick={() => { URL.revokeObjectURL(photoPreview); setPhotoPreview(""); setMealPhoto(null); }}>×</button></div>}
            <button type="button" className="analyze-button" disabled={estimating || (!mealPhoto && !aiDescription.trim())} onClick={() => void estimateMeal()}>{estimating ? "Analizando…" : "Registrar comida con IA"}</button>
          </div>
          {estimate && <div className="estimate-result nutrition-estimate-result">
            <div className="estimate-head">
              <div><span>ESTIMACIÓN PARA REVISAR</span><input aria-label="Nombre estimado de la comida" value={estimate.mealName} onChange={(event) => setEstimate({ ...estimate, mealName: event.target.value })} /></div>
              <label><input aria-label="Calorías estimadas" type="number" min="0" step="1" value={estimate.estimatedCalories} onChange={(event) => updateEstimateNumber("estimatedCalories", event.target.value)} /><small>kcal</small></label>
            </div>
            <input className="estimate-detail" aria-label="Detalle estimado" value={estimate.detail} onChange={(event) => setEstimate({ ...estimate, detail: event.target.value })} />
            <div className="nutrition-estimate-macros">
              <label>Proteínas (g)<input type="number" min="0" step="1" value={estimate.protein} onChange={(event) => updateEstimateNumber("protein", event.target.value)} /></label>
              <label>Carbohidratos (g)<input type="number" min="0" step="1" value={estimate.carbs} onChange={(event) => updateEstimateNumber("carbs", event.target.value)} /></label>
              <label>Grasas (g)<input type="number" min="0" step="1" value={estimate.fat} onChange={(event) => updateEstimateNumber("fat", event.target.value)} /></label>
            </div>
            <p>Valores aproximados: revisalos antes de guardar. Rango probable: {estimate.minimumCalories}–{estimate.maximumCalories} kcal. {estimate.caveat}</p>
            <button type="button" className="confirm-estimate" disabled={saving} onClick={() => void saveAiEstimate()}><SaveButtonContent label="Confirmar y guardar" phase={savePhase("add_meal")} /></button>
          </div>}
        </div>
      ) : (
        <LockedFeature title="Registro de comidas con IA" note="Estimá calorías y macros con texto o una foto. El catálogo de alimentos está disponible gratis." onOpen={openPro}>
          <div className="ai-meal-box nutrition-ai-meal-box"><div className="ai-meal-title"><span>✦</span><div><b>Registro con IA</b><small>Escribí qué comiste o mostralo con una foto.</small></div></div><span className="analyze-button">Registrar comida con IA</span></div>
        </LockedFeature>
      )}

      <section className="nutrition-day-summary" aria-label="Resumen nutricional del día">
        <div className="nutrition-summary-heading"><div><span>RESUMEN DEL DÍA</span><h3>{entryDayLabel(mealEntryDate)}</h3></div><small>Estimaciones para revisar</small></div>
        <div className="nutrition-calorie-main">
          <div><span>Calorías incorporadas</span><b>{formatAmount(dayTotals.calories)} <small>kcal</small></b></div>
          <div className="nutrition-calorie-remaining">
            <span>{dietTargetCalories ? dayTotals.calories <= dietTargetCalories ? "Restantes del objetivo" : "Por encima del objetivo" : "Objetivo diario"}</span>
            <b>{dietTargetCalories ? formatAmount(Math.abs(dietTargetCalories - dayTotals.calories)) + " kcal" : "Sin definir"}</b>
          </div>
        </div>
        <div className="nutrition-progress-track" role="progressbar" aria-label="Avance de calorías" aria-valuemin={0} aria-valuemax={dietTargetCalories || 100} aria-valuenow={dietTargetCalories ? Math.min(dayTotals.calories, dietTargetCalories) : 0}>
          <i style={{ width: (dietTargetCalories ? Math.min(100, dayTotals.calories / dietTargetCalories * 100) : 0) + "%" }} />
        </div>
        {dietTargetCalories ? <small className="nutrition-summary-caption">Meta diaria: {formatAmount(dietTargetCalories)} kcal</small> : <small className="nutrition-summary-caption">Guardá un objetivo de calorías para ver el avance.</small>}
        <div className="nutrition-macro-grid">
          {([
            { key: "protein", label: "Proteínas", value: dayTotals.protein, target: macroTargets?.protein ?? 0, color: "protein" },
            { key: "fat", label: "Grasas", value: dayTotals.fat, target: macroTargets?.fat ?? 0, color: "fat" },
            { key: "carbs", label: "Carbohidratos", value: dayTotals.carbs, target: macroTargets?.carbs ?? 0, color: "carbs" },
          ] as const).map((macro) => (
            <div className={"nutrition-macro-item " + macro.color} key={macro.key}>
              <div><span>{macro.label}</span><b>{formatAmount(macro.value, 1)}<small> g</small></b></div>
              <div className="nutrition-progress-track" role="progressbar" aria-label={"Avance de " + macro.label} aria-valuemin={0} aria-valuemax={macro.target || 100} aria-valuenow={macro.target ? Math.min(macro.value, macro.target) : 0}>
                <i style={{ width: (macro.target ? Math.min(100, macro.value / macro.target * 100) : 0) + "%" }} />
              </div>
              <small>{macroTargets ? "de " + formatAmount(macro.target, 1) + " g" : "Meta sin configurar"}</small>
            </div>
          ))}
        </div>
        {macroTargets && <small className="nutrition-summary-caption">{macroTargets.source}</small>}
      </section>

      <section className="nutrition-meal-log" aria-label="Comidas registradas">
        <div className="nutrition-subheading"><h3>Comidas registradas</h3><small>{mealGroups.length} {mealGroups.length === 1 ? "momento" : "momentos"}</small></div>
        {mealGroups.length ? mealGroups.map((group) => {
          const expanded = expandedMoments.includes(group.name);
          return (
            <div className="nutrition-meal-group" key={group.name}>
              <button type="button" className="nutrition-meal-group-toggle" aria-expanded={expanded} onClick={() => toggleMoment(group.name)}>
                <span><b>{group.name}</b><small>{group.meals.length} {group.meals.length === 1 ? "registro" : "registros"}</small></span>
                <strong>≈ {formatAmount(group.calories)} kcal</strong><i aria-hidden="true">{expanded ? "−" : "+"}</i>
              </button>
              {expanded && <div className="nutrition-meal-group-details">
                {group.meals.map((meal) => (
                  <div className="nutrition-meal-detail-row" key={meal.id}>
                    <div><b>{meal.detail || "Detalle sin descripción"}</b><small>≈ {formatAmount(meal.calories)} kcal · P {formatAmount(meal.protein, 1)} / G {formatAmount(meal.fat, 1)} / C {formatAmount(meal.carbs, 1)} g</small></div>
                    <button type="button" className="nutrition-delete-meal" aria-label={"Eliminar registro de " + group.name} onClick={() => void save({ action: "delete_meal", id: meal.id })}>Eliminar</button>
                  </div>
                ))}
              </div>}
            </div>
          );
        }) : <p className="nutrition-meal-empty">Todavía no cargaste comidas para {mealEntryDate === today ? "hoy" : "este día"}.</p>}
      </section>

      <section className="nutrition-food-library" aria-label="Lista gratuita de alimentos">
        <div className="nutrition-subheading"><div><h3>Alimentos</h3><small>Lista disponible para todas las cuentas · valores estimados por porción</small></div></div>
        <label className="nutrition-food-search">Buscar alimento
          <input type="search" value={foodSearch} onChange={(event) => setFoodSearch(event.target.value)} placeholder="Ej. pollo, banana, empanada…" />
        </label>
        <div className="nutrition-food-categories">{FOOD_CATEGORIES.map(renderFoodCategory)}</div>
        {selectedFoods.length > 0 && <div className="nutrition-selected-foods">
          <div><b>{selectedFoods.length} alimentos · {formatAmount(selectionTotals.calories)} kcal</b><small>P {formatAmount(selectionTotals.protein, 1)} · C {formatAmount(selectionTotals.carbs, 1)} · G {formatAmount(selectionTotals.fat, 1)} g</small></div>
          <button type="button" disabled={saving} onClick={() => void addSelectedFoods()}><SaveButtonContent label={"Agregar a " + mealMomentName} phase={savePhase("add_meal")} /></button>
        </div>}
        {foodSearch && !FOOD_CATEGORIES.some((category) => FOOD_LIBRARY.some((food) => food.category === category && normalizeFoodSearch([food.name, food.portion, ...(food.keywords ?? [])].join(" ")).includes(searchTerm))) && <p className="nutrition-food-empty">No encontramos ese alimento. Probá con otro nombre o usá el registro manual.</p>}
      </section>

      <details className="nutrition-manual-entry" ref={manualDetailsRef}>
        <summary>Registro manual</summary>
        <p>También podés cargar valores propios de calorías y macros.</p>
        <form onSubmit={submitManualMeal}>
          <label>Detalle<input name="detail" required placeholder="Ej. plato casero, porción mediana" /></label>
          <label>Calorías (kcal)<input name="calories" type="number" min="0" max="10000" step="1" required /></label>
          <label>Proteínas (g)<input name="protein" type="number" min="0" max="1000" step="1" defaultValue="0" /></label>
          <label>Carbohidratos (g)<input name="carbs" type="number" min="0" max="2000" step="1" defaultValue="0" /></label>
          <label>Grasas (g)<input name="fat" type="number" min="0" max="1000" step="1" defaultValue="0" /></label>
          <button type="submit" disabled={saving}><SaveButtonContent label={"Guardar en " + mealMomentName} phase={savePhase("add_meal")} /></button>
        </form>
      </details>
    </article>
  );
}
