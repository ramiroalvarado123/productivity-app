import { fail, patched } from "@/server/http";
import { deleteRows, insertRows, updateRows } from "@/server/db/postgrest";
import { now } from "@/server/db/rows";
import type { ProgressRow } from "@/server/db/rows";
import { DATE } from "@/domain/validation";
import type { ActionMap } from "@/server/progress/types";

export const goalsActions: ActionMap = {
  add_goal: async ({ p, email }) => { const title = String(p.title ?? "").trim(), period = String(p.period), category = String(p.category), targetDate = String(p.targetDate ?? ""); if (!title || !["weekly", "monthly", "annual", "custom"].includes(period) || !DATE.test(targetDate)) return fail("Completá un objetivo válido."); const rows = await insertRows<ProgressRow>("goals", { userEmail: email, title: title.slice(0, 180), period, category, targetDate }, { returnRows: true }); return patched({ upsert: { goals: rows } }); },
  toggle_goal: async ({ p, email }) => { const rows = await updateRows<ProgressRow>("goals", { id: Number(p.id), userEmail: email }, { completedAt: p.completed ? now() : null }, true); return patched({ upsert: { goals: rows } }); },
  delete_goal: async ({ p, email }) => { const id = Number(p.id); await deleteRows("goals", { id, userEmail: email }); return patched({ remove: { goals: [id] } }); },
};
