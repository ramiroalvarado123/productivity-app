import { ok, fail, isMissingRpc, patched } from "@/server/http";
import { callRpc, camelRow, deleteRows, insertRows, selectRows, updateRows } from "@/server/db/postgrest";
import { owned } from "@/server/db/rows";
import type { ProgressRow } from "@/server/db/rows";
import { DATE, isRecord, numeric, decimal } from "@/domain/validation";
import { trainingQuality, trainingPriority } from "@/features/training/server/validation";
import type { ActionHandler, ActionMap } from "@/server/progress/types";

const saveTrainingHandler: ActionHandler = async ({ p, action, email }) => {
    const disciplineId = Number(p.disciplineId), date = String(p.date ?? ""); if (!disciplineId || !DATE.test(date) || !(await owned("training_disciplines", email, { id: disciplineId }))[0]) return fail("Elegí una disciplina y fecha válidas.");
    const logs = await insertRows<ProgressRow>("training_logs", { userEmail: email, disciplineId, trainingDate: date, durationMinutes: decimal(p.durationMinutes, 1440), distanceMeters: Math.max(0, Math.min(1e6, Math.round(numeric(p.distanceKm) * 1000))), notes: String(p.notes ?? "").trim().slice(0, 1500) }, { upsert: true, onConflict: ["userEmail", "disciplineId", "trainingDate"], returnRows: true });
    if (action === "add_exercise") { const exercise = String(p.exercise ?? "").trim().slice(0, 80); if (!exercise) return fail("Completá el ejercicio."); const exerciseRows = await insertRows<ProgressRow>("exercise_logs", { userEmail: email, trainingLogId: logs[0].id, exercise, weightDeciKg: Math.max(0, Math.min(10000, Math.round(numeric(p.weightKg) * 10))), sets: Math.max(0, Math.min(100, Math.round(Number(p.sets) || 0))), reps: Math.max(0, Math.min(1000, Math.round(Number(p.reps) || 0))), isRecord: Boolean(p.isRecord) }, { returnRows: true }); return patched({ upsert: { trainingLogs: logs, exerciseLogs: exerciseRows } }); } return patched({ upsert: { trainingLogs: logs } });
  };

export const trainingActions: ActionMap = {
  toggle_gym: async ({ p, email }) => {
    const date = String(p.date ?? ""); if (!DATE.test(date)) return fail("Fecha inválida."); let strength = (await selectRows<ProgressRow>("training_disciplines", { where: { userEmail: email, kind: "strength" }, limit: 1 }))[0];
    if (!strength) strength = (await insertRows<ProgressRow>("training_disciplines", { userEmail: email, name: "Gimnasio", kind: "strength" }, { upsert: true, onConflict: ["userEmail", "name"], returnRows: true }))[0];
    const row = (await owned("training_logs", email, { disciplineId: strength.id, trainingDate: date }))[0]; if (row) await deleteRows("training_logs", { id: row.id, userEmail: email }); else await insertRows("training_logs", { userEmail: email, disciplineId: strength.id, trainingDate: date }, { upsert: true, onConflict: ["userEmail", "disciplineId", "trainingDate"], ignoreDuplicates: true }); return ok();
  },
  add_discipline: async ({ p, email }) => { const name = String(p.name ?? "").trim().slice(0, 50), kind = String(p.kind ?? "other"); if (!name || !["strength", "running", "cycling", "swimming", "sport", "other"].includes(kind)) return fail("Disciplina inválida."); await insertRows("training_disciplines", { userEmail: email, name, kind, priority: "important" }, { upsert: true, onConflict: ["userEmail", "name"], ignoreDuplicates: true }); return ok(); },
  set_discipline_priority: async ({ p, email }) => {
    const disciplineId = Number(p.disciplineId), priority = trainingPriority(p.priority);
    if (!disciplineId || !priority || !(await owned("training_disciplines", email, { id: disciplineId }))[0]) return fail("Preferencia de disciplina inválida.");
    await updateRows("training_disciplines", { id: disciplineId, userEmail: email }, { priority });
    return ok();
  },
  delete_discipline: async ({ p, email }) => {
    const disciplineId = Number(p.disciplineId);
    const discipline = (await owned("training_disciplines", email, { id: disciplineId }))[0];
    if (!discipline) return fail("Disciplina no encontrada.", 404);
    const disciplines = await selectRows<ProgressRow>("training_disciplines", { where: { userEmail: email } });
    if (disciplines.length <= 1) return fail("Tiene que quedar al menos una disciplina.");
    await deleteRows("training_disciplines", { id: disciplineId, userEmail: email });
    return ok();
  },
  set_training_quality: async ({ p, email }) => {
    const disciplineId = Number(p.disciplineId), date = String(p.date ?? ""), quality = trainingQuality(p.quality);
    if (!disciplineId || !DATE.test(date) || quality === undefined || !(await owned("training_disciplines", email, { id: disciplineId }))[0]) return fail("Valoración inválida.");
    const row = (await owned("training_logs", email, { disciplineId, trainingDate: date }))[0];
    if (!row) return fail("Marcá el entrenamiento primero.");
    const rows = await updateRows<ProgressRow>("training_logs", { id: row.id, userEmail: email }, { quality }, true);
    return patched({ upsert: { trainingLogs: rows } });
  },
  set_plan_training_quality: async ({ p, email }) => {
    const eventId = Number(p.eventId), quality = trainingQuality(p.quality);
    const event = (await owned("calendar_events", email, { id: eventId }))[0];
    if (!event || event.kind !== "training" && String(event.category ?? "") !== "training" || quality === undefined) return fail("Valoración inválida.");
    const rows = await updateRows<ProgressRow>("calendar_events", { id: eventId, userEmail: email }, { quality }, true);
    return patched({ upsert: { events: rows } });
  },
  // Una sola llamada a Postgres (supabase/performance.sql); si la función todavía
  // no existe, cae al camino de varias consultas de siempre.
  toggle_training: async ({ p, email }) => {
    const disciplineId = Number(p.disciplineId), date = String(p.date ?? "");
    if (!disciplineId || !DATE.test(date)) return fail("Entrenamiento inválido.");
    try {
      const result = await callRpc<{ removed?: number; row?: Record<string, unknown> }>("avora_toggle_training", { p_discipline_id: disciplineId, p_date: date });
      if (result?.removed) return patched({ remove: { trainingLogs: [Number(result.removed)] } });
      return patched({ upsert: { trainingLogs: result?.row ? [camelRow<ProgressRow>(result.row)] : [] } });
    } catch (cause) {
      if (!isMissingRpc(cause)) {
        // Los `raise exception` de la función ya traen el texto para la persona; cualquier otra cosa es un error real.
        const message = cause instanceof Error ? cause.message : "";
        if (message.startsWith("Este día tiene detalles")) return fail(message, 409);
        if (message === "Entrenamiento inválido.") return fail(message);
        throw cause;
      }
    }
    if (!(await owned("training_disciplines", email, { id: disciplineId }))[0]) return fail("Entrenamiento inválido.");
    const row = (await owned("training_logs", email, { disciplineId, trainingDate: date }))[0];
    if (row) { if (row.durationMinutes || row.distanceMeters || row.notes || (await owned("exercise_logs", email, { trainingLogId: row.id }))[0]) return fail("Este día tiene detalles cargados. Borrá sus registros antes de desmarcarlo.", 409); await deleteRows("training_logs", { id: row.id, userEmail: email }); return patched({ remove: { trainingLogs: [row.id] } }); }
    const created = await insertRows<ProgressRow>("training_logs", { userEmail: email, disciplineId, trainingDate: date }, { upsert: true, onConflict: ["userEmail", "disciplineId", "trainingDate"], ignoreDuplicates: true, returnRows: true }); return patched({ upsert: { trainingLogs: created } });
  },
  save_training: saveTrainingHandler,
  add_exercise: saveTrainingHandler,
  update_exercise: async ({ p, email }) => {
    const id = Number(p.id);
    const existing = await selectRows("exercise_logs", { where: { id, userEmail: email }, limit: 1 });
    if (!existing[0]) return fail("Ejercicio no encontrado.", 404);
    const exercise = String(p.exercise ?? "").trim().slice(0, 80);
    if (!exercise) return fail("Completá el ejercicio.");
    const rows = await updateRows<ProgressRow>("exercise_logs", { id, userEmail: email }, {
      exercise,
      weightDeciKg: Math.max(0, Math.min(10000, Math.round(numeric(p.weightKg) * 10))),
      sets: Math.max(0, Math.min(100, Math.round(Number(p.sets) || 0))),
      reps: Math.max(0, Math.min(1000, Math.round(Number(p.reps) || 0))),
      isRecord: Boolean(p.isRecord),
    }, true);
    return patched({ upsert: { exerciseLogs: rows } });
  },
  // La planilla de gimnasio guarda la sesión completa de una vez: actualiza
  // las filas que ya existían, inserta las nuevas y borra las que se quitaron.
  save_exercises: async ({ p, email }) => {
    const disciplineId = Number(p.disciplineId), date = String(p.date ?? "");
    if (!disciplineId || !DATE.test(date)) return fail("Elegí una disciplina y fecha válidas.");
    const incoming = (Array.isArray(p.exercises) ? p.exercises.filter(isRecord) : []).slice(0, 60).map((row) => ({
      id: Number(row.id) || 0,
      exercise: String(row.exercise ?? "").trim().slice(0, 80),
      weightDeciKg: Math.max(0, Math.min(10000, Math.round(numeric(row.weightKg) * 10))),
      sets: Math.max(0, Math.min(100, Math.round(Number(row.sets) || 0))),
      reps: Math.max(0, Math.min(1000, Math.round(Number(row.reps) || 0))),
      isRecord: Boolean(row.isRecord),
    }));
    if (incoming.some((row) => !row.exercise)) return fail("Completá el nombre de cada ejercicio.");
    // Una sola llamada a Postgres; si la función todavía no existe, sigue el camino de siempre.
    try {
      const result = await callRpc<{ log: Record<string, unknown> | null; rows: Record<string, unknown>[]; removed: number[] }>("avora_save_exercises", {
        p_discipline_id: disciplineId,
        p_date: date,
        p_exercises: incoming.map((row) => ({ id: row.id || null, exercise: row.exercise, weight_deci_kg: row.weightDeciKg, sets: row.sets, reps: row.reps, is_record: row.isRecord })),
      });
      if (!result?.log) return patched({});
      return patched({
        upsert: { trainingLogs: [camelRow<ProgressRow>(result.log)], exerciseLogs: (result.rows ?? []).map((row) => camelRow<ProgressRow>(row)) },
        ...(result.removed?.length ? { remove: { exerciseLogs: result.removed.map(Number) } } : {}),
      });
    } catch (cause) {
      if (!isMissingRpc(cause)) {
        if (cause instanceof Error && cause.message === "Elegí una disciplina y fecha válidas.") return fail(cause.message);
        throw cause;
      }
    }
    if (!(await owned("training_disciplines", email, { id: disciplineId }))[0]) return fail("Elegí una disciplina y fecha válidas.");
    let log = (await owned("training_logs", email, { disciplineId, trainingDate: date }))[0];
    if (!log) {
      if (!incoming.length) return patched({});
      log = (await insertRows<ProgressRow>("training_logs", { userEmail: email, disciplineId, trainingDate: date }, { upsert: true, onConflict: ["userEmail", "disciplineId", "trainingDate"], returnRows: true }))[0];
    }
    const existing = await selectRows<ProgressRow>("exercise_logs", { where: { userEmail: email, trainingLogId: log.id } });
    const existingIds = new Set(existing.map((row) => row.id));
    const toUpdate = incoming.filter((row) => existingIds.has(row.id));
    const toInsert = incoming.filter((row) => !existingIds.has(row.id));
    const keptIds = new Set(toUpdate.map((row) => row.id));
    const toDelete = existing.filter((row) => !keptIds.has(row.id)).map((row) => row.id);
    const fields = ({ exercise, weightDeciKg, sets, reps, isRecord }: typeof incoming[number]) => ({ exercise, weightDeciKg, sets, reps, isRecord });
    const [updated, inserted] = await Promise.all([
      Promise.all(toUpdate.map((row) => updateRows<ProgressRow>("exercise_logs", { id: row.id, userEmail: email }, fields(row), true))).then((rows) => rows.flat()),
      toInsert.length ? insertRows<ProgressRow>("exercise_logs", toInsert.map((row) => ({ userEmail: email, trainingLogId: log.id, ...fields(row) })), { returnRows: true }) : Promise.resolve([] as ProgressRow[]),
      Promise.all(toDelete.map((id) => deleteRows("exercise_logs", { id, userEmail: email }))),
    ]);
    return patched({ upsert: { trainingLogs: [log], exerciseLogs: [...updated, ...inserted] }, ...(toDelete.length ? { remove: { exerciseLogs: toDelete } } : {}) });
  },
  delete_exercise: async ({ p, email }) => { const id = Number(p.id); await deleteRows("exercise_logs", { id, userEmail: email }); return patched({ remove: { exerciseLogs: [id] } }); },
};
