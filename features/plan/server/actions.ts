import { fail, patched } from "@/server/http";
import { deleteRows, insertRows, updateRows } from "@/server/db/postgrest";
import { owned, now } from "@/server/db/rows";
import type { ProgressRow } from "@/server/db/rows";
import { DATE, cleanTime } from "@/domain/validation";
import type { ActionMap } from "@/server/progress/types";

export const planActions: ActionMap = {
  add_task: async ({ p, email }) => {
    const title = String(p.title ?? "").trim().slice(0, 180), projectId = Number(p.projectId) || null, dueDate = String(p.dueDate ?? ""), startTime = cleanTime(p.startTime), duration = Math.max(0, Math.min(1440, Math.round(Number(p.durationMinutes) || 0))); if (!title || (dueDate && !DATE.test(dueDate))) return fail("Completá una tarea y fecha válida."); if (startTime === null) return fail("La hora no es válida."); if (startTime && !dueDate) return fail("Para darle un horario, la tarea necesita una fecha."); if (projectId && !(await owned("focus_projects", email, { id: projectId }))[0]) return fail("Proyecto no encontrado.", 404); const rows = await insertRows<ProgressRow>("tasks", { userEmail: email, projectId, title, dueDate: dueDate || null, startTime, durationMinutes: startTime ? duration || 60 : duration }, { returnRows: true }); return patched({ upsert: { tasks: rows } });
  },
  schedule_task: async ({ p, email }) => { const id = Number(p.id), startTime = cleanTime(p.startTime), dueDate = String(p.dueDate ?? ""), duration = Math.max(0, Math.min(1440, Math.round(Number(p.durationMinutes) || 0))), row = (await owned("tasks", email, { id }))[0]; if (!row) return fail("Tarea no encontrada.", 404); if (startTime === null || (dueDate && !DATE.test(dueDate))) return fail("Fecha u hora inválida."); const nextDate = dueDate || row.dueDate; if (startTime && !nextDate) return fail("La tarea necesita una fecha."); const rows = await updateRows<ProgressRow>("tasks", { id, userEmail: email }, { startTime, dueDate: nextDate, durationMinutes: startTime ? duration || 60 : 0 }, true); return patched({ upsert: { tasks: rows } }); },
  update_task: async ({ p, email }) => {
    const id = Number(p.id), title = String(p.title ?? "").trim().slice(0, 180), dueDate = String(p.dueDate ?? ""), startTime = cleanTime(p.startTime), duration = Math.max(15, Math.min(1440, Math.round(Number(p.durationMinutes) || 60)));
    if (!(await owned("tasks", email, { id }))[0]) return fail("Tarea no encontrada.", 404);
    if (!title || !DATE.test(dueDate) || startTime === null) return fail("Completá una tarea válida.");
    const projectId = Number(p.projectId) || null;
    if (projectId && !(await owned("focus_projects", email, { id: projectId }))[0]) return fail("Proyecto no encontrado.", 404);
    const rows = await updateRows<ProgressRow>("tasks", { id, userEmail: email }, { title, dueDate, startTime, durationMinutes: duration, projectId }, true);
    return patched({ upsert: { tasks: rows } });
  },
  toggle_task: async ({ p, email }) => {
    const id = Number(p.id);
    if (!(await owned("tasks", email, { id }))[0]) return fail("Tarea no encontrada.", 404);
    const rows = await updateRows<ProgressRow>("tasks", { id, userEmail: email }, { completedAt: p.completed ? now() : null }, true);
    return patched({ upsert: { tasks: rows } });
  },
  toggle_event: async ({ p, email }) => {
    const id = Number(p.id);
    if (!(await owned("calendar_events", email, { id }))[0]) return fail("Evento no encontrado.", 404);
    const rows = await updateRows<ProgressRow>("calendar_events", { id, userEmail: email }, { completedAt: p.completed ? now() : null }, true);
    return patched({ upsert: { events: rows } });
  },
  delete_task: async ({ p, email }) => { const id = Number(p.id); await deleteRows("tasks", { id, userEmail: email }); return patched({ remove: { tasks: [id] } }); },
  add_event: async ({ p, email }) => {
    const title = String(p.title ?? "").trim().slice(0, 180), eventDate = String(p.eventDate ?? ""), eventTime = cleanTime(p.eventTime), category = String(p.category ?? "personal");
    const disciplineId = category === "training" ? Number(p.disciplineId) || null : null;
    if (!title || !DATE.test(eventDate) || eventTime === null || !["personal", "study", "work", "training", "nutrition", "sleep", "reading", "health", "other"].includes(category)) return fail("Completá un evento válido.");
    if (disciplineId && !(await owned("training_disciplines", email, { id: disciplineId }))[0]) return fail("Disciplina no encontrada.", 404);
    const rows = await insertRows<ProgressRow>("calendar_events", { userEmail: email, title, eventDate, eventTime, durationMinutes: Math.max(15, Math.min(1440, Math.round(Number(p.durationMinutes) || 60))), category, notes: String(p.notes ?? "").slice(0, 1500), ...(disciplineId ? { disciplineId } : {}) }, { returnRows: true });
    return patched({ upsert: { events: rows } });
  },
  update_event: async ({ p, email }) => {
    const id = Number(p.id), title = String(p.title ?? "").trim().slice(0, 180), eventDate = String(p.eventDate ?? ""), eventTime = cleanTime(p.eventTime), category = String(p.category ?? "personal"), duration = Math.max(15, Math.min(1440, Math.round(Number(p.durationMinutes) || 60)));
    const disciplineId = category === "training" ? Number(p.disciplineId) || null : null;
    if (!(await owned("calendar_events", email, { id }))[0]) return fail("Evento no encontrado.", 404);
    if (!title || !DATE.test(eventDate) || eventTime === null || !["personal", "study", "work", "training", "nutrition", "sleep", "reading", "health", "other"].includes(category)) return fail("Completá un evento válido.");
    if (disciplineId && !(await owned("training_disciplines", email, { id: disciplineId }))[0]) return fail("Disciplina no encontrada.", 404);
    const rows = await updateRows<ProgressRow>("calendar_events", { id, userEmail: email }, { title, eventDate, eventTime, durationMinutes: duration, category, disciplineId }, true);
    return patched({ upsert: { events: rows } });
  },
  delete_event: async ({ p, email }) => { const id = Number(p.id); await deleteRows("calendar_events", { id, userEmail: email }); return patched({ remove: { events: [id] } }); },
};
