/**
 * Búsqueda y cálculo sobre el catálogo de alimentos (puro, sin React).
 * El catálogo vive en `features/nutrition/data/food-catalog.ts` y se comparte entre
 * la búsqueda manual y los accesos rápidos derivados del historial.
 */
import { FOOD_ROWS, type FoodRow } from "@/features/nutrition/data/food-catalog";
import { normalizeFoodSearch, type NutritionMealRecord, type NutritionValues } from "@/features/nutrition/logic/nutrition-tracker";

export type FoodPortionSize = "small" | "medium" | "large";

export type CatalogFood = {
  id: string;
  name: string;
  category: string;
  /** Valores por cada 100 g (o 100 ml en bebidas). */
  per100: NutritionValues;
  /** Gramos de la porción pequeña, mediana y grande de este alimento en particular. */
  portions: Record<FoodPortionSize, number>;
  /** Texto normalizado (nombre + sinónimos) sobre el que se busca. */
  searchText: string;
  words: string[];
};

export type MealHistoryShortcut = {
  foodId: string;
  name: string;
  count: number;
  lastDate: string;
};

export const PORTION_LABELS: Record<FoodPortionSize, string> = { small: "Pequeña", medium: "Mediana", large: "Grande" };
export const PORTION_ORDER: FoodPortionSize[] = ["small", "medium", "large"];
/** Tope razonable para una porción personalizada: evita errores de tipeo (10000 g). */
export const MAX_PORTION_GRAMS = 5000;

function slugify(value: string) {
  return normalizeFoodSearch(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function buildCatalog(rows: FoodRow[]): CatalogFood[] {
  return rows.map(([name, category, calories, protein, carbs, fat, sizes, aliases]) => {
    const searchText = normalizeFoodSearch(`${name} ${aliases}`);
    return {
      id: slugify(name),
      name,
      category,
      per100: { calories, protein, carbs, fat },
      portions: { small: sizes[0], medium: sizes[1], large: sizes[2] },
      searchText,
      words: searchText.split(/[^a-z0-9ñ]+/).filter(Boolean),
    };
  });
}

/** Una sola instancia compartida por el buscador y los accesos del historial. */
export const FOOD_CATALOG = buildCatalog(FOOD_ROWS);

/** Categorías más buscadas: a igual relevancia aparecen primero ("bife" → vacuno antes que cerdo). */
const COMMON_CATEGORIES = ["Carnes vacunas", "Aves", "Pescados y mariscos", "Huevos", "Frutas", "Verduras", "Cereales y pastas", "Lácteos"];

/** Los más pedidos de cada familia: a igual relevancia salen primero ("pollo" → pechuga antes que hígado). */
const STAPLES = [
  "Carne vacuna, cocida", "Bife de chorizo, a la parrilla", "Carne picada especial (90/10), cruda", "Nalga, al horno", "Vacío, a la parrilla",
  "Pollo, pechuga sin piel, a la plancha", "Pollo, muslo sin piel, al horno", "Milanesa de carne al horno", "Milanesa de pollo frita",
  "Merluza, al horno", "Atún al natural, en lata", "Salmón, a la plancha",
  "Huevo duro", "Huevo frito", "Leche entera", "Yogur entero natural", "Queso cremoso", "Muzzarella",
  "Arroz blanco, hervido", "Fideos, hervidos", "Papa, hervida", "Pan francés (miñón)", "Pan de molde blanco",
  "Banana", "Manzana", "Naranja", "Palta", "Tomate", "Lechuga", "Zanahoria, cruda",
];

/** "bifes" y "bife" buscan lo mismo: se compara sin la "s" o "es" final. */
function stem(word: string) {
  if (word.length > 4 && word.endsWith("es")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s")) return word.slice(0, -1);
  return word;
}

/**
 * Ordena por relevancia: primero lo que empieza igual que lo escrito, después
 * lo que tiene todas las palabras al comienzo de alguna palabra, y al final
 * lo que sólo las contiene dentro. A igual relevancia, el nombre más corto.
 */
export function searchFoods(catalog: CatalogFood[], query: string, limit = 8): CatalogFood[] {
  const normalized = normalizeFoodSearch(query);
  if (!normalized) return [];
  const tokens = normalized.split(/\s+/).map(stem).filter(Boolean);
  if (!tokens.length) return [];
  const scored: Array<{ food: CatalogFood; score: number }> = [];
  for (const food of catalog) {
    const name = normalizeFoodSearch(food.name);
    let score = Infinity;
    if (name.startsWith(normalized)) score = 0;
    else {
      const everyTokenStartsAWord = tokens.every((token) => food.words.some((word) => word.startsWith(token)));
      if (everyTokenStartsAWord) score = tokens.every((token) => name.split(/[^a-z0-9ñ]+/).some((word) => word.startsWith(token))) ? 1 : 2;
      else if (tokens.every((token) => token.length >= 3 && food.searchText.includes(token))) score = 3;
    }
    // Entre dos resultados parecidos, lo que se come cocido va antes que lo crudo o seco.
    const rawPenalty = /\b(crud[oa]s?|sec[oa]s?)\b/.test(name) ? 40 : 0;
    // El orden de la lista desempata entre dos básicos (pechuga antes que muslo).
    const stapleIndex = STAPLES.indexOf(food.name);
    const stapleBonus = stapleIndex < 0 ? 0 : -500 + stapleIndex * 20;
    const categoryRank = COMMON_CATEGORIES.indexOf(food.category);
    if (score !== Infinity) scored.push({ food, score: score * 1000 + name.length + rawPenalty + stapleBonus + (categoryRank < 0 ? COMMON_CATEGORIES.length : categoryRank) * 3 });
  }
  return scored.sort((left, right) => left.score - right.score).slice(0, limit).map((item) => item.food);
}

const HISTORY_IGNORED_WORDS = new Set([
  "a", "al", "algo", "ayer", "con", "de", "del", "dos", "el", "en", "la", "las", "lo", "los", "mi", "mis", "o", "para", "por", "sin", "un", "una", "unas", "unos", "y",
  "bastante", "chica", "chico", "grande", "mediana", "mediano", "mucha", "mucho", "muchas", "muchos", "poca", "poco", "pocas", "pocos", "porcion", "porciones", "taza", "tazas", "vaso", "vasos", "gramo", "gramos", "kg", "ml",
  "comi", "comida", "comidas", "comimos", "plato", "registro", "desayune", "desayuno", "almorce", "almuerzo", "merende", "merienda", "cene", "cena", "colacion", "snack", "otro", "media", "manana", "nocturna", "noche",
]);

function titleCase(value: string) {
  return value.charAt(0).toLocaleUpperCase("es") + value.slice(1);
}

function exactCatalogMatch(catalog: CatalogFood[], words: string[]) {
  if (!words.length) return undefined;
  return searchFoods(catalog, words.join(" "), 12).find((food) =>
    words.every((word) => food.words.some((candidate) => stem(candidate) === stem(word))),
  );
}

/**
 * Convierte texto libre en alimentos concretos del catálogo. Busca primero
 * combinaciones ("café con leche") y después palabras sueltas ("arroz y carne").
 * Si no existe una coincidencia exacta de palabras en el catálogo, no la devuelve.
 */
export function catalogFoodsInText(catalog: CatalogFood[], text: string, limit = 6) {
  const source = text.split(/\s+—\s+/u, 1)[0] ?? "";
  const words = normalizeFoodSearch(source).match(/[a-z0-9ñ]+/g) ?? [];
  const meaningful = words.filter((word) => word.length >= 2 && !HISTORY_IGNORED_WORDS.has(word));
  const found: Array<{ food: CatalogFood; name: string }> = [];
  const used = new Set<number>();

  for (let size = Math.min(4, meaningful.length); size >= 1; size -= 1) {
    for (let start = 0; start + size <= meaningful.length; start += 1) {
      const positions = Array.from({ length: size }, (_, offset) => start + offset);
      if (positions.some((position) => used.has(position))) continue;
      const queryWords = positions.map((position) => meaningful[position]);
      const food = exactCatalogMatch(catalog, queryWords);
      if (!food) continue;
      positions.forEach((position) => used.add(position));
      const canonicalLabel = food.name.split(",", 1)[0].replace(/\s*\([^)]*\)\s*/g, " ").trim();
      found.push({ food, name: size === 1 ? titleCase(queryWords[0]) : canonicalLabel });
    }
  }

  const unique = new Map<string, { food: CatalogFood; name: string }>();
  for (const item of found) if (!unique.has(item.food.id)) unique.set(item.food.id, item);
  return [...unique.values()].slice(0, limit);
}

function dateMinus(date: string, days: number) {
  const value = new Date(date + "T12:00:00");
  value.setDate(value.getDate() - days);
  return value.toISOString().slice(0, 10);
}

/** Alimentos del catálogo vistos ayer y los más repetidos durante los siete días previos. */
export function mealHistoryShortcuts(catalog: CatalogFood[], meals: NutritionMealRecord[], referenceDate: string, limit = 4) {
  const yesterday = dateMinus(referenceDate, 1);
  const firstDay = dateMinus(referenceDate, 7);
  const recent = meals
    .filter((meal) => meal.mealDate >= firstDay && meal.mealDate < referenceDate)
    .flatMap((meal) => catalogFoodsInText(catalog, meal.detail).map((food) => ({ meal, ...food })))
    .sort((left, right) => right.meal.mealDate.localeCompare(left.meal.mealDate) || right.meal.id - left.meal.id);

  const byFood = new Map<string, MealHistoryShortcut>();
  for (const item of recent) {
    const current = byFood.get(item.food.id);
    if (current) current.count += 1;
    else byFood.set(item.food.id, { foodId: item.food.id, name: item.name, count: 1, lastDate: item.meal.mealDate });
  }

  const yesterdayIds = new Set<string>();
  const yesterdayItems: MealHistoryShortcut[] = [];
  for (const item of recent) {
    if (item.meal.mealDate !== yesterday || yesterdayIds.has(item.food.id)) continue;
    yesterdayIds.add(item.food.id);
    yesterdayItems.push(byFood.get(item.food.id)!);
    if (yesterdayItems.length === limit) break;
  }

  const frequent = [...byFood.values()]
    .filter((item) => item.count >= 2 && !yesterdayIds.has(item.foodId))
    .sort((left, right) => right.count - left.count || right.lastDate.localeCompare(left.lastDate))
    .slice(0, limit);

  return { yesterday: yesterdayItems, frequent };
}

export function gramsForPortion(food: Pick<CatalogFood, "portions">, size: FoodPortionSize) {
  return food.portions[size];
}

/** Calorías y macros de `grams` gramos de un alimento dado por sus valores cada 100 g. */
export function nutritionForGrams(per100: NutritionValues, grams: number): NutritionValues {
  // Una cantidad absurda (error de tipeo) no se calcula: vale 0 hasta que se corrige.
  const safe = Number.isFinite(grams) && grams > 0 && grams <= MAX_PORTION_GRAMS ? grams : 0;
  const factor = safe / 100;
  const round1 = (value: number) => Math.round(value * factor * 10) / 10;
  return {
    calories: Math.round(per100.calories * factor),
    protein: round1(per100.protein),
    carbs: round1(per100.carbs),
    fat: round1(per100.fat),
  };
}

export function formatGrams(grams: number) {
  return `${Number.isInteger(grams) ? grams : Math.round(grams * 10) / 10} g`;
}

/** Texto que queda guardado en el registro: "Bife de chorizo · Mediana (150 g)". */
export function portionDetail(name: string, size: FoodPortionSize | "custom", grams: number) {
  return size === "custom" ? `${name} · ${formatGrams(grams)}` : `${name} · ${PORTION_LABELS[size]} (${formatGrams(grams)})`;
}
