import assert from "node:assert/strict";
import test from "node:test";
import { buildCatalog, nutritionForGrams, searchFoods } from "@/features/nutrition/logic/food-search";
import { FOOD_ROWS } from "@/features/nutrition/data/food-catalog";
import { NUTRITION_GOALS, macroTargetsFor } from "@/features/nutrition/logic/macro-goals";
import { calculateFoodNutrition, calculateMealNutrition, detectExplicitMealMoment, groupMealsByMoment, normalizeFoodSearch } from "@/features/nutrition/logic/nutrition-tracker";

const food = {
  id: "pollo",
  name: "Pollo",
  category: "Proteínas",
  portion: "120 g",
  calories: 198,
  protein: 37,
  carbs: 0,
  fat: 4.3,
};

test("calcula calorías y macros al ajustar una porción", () => {
  assert.deepEqual(calculateFoodNutrition([{ food, portions: 1.5 }]), {
    calories: 297,
    protein: 55.5,
    carbs: 0,
    fat: 6.5,
  });
});

test("suma los registros guardados del día sin duplicar comidas", () => {
  assert.deepEqual(calculateMealNutrition([
    { id: 2, name: "Almuerzo", detail: "Pollo", mealDate: "2026-10-10", calories: 297, protein: 55.5, carbs: 0, fat: 6.5 },
    { id: 3, name: "Merienda", detail: "Yogur", mealDate: "2026-10-10", calories: 105, protein: 6, carbs: 12, fat: 3 },
  ]), { calories: 402, protein: 61.5, carbs: 12, fat: 9.5 });
});

test("agrupa registros por momento y prioriza el más reciente", () => {
  const groups = groupMealsByMoment([
    { id: 8, name: "Almuerzo", detail: "Pollo", mealDate: "2026-10-10", calories: 297, protein: 55, carbs: 0, fat: 6 },
    { id: 7, name: "Desayuno", detail: "Avena", mealDate: "2026-10-10", calories: 156, protein: 7, carbs: 27, fat: 3 },
    { id: 6, name: "Almuerzo", detail: "Ensalada", mealDate: "2026-10-10", calories: 55, protein: 2, carbs: 11, fat: 0.5 },
  ]);
  assert.deepEqual(groups.map(({ name, calories, meals }) => [name, calories, meals.length]), [
    ["Almuerzo", 352, 2],
    ["Desayuno", 156, 1],
  ]);
});

test("un registro sin momento queda agrupado como Sin momento", () => {
  const [group] = groupMealsByMoment([
    { id: 9, name: "", detail: "Arroz con pollo", mealDate: "2026-10-10", calories: 520, protein: 35, carbs: 60, fat: 12 },
  ]);
  assert.equal(group.name, "Sin momento");
  assert.equal(group.meals.length, 1);
});

test("solo detecta momentos mencionados explícitamente en el texto", () => {
  assert.equal(detectExplicitMealMoment("Almorcé una milanesa con puré"), "Almuerzo");
  assert.equal(detectExplicitMealMoment("Desayuné avena con banana"), "Desayuno");
  assert.equal(detectExplicitMealMoment("Tomé una colación nocturna"), "Colación nocturna");
  assert.equal(detectExplicitMealMoment("Comí arroz con pollo"), null);
  assert.equal(detectExplicitMealMoment("Desayuné temprano y después almorcé"), null);
});

test("normaliza búsquedas con o sin acentos", () => {
  assert.equal(normalizeFoodSearch("brócoli"), normalizeFoodSearch("brocoli"));
});

// --- Catálogo de alimentos con porciones y búsqueda -----------------------------------


const catalog = buildCatalog(FOOD_ROWS);

test("el catálogo es grande, sin nombres repetidos y con porciones crecientes", () => {
  assert.ok(catalog.length >= 400);
  assert.equal(new Set(catalog.map((item) => item.id)).size, catalog.length);
  for (const item of catalog) {
    assert.ok(item.portions.small > 0 && item.portions.small < item.portions.medium && item.portions.medium < item.portions.large, item.name);
    assert.ok(item.per100.calories >= 0, item.name);
  }
});

test("autocompleta por nombre, sinónimo, plural y sin acentos", () => {
  assert.ok(searchFoods(catalog, "bife").some((item) => /bife de chorizo/i.test(item.name)));
  assert.equal(searchFoods(catalog, "banana")[0].name, "Banana");
  assert.equal(searchFoods(catalog, "pollo")[0].name, "Pollo, pechuga sin piel, a la plancha");
  assert.equal(searchFoods(catalog, "bife")[0].name, "Bife de chorizo, a la parrilla");
  assert.ok(searchFoods(catalog, "platano").some((item) => item.name === "Banana"));
  assert.ok(searchFoods(catalog, "bananas").some((item) => item.name === "Banana"));
  assert.ok(searchFoods(catalog, "brocoli").some((item) => /brócoli/i.test(item.name)));
  assert.deepEqual(searchFoods(catalog, "   "), []);
  assert.deepEqual(searchFoods(catalog, "zzzzqq"), []);
});

test("calcula calorías y macros de cualquier cantidad de gramos", () => {
  const per100 = { calories: 200, protein: 30, carbs: 0, fat: 8 };
  assert.deepEqual(nutritionForGrams(per100, 150), { calories: 300, protein: 45, carbs: 0, fat: 12 });
  assert.deepEqual(nutritionForGrams(per100, 0), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  assert.equal(nutritionForGrams(per100, -5).calories, 0);
  assert.equal(nutritionForGrams(per100, 999999).calories, 0);
});

test("cada objetivo reparte el 100% de las calorías y recomienda macros coherentes", () => {
  for (const goal of NUTRITION_GOALS) {
    assert.equal(goal.split.protein + goal.split.carbs + goal.split.fat, 100, goal.label);
  }
  assert.deepEqual(NUTRITION_GOALS.map((goal) => goal.key), ["lose", "maintain", "gain"]);
  const gain = macroTargetsFor(NUTRITION_GOALS.find((goal) => goal.key === "gain")!, 2800);
  assert.deepEqual(gain, { protein: 210, carbs: 350, fat: 62 });
  assert.deepEqual(macroTargetsFor(NUTRITION_GOALS[0], 0), { protein: 0, carbs: 0, fat: 0 });
});
