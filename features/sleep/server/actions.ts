import { fail, patched } from "@/server/http";
import { upsert } from "@/server/db/rows";
import { DATE } from "@/domain/validation";
import { parseSleepQuality } from "@/domain/score";
import type { ActionMap } from "@/server/progress/types";

export const sleepActions: ActionMap = {
  save_sleep: async ({ p, email }) => { const date = String(p.date ?? ""); if (!DATE.test(date)) return fail("Fecha inválida."); const sleepQuality = parseSleepQuality(p.sleepQuality);
    const row = { userEmail: email, entryDate: date, sleepMinutes: Math.max(0, Math.min(1440, Math.round(Number(p.sleepMinutes) || 0))), bedtime: String(p.bedtime ?? "").slice(0, 20), wakeTime: String(p.wakeTime ?? "").slice(0, 20) };
    try {
      return patched({ upsert: { dailyCheckins: await upsert("daily_checkins", { ...row, sleepQuality }, ["userEmail", "entryDate"]) } });
    } catch (error) {
      // Si todavía no se corrió supabase/sleep-quality-regular.sql, la base rechaza "regular":
      // guardamos igual la noche (sin valoración) en vez de perder el registro.
      if (sleepQuality !== "regular") throw error;
      return patched({ upsert: { dailyCheckins: await upsert("daily_checkins", { ...row, sleepQuality: null }, ["userEmail", "entryDate"]) } });
    }
  },
};
