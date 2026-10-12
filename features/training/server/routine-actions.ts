import { fail, patched } from "@/server/http";
import { deleteRows, insertRows, selectRows, updateRows } from "@/server/db/postgrest";
import { now, owned } from "@/server/db/rows";
import type { ProgressRow } from "@/server/db/rows";
import { MAX_ROUTINES, cleanRoutineExercises, cleanRoutineName, routineFromRow } from "@/features/training/logic/routines";
import type { ActionMap } from "@/server/progress/types";

/** La tabla se crea con supabase/training-routines.sql; hasta entonces las acciones avisan en vez de romper. */
function isMissingRoutinesTable(cause: unknown) {
  const message = cause instanceof Error ? cause.message : String(cause);
  return /PGRST205|42P01/.test(message) || (/training_routines/.test(message) && /schema cache|does not exist|not found|404/i.test(message));
}
const MISSING_TABLE = "Para guardar rutinas falta correr supabase/training-routines.sql en Supabase.";

export const routineActions: ActionMap = {
  // Crea o edita una rutina: nombre + lista de ejercicios (con series sugeridas, opcionales).
  save_routine: async ({ p, email }) => {
    const id = Number(p.id) || 0;
    const name = cleanRoutineName(p.name);
    const exercises = cleanRoutineExercises(p.exercises);
    if (!name) return fail("Ponele un nombre a la rutina.");
    if (!exercises.length) return fail("Agregá al menos un ejercicio a la rutina.");
    try {
      const existing = await selectRows<ProgressRow>("training_routines", { where: { userEmail: email } });
      if (id && !existing.some((row) => row.id === id)) return fail("Rutina no encontrada.", 404);
      if (existing.some((row) => row.id !== id && String(row.name).toLowerCase() === name.toLowerCase())) return fail("Ya tenés una rutina con ese nombre.");
      const values = { name, exercisesJson: JSON.stringify(exercises) };
      if (id) {
        const rows = await updateRows<ProgressRow>("training_routines", { id, userEmail: email }, { ...values, updatedAt: now() }, true);
        return patched({ upsert: { routines: rows.map(routineFromRow) } });
      }
      if (existing.length >= MAX_ROUTINES) return fail(`Podés guardar hasta ${MAX_ROUTINES} rutinas.`);
      const rows = await insertRows<ProgressRow>("training_routines", { userEmail: email, ...values }, { returnRows: true });
      return patched({ upsert: { routines: rows.map(routineFromRow) } });
    } catch (cause) {
      if (isMissingRoutinesTable(cause)) return fail(MISSING_TABLE, 503);
      throw cause;
    }
  },
  delete_routine: async ({ p, email }) => {
    const id = Number(p.id);
    try {
      if (!id || !(await owned("training_routines", email, { id }))[0]) return fail("Rutina no encontrada.", 404);
      await deleteRows("training_routines", { id, userEmail: email });
      return patched({ remove: { routines: [id] } });
    } catch (cause) {
      if (isMissingRoutinesTable(cause)) return fail(MISSING_TABLE, 503);
      throw cause;
    }
  },
};
