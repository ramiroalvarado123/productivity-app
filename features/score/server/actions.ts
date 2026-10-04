import { ok, fail } from "@/server/http";
import { upsert } from "@/server/db/rows";
import { MONTH } from "@/domain/validation";
import type { ActionMap } from "@/server/progress/types";

export const scoreActions: ActionMap = {
  set_priorities: async ({ p, email }) => { const monthKey = String(p.monthKey ?? ""), weight = (v: unknown) => Math.max(1, Math.min(3, Math.round(Number(v) || 2))); if (!MONTH.test(monthKey)) return fail("Mes inválido."); await upsert("monthly_priorities", { userEmail: email, monthKey, gymWeight: weight(p.gymWeight), nutritionWeight: weight(p.nutritionWeight), readingWeight: weight(p.readingWeight), sleepWeight: weight(p.sleepWeight), focusWeight: weight(p.focusWeight), goalsWeight: weight(p.goalsWeight) }, ["userEmail", "monthKey"]); return ok(); },
};
