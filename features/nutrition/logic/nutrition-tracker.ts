export const MEAL_MOMENTS = [
  "Desayuno",
  "Media mañana",
  "Almuerzo",
  "Merienda",
  "Cena",
  "Colación",
  "Colación nocturna",
  "Otro",
] as const;

export type MealMoment = (typeof MEAL_MOMENTS)[number];

export type NutritionValues = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type NutritionMealRecord = NutritionValues & {
  id: number;
  name: string;
  detail: string;
  mealDate: string;
};

export type FoodServing = NutritionValues & {
  id: string;
  name: string;
  category: string;
  portion: string;
  keywords?: string[];
};

export type FoodSelection = {
  food: FoodServing;
  portions: number;
};

function rounded(value: number, places: number) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

export function calculateFoodNutrition(selection: FoodSelection[]): NutritionValues {
  const totals = selection.reduce<NutritionValues>((current, item) => {
    const portions = Number.isFinite(item.portions) && item.portions > 0 ? item.portions : 0;
    return {
      calories: current.calories + item.food.calories * portions,
      protein: current.protein + item.food.protein * portions,
      carbs: current.carbs + item.food.carbs * portions,
      fat: current.fat + item.food.fat * portions,
    };
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  return {
    calories: Math.round(totals.calories),
    protein: rounded(totals.protein, 1),
    carbs: rounded(totals.carbs, 1),
    fat: rounded(totals.fat, 1),
  };
}

export function calculateMealNutrition(meals: NutritionMealRecord[]): NutritionValues {
  const totals = meals.reduce<NutritionValues>((current, meal) => ({
    calories: current.calories + (Number(meal.calories) || 0),
    protein: current.protein + (Number(meal.protein) || 0),
    carbs: current.carbs + (Number(meal.carbs) || 0),
    fat: current.fat + (Number(meal.fat) || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  return {
    calories: Math.round(totals.calories),
    protein: rounded(totals.protein, 1),
    carbs: rounded(totals.carbs, 1),
    fat: rounded(totals.fat, 1),
  };
}

export function groupMealsByMoment(meals: NutritionMealRecord[]) {
  const sorted = [...meals].sort((left, right) => right.id - left.id);
  const groups = new Map<string, { name: string; meals: NutritionMealRecord[]; calories: number }>();

  for (const meal of sorted) {
    const key = meal.name.trim().toLocaleLowerCase("es") || "sin-momento";
    const group = groups.get(key) ?? { name: meal.name.trim() || "Sin momento", meals: [], calories: 0 };
    group.meals.push(meal);
    group.calories += Number(meal.calories) || 0;
    groups.set(key, group);
  }

  return [...groups.values()].map((group) => ({
    ...group,
    calories: Math.round(group.calories),
  }));
}

export function normalizeFoodSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim();
}


const EXPLICIT_MEAL_MOMENT_MENTIONS: Array<{ moment: MealMoment; pattern: RegExp }> = [
  { moment: "Media mañana", pattern: /\bmedia\s+manana\b/ },
  { moment: "Colación nocturna", pattern: /\b(?:colacion|snack|tentempie)\s+(?:nocturn[oa]|de\s+noche|a\s+la\s+noche|de\s+medianoche)\b/ },
  { moment: "Desayuno", pattern: /\b(?:desayuno|desayune|desayunar|desayunamos|desayunaron|desayunaba|desayunaste)\b/ },
  { moment: "Almuerzo", pattern: /\b(?:almuerzo|almorce|almorzar|almorzando|almorzamos|almorzaron|mediodia)\b/ },
  { moment: "Merienda", pattern: /\b(?:merienda|merende|merendar|merendando|merendamos|merendaron)\b/ },
  { moment: "Cena", pattern: /\b(?:cena|cene|ceno|cenar|cenando|cenamos|cenaron)\b/ },
  { moment: "Colación", pattern: /\b(?:colacion|snack|tentempie)\b/ },
];

export function detectExplicitMealMoment(description: string): MealMoment | null {
  const normalized = normalizeFoodSearch(description).replace(/\s+/g, " ");
  const moments = [...new Set(EXPLICIT_MEAL_MOMENT_MENTIONS
    .filter(({ pattern }) => pattern.test(normalized))
    .map(({ moment }) => moment))];

  // Las frases más específicas tienen prioridad sobre "colación" genérica.
  if (moments.includes("Media mañana")) {
    const index = moments.indexOf("Colación");
    if (index >= 0) moments.splice(index, 1);
  }
  if (moments.includes("Colación nocturna")) {
    const index = moments.indexOf("Colación");
    if (index >= 0) moments.splice(index, 1);
  }

  return moments.length === 1 ? moments[0] : null;
}
