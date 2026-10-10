import assert from "node:assert/strict";
import test from "node:test";
import { calculateFoodNutrition, calculateMealNutrition, groupMealsByMoment, normalizeFoodSearch } from "@/features/nutrition/logic/nutrition-tracker";

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

test("normaliza búsquedas con o sin acentos", () => {
  assert.equal(normalizeFoodSearch("brócoli"), normalizeFoodSearch("brocoli"));
});
