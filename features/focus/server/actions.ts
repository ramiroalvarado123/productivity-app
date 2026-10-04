import { ok, fail, patched } from "@/server/http";
import { deleteRows, insertRows, selectRows, updateRows } from "@/server/db/postgrest";
import { owned } from "@/server/db/rows";
import type { ProgressRow } from "@/server/db/rows";
import { DATE } from "@/domain/validation";
import type { ActionMap } from "@/server/progress/types";

export const focusActions: ActionMap = {
  add_focus_project: async ({ p, email }) => { const name = String(p.name ?? "").trim().slice(0, 80), kind = String(p.kind ?? "study"); if (!name || !["study", "work"].includes(kind)) return fail("Completá el nombre y el tipo."); await insertRows("focus_projects", { userEmail: email, name, kind }, { upsert: true, onConflict: ["userEmail", "name"], ignoreDuplicates: true }); return ok(); },
  // Cada envío suma un bloque nuevo (podés estudiar la misma materia dos
  // veces en un día): antes borraba el bloque anterior del mismo día y se
  // perdía tiempo real registrado.
  add_focus_session: async ({ p, email }) => { const projectId = Number(p.projectId), date = String(p.date ?? ""); if (!DATE.test(date) || !(await owned("focus_projects", email, { id: projectId }))[0]) return fail("Elegí un proyecto y fecha válidos."); const rows = await insertRows<ProgressRow>("focus_sessions", { userEmail: email, projectId, sessionDate: date, minutes: Math.max(1, Math.min(1440, Math.round(Number(p.minutes) || 0))), note: String(p.note ?? "").slice(0, 1000) }, { returnRows: true }); return patched({ upsert: { focusSessions: rows } }); },
  delete_focus_session: async ({ p, email }) => {
    const id = Number(p.id);
    if (!Number.isSafeInteger(id) || id <= 0 || !(await owned("focus_sessions", email, { id }))[0]) return fail("Registro de foco no encontrado.", 404);
    await deleteRows("focus_sessions", { id, userEmail: email });
    return patched({ remove: { focusSessions: [id] } });
  },
  delete_focus_project: async ({ p, email }) => {
    const id = Number(p.projectId);
    if (!Number.isSafeInteger(id) || id <= 0) return fail("Materia o proyecto no encontrado.", 404);
    const project = (await owned("focus_projects", email, { id }))[0];
    if (!project) return fail("Materia o proyecto no encontrado.", 404);
    const sessions = await selectRows<ProgressRow>("focus_sessions", { where: { userEmail: email, projectId: id } });
    // Las tareas se conservan sin asignar a un proyecto. Las sesiones ligadas
    // desaparecen junto con la materia/proyecto (FK ON DELETE CASCADE).
    const tasks = await updateRows<ProgressRow>("tasks", { userEmail: email, projectId: id }, { projectId: null }, true);
    await deleteRows("focus_projects", { id, userEmail: email });
    return patched({
      remove: { focusProjects: [id], focusSessions: sessions.map((session) => session.id) },
      ...(tasks.length ? { upsert: { tasks } } : {}),
    });
  },
};
