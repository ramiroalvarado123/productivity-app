import assert from "node:assert/strict";
import test from "node:test";
import { catalogNamesForPrompt, groundEstimate, mealCatalog, type RawMealEstimate } from "@/features/nutrition/logic/ai-meal-grounding";
import { nutritionForGrams } from "@/features/nutrition/logic/food-search";

const base: RawMealEstimate = {
  mealName: "Almuerzo", detail: "", mealMoment: null, estimatedCalories: 999, minimumCalories: 1, maximumCalories: 2,
  protein: 1, carbs: 1, fat: 1, confidence: "medium", items: [], caveat: "Es aproximado.",
};

test("los alimentos del catálogo toman sus valores de la base, no de la IA", () => {
  const food = mealCatalog()[0];
  const expected = nutritionForGrams(food.per100, 200);
  const result = groundEstimate({
    ...base,
    items: [{ name: "algo", portion: "1 plato", grams: 200, catalogName: food.name, calories: 5, protein: 5, carbs: 5, fat: 5 }],
  });
  assert.equal(result.estimatedCalories, expected.calories);
  assert.equal(result.items[0].fromCatalog, true);
  assert.equal(result.items[0].name, food.name);
  assert.match(result.caveat, /base de alimentos de AVORA/);
});

test("lo que no está en el catálogo conserva la estimación de la IA y suma al total", () => {
  const food = mealCatalog()[0];
  const catalogKcal = nutritionForGrams(food.per100, 100).calories;
  const result = groundEstimate({
    ...base,
    items: [
      { name: "x", portion: "100 g", grams: 100, catalogName: food.name, calories: 0, protein: 0, carbs: 0, fat: 0 },
      { name: "Plato raro", portion: "1 porción", grams: 150, catalogName: "no existe", calories: 300, protein: 10, carbs: 20, fat: 5 },
    ],
  });
  assert.equal(result.estimatedCalories, catalogKcal + 300);
  assert.equal(result.items[1].fromCatalog, false);
  assert.ok(result.minimumCalories < result.estimatedCalories && result.maximumCalories > result.estimatedCalories);
});

test("sin alimentos devuelve la estimación original", () => {
  const result = groundEstimate(base);
  assert.equal(result.estimatedCalories, 999);
  assert.deepEqual(result.items, []);
});

test("un nombre del catálogo con otra mayúscula o sin tildes también calza", () => {
  const food = mealCatalog().find((item) => /[áéíóú]/i.test(item.name))!;
  const sloppy = food.name.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
  const result = groundEstimate({ ...base, items: [{ name: "x", portion: "", grams: 100, catalogName: sloppy, calories: 0, protein: 0, carbs: 0, fat: 0 }] });
  assert.equal(result.items[0].fromCatalog, true);
});

test("la lista para el prompt trae un alimento por línea", () => {
  assert.equal(catalogNamesForPrompt().split("\n").length, mealCatalog().length);
});
