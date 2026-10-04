import { fail, patched } from "@/server/http";
import { upsert } from "@/server/db/rows";
import { DATE } from "@/domain/validation";
import type { ActionMap } from "@/server/progress/types";

export const sleepActions: ActionMap = {
  save_sleep: async ({ p, email }) => { const date = String(p.date ?? ""); if (!DATE.test(date)) return fail("Fecha inválida."); const sleepQuality = p.sleepQuality === "good" || p.sleepQuality === "bad" ? p.sleepQuality : null; const rows = await upsert("daily_checkins", { userEmail: email, entryDate: date, sleepMinutes: Math.max(0, Math.min(1440, Math.round(Number(p.sleepMinutes) || 0))), bedtime: String(p.bedtime ?? "").slice(0, 20), wakeTime: String(p.wakeTime ?? "").slice(0, 20), sleepQuality }, ["userEmail", "entryDate"]); return patched({ upsert: { dailyCheckins: rows } }); },
};
