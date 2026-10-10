import { ok, fail, patched } from "@/server/http";
import { deleteRows, insertRows } from "@/server/db/postgrest";
import { owned, upsert } from "@/server/db/rows";
import { now, type ProgressRow } from "@/server/db/rows";
import { DATE } from "@/domain/validation";
import type { ActionMap } from "@/server/progress/types";

export const nutritionActions: ActionMap = {
  add_meal: async ({ p, email }) => {
    const date = String(p.date ?? "");
    const name = String(p.name ?? "").trim();
    const detail = String(p.detail ?? "").trim();
    if (!DATE.test(date) || (!name && !detail)) return fail("Completá la comida y la fecha.");
    const rows = await insertRows<ProgressRow>("meals", {
      userEmail: email, mealDate: date, name, detail,
      calories: Math.max(0, Math.min(10000, Number(p.calories) || 0)),
      protein: Math.max(0, Math.min(1000, Number(p.protein) || 0)),
      carbs: Math.max(0, Math.min(2000, Number(p.carbs) || 0)),
      fat: Math.max(0, Math.min(1000, Number(p.fat) || 0)),
    }, { returnRows: true });
    return patched({ upsert: { mealHistory: rows } });
  },
  delete_meal: async ({ p, email }) => { const id = Number(p.id); await deleteRows("meals", { id, userEmail: email }); return patched({ remove: { mealHistory: [id] } }); },
  save_diet_plan: async ({ p, email }) => {
    const age = Math.round(Number(p.age) || 0), heightCm = Math.round(Number(p.heightCm) || 0),
      currentWeightDeciKg = Math.round((Number(p.currentWeightKg) || 0) * 10),
      targetWeightDeciKg = Math.round((Number(p.targetWeightKg) || 0) * 10),
      targetCalories = Math.round(Number(p.targetCalories) || 0);
    if (age < 18 || age > 100 || heightCm < 120 || heightCm > 230 || currentWeightDeciKg < 350 || targetWeightDeciKg < 350 || !p.plan || targetCalories < 1000 || targetCalories > 6000) return fail("Revisá los datos del plan.");
    if (typeof p.plan !== "object" || Array.isArray(p.plan)) return fail("El plan no tiene un formato válido.");
    const plan = p.plan as Record<string, unknown>;
    const previous = (await owned("diet_plans", email))[0];
    let previousPlan: Record<string, unknown> = {};
    try {
      const decoded = JSON.parse(String(previous?.planJson ?? ""));
      if (decoded && typeof decoded === "object" && !Array.isArray(decoded)) previousPlan = decoded as Record<string, unknown>;
    } catch { /* primer plan o registro anterior a la memoria de personalización */ }
    const previousMemoryValue = previousPlan.personalizationMemory;
    const previousMemory = previousMemoryValue && typeof previousMemoryValue === "object" && !Array.isArray(previousMemoryValue)
      ? previousMemoryValue as Record<string, unknown>
      : {};
    const entries = Array.isArray(previousMemory.entries)
      ? previousMemory.entries.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object" && !Array.isArray(entry))
      : [];
    if (!entries.length && previous && (previous.details || previous.preferences)) {
      entries.push({
        savedAt: String(previous.updatedAt ?? ""),
        profile: {
          age: previous.age, sex: previous.sex, heightCm: previous.heightCm,
          currentWeightKg: Number(previous.currentWeightDeciKg) / 10,
          targetWeightKg: Number(previous.targetWeightDeciKg) / 10,
          activityLevel: previous.activityLevel, goalPace: previous.goalPace,
        },
        preferences: String(previous.preferences ?? ""),
        details: String(previous.details ?? ""),
      });
    }
    const preferences = String(p.preferences ?? "").trim().slice(0, 500);
    const details = String(p.details ?? "").trim().slice(0, 2000);
    const profile = {
      age, sex: String(p.sex ?? "unspecified"), heightCm,
      currentWeightKg: currentWeightDeciKg / 10, targetWeightKg: targetWeightDeciKg / 10,
      activityLevel: String(p.activityLevel ?? "light"), goalPace: String(p.goalPace ?? "gentle"),
    };
    const latest = entries[entries.length - 1];
    const sameAsLatest = latest && JSON.stringify([latest.profile, latest.preferences, latest.details]) === JSON.stringify([profile, preferences, details]);
    if (!sameAsLatest) entries.push({ savedAt: now(), profile, preferences, details });
    const memory = {
      summary: String(plan.personalizationSummary ?? previousMemory.summary ?? "").trim().slice(0, 4000),
      entries,
    };
    const planJson = JSON.stringify({ ...plan, personalizationMemory: memory });
    await upsert("diet_plans", {
      userEmail: email, age, sex: profile.sex, heightCm, currentWeightDeciKg, targetWeightDeciKg,
      activityLevel: profile.activityLevel, goalPace: profile.goalPace, preferences, details,
      targetCalories, planJson,
    }, ["userEmail"]);
    return ok();
  },
  // Calculadora rápida sin IA: solo fija las calorías objetivo (y el snapshot biométrico que las produjo). Nunca toca planJson/preferences/details de un plan con IA ya guardado.
  set_diet_target: async ({ p, email }) => { const age = Math.round(Number(p.age) || 0), heightCm = Math.round(Number(p.heightCm) || 0), currentWeightDeciKg = Math.round((Number(p.currentWeightKg) || 0) * 10), targetWeightDeciKg = Math.round((Number(p.targetWeightKg) || 0) * 10), targetCalories = Math.round(Number(p.targetCalories) || 0); if (age < 18 || age > 100 || heightCm < 120 || heightCm > 230 || currentWeightDeciKg < 350 || targetWeightDeciKg < 350 || targetCalories < 1000 || targetCalories > 6000) return fail("Revisá los datos."); const existing = (await owned("diet_plans", email))[0]; await upsert("diet_plans", { userEmail: email, age, sex: String(p.sex ?? "unspecified"), heightCm, currentWeightDeciKg, targetWeightDeciKg, activityLevel: String(p.activityLevel ?? "light"), goalPace: String(p.goalPace ?? "gentle"), preferences: String(existing?.preferences ?? ""), details: String(existing?.details ?? ""), targetCalories, planJson: String(existing?.planJson ?? "") }, ["userEmail"]); return ok(); },
};
