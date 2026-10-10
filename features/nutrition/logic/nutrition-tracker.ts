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
    const key = meal.name.trim().toLocaleLowerCase("es") || "otro";
    const group = groups.get(key) ?? { name: meal.name.trim() || "Otro", meals: [], calories: 0 };
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
