/**
 * Estimación de comidas con IA apoyada en el catálogo de alimentos (puro, sin React ni fetch).
 *
 * La IA solo reconoce qué hay en el plato y cuántos gramos son; los valores por 100 g de lo
 * que existe en el catálogo salen de la misma base que usa el buscador de alimentos, así el
 * registro con IA y el manual dan los mismos números. Lo que no está en el catálogo (un plato
 * raro, un envasado) conserva la estimación de la IA y queda marcado como tal.
 */
import { FOOD_ROWS } from "@/features/nutrition/data/food-catalog";
import { buildCatalog, formatGrams, nutritionForGrams, type CatalogFood } from "@/features/nutrition/logic/food-search";
import { normalizeFoodSearch } from "@/features/nutrition/logic/nutrition-tracker";
import type { MealEstimate } from "@/shared/data/types";

/** Lo que devuelve la IA por cada alimento reconocido. */
export type RawEstimateItem = {
  name: string;
  /** Descripción libre de la porción ("1 plato mediano"). */
  portion: string;
  grams: number;
  /** Nombre exacto copiado del catálogo, o null si el alimento no está. */
  catalogName: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type RawMealEstimate = Omit<MealEstimate, "items"> & { items: RawEstimateItem[] };

/** Incertidumbre alrededor de la cifra: un valor de catálogo con gramos estimados vs. una cifra inventada por la IA. */
const CATALOG_MARGIN = 0.1;
const AI_ONLY_MARGIN = 0.3;
/** Mismo tope que la porción manual: un "5 kg de arroz" es un error de lectura. */
const MAX_ITEM_GRAMS = 5000;

let cachedCatalog: CatalogFood[] | null = null;
export function mealCatalog() {
  cachedCatalog ??= buildCatalog(FOOD_ROWS);
  return cachedCatalog;
}

/** Lista de nombres para el prompt: una por línea, para que la IA elija en vez de inventar. */
export function catalogNamesForPrompt(catalog: CatalogFood[] = mealCatalog()) {
  return catalog.map((food) => food.name).join("\n");
}

function findCatalogFood(catalog: CatalogFood[], name: string | null) {
  if (!name) return null;
  const wanted = normalizeFoodSearch(name);
  return catalog.find((food) => normalizeFoodSearch(food.name) === wanted) ?? null;
}

const nonNegative = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

/**
 * Reemplaza los números de los alimentos que están en el catálogo y recalcula los
 * totales sumando. Sin alimentos reconocidos devuelve la estimación tal cual.
 */
export function groundEstimate(raw: RawMealEstimate, catalog: CatalogFood[] = mealCatalog()): MealEstimate {
  if (!raw.items.length) return { ...raw, items: [] };

  let calories = 0, protein = 0, carbs = 0, fat = 0, low = 0, high = 0;
  const fromCatalog: string[] = [];
  const items: MealEstimate["items"] = raw.items.map((item) => {
    const grams = Math.min(MAX_ITEM_GRAMS, nonNegative(item.grams));
    const food = grams > 0 ? findCatalogFood(catalog, item.catalogName) : null;
    const values = food
      ? nutritionForGrams(food.per100, grams)
      : { calories: nonNegative(item.calories), protein: nonNegative(item.protein), carbs: nonNegative(item.carbs), fat: nonNegative(item.fat) };
    const margin = food ? CATALOG_MARGIN : AI_ONLY_MARGIN;
    calories += values.calories;
    protein += values.protein;
    carbs += values.carbs;
    fat += values.fat;
    low += values.calories * (1 - margin);
    high += values.calories * (1 + margin);
    if (food) fromCatalog.push(food.name);
    return {
      name: food ? food.name : item.name,
      portion: food ? formatGrams(grams) : item.portion,
      calories: Math.round(values.calories),
      fromCatalog: Boolean(food),
    };
  });

  const caveat = fromCatalog.length
    ? `Calorías y macros calculados con la base de alimentos de AVORA para: ${fromCatalog.join(", ")}. ${items.length > fromCatalog.length ? "El resto es una estimación de la IA. " : ""}${raw.caveat}`.trim()
    : raw.caveat;
  return {
    ...raw,
    items,
    estimatedCalories: Math.round(calories),
    minimumCalories: Math.round(low),
    maximumCalories: Math.round(high),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
    caveat,
  };
}
