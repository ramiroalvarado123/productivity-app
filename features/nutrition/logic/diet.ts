import type { DietForm, DietNumberDrafts, DietNumberKey, DietPlanContent } from "@/shared/data/types";
export const DIET_NUMBER_LIMITS: Record<DietNumberKey, { min: number; max: number }> = {
  age: { min: 18, max: 100 },
  heightCm: { min: 120, max: 230 },
  currentWeightKg: { min: 35, max: 300 },
  targetWeightKg: { min: 35, max: 300 },
};
export function dietNumberDraftsFrom(form: DietForm): DietNumberDrafts {
  return {
    age: String(form.age),
    heightCm: String(form.heightCm),
    currentWeightKg: String(form.currentWeightKg),
    targetWeightKg: String(form.targetWeightKg),
  };
}
export function isDietNumberKey(key: keyof DietForm): key is DietNumberKey {
  return key === "age" || key === "heightCm" || key === "currentWeightKg" || key === "targetWeightKg";
}
export function parseDietNumber(value: string) {
  const parsed = Number(value.trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export const DIET_ACTIVITY_MULTIPLIERS: Record<DietForm["activityLevel"], number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, high: 1.725 };
/**
 * Mismo cálculo (Mifflin-St Jeor + actividad + ritmo del objetivo) que ya usa
 * el plan con IA como punto de partida — acá es directamente el resultado,
 * sin pasar por la IA. Devuelve null si todavía faltan datos.
 */
export function estimateTargetCalories(form: Pick<DietForm, "age" | "heightCm" | "currentWeightKg" | "targetWeightKg" | "sex" | "activityLevel" | "goalPace">) {
  const { age, heightCm, currentWeightKg, targetWeightKg, sex, activityLevel, goalPace } = form;
  if (!age || !heightCm || !currentWeightKg || !targetWeightKg) return null;
  const sexOffset = sex === "male" ? 5 : sex === "female" ? -161 : -78;
  const basalEstimate = 10 * currentWeightKg + 6.25 * heightCm - 5 * age + sexOffset;
  const maintenanceCalories = Math.round(basalEstimate * DIET_ACTIVITY_MULTIPLIERS[activityLevel]);
  const difference = targetWeightKg - currentWeightKg;
  const adjustment = goalPace === "moderate" ? 450 : 300;
  const minimumCalories = sex === "male" ? 1500 : sex === "female" ? 1200 : 1350;
  const targetCalories = Math.round(Math.max(minimumCalories, Math.min(6000, maintenanceCalories + (difference < -0.5 ? -adjustment : difference > 0.5 ? Math.min(300, adjustment) : 0))) / 10) * 10;
  return { maintenanceCalories, targetCalories };
}
export function parseDietPlan(value: string | undefined) {
  try { return value ? JSON.parse(value) as DietPlanContent : null; } catch { return null; }
}

export async function preparePhoto(file: File) {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", .82));
    return blob ? new File([blob], "comida.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}
