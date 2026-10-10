/**
 * Búsqueda y cálculo sobre el catálogo de alimentos (puro, sin React).
 * El catálogo vive en `features/nutrition/data/food-catalog.ts` y pesa unos 50 KB:
 * la UI lo carga con `import()` recién cuando alguien empieza a escribir.
 */
import type { FoodRow } from "@/features/nutrition/data/food-catalog";
import { normalizeFoodSearch, type NutritionValues } from "@/features/nutrition/logic/nutrition-tracker";

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

/** Categorías más buscadas: a igual relevancia aparecen primero ("bife" → vacuno antes que cerdo). */
const COMMON_CATEGORIES = ["Carnes vacunas", "Aves", "Pescados y mariscos", "Huevos", "Frutas", "Verduras", "Cereales y pastas", "Lácteos"];

/** Los más pedidos de cada familia: a igual relevancia salen primero ("pollo" → pechuga antes que hígado). */
const STAPLES = [
  "Bife de chorizo, a la parrilla", "Carne picada especial (90/10), cruda", "Nalga, al horno", "Vacío, a la parrilla",
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
