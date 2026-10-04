import { getSessionUser } from "@/server/auth/session";
import { fail, isTransientSupabaseError, serverTiming } from "@/server/http";
import type { ActionMap } from "@/server/progress/types";
import { readSnapshot } from "@/features/app-shell/server/snapshot";
import { focusActions } from "@/features/focus/server/actions";
import { goalsActions } from "@/features/goals/server/actions";
import { nutritionActions } from "@/features/nutrition/server/actions";
import { planActions } from "@/features/plan/server/actions";
import { readingActions } from "@/features/reading/server/actions";
import { scoreActions } from "@/features/score/server/actions";
import { settingsActions } from "@/features/settings/server/actions";
import { sleepActions } from "@/features/sleep/server/actions";
import { trainingActions } from "@/features/training/server/actions";
import { voiceCheckinActions } from "@/features/voice-checkin/server/actions";

/**
 * Cada acción de guardado vive en `features/<área>/server/actions.ts`.
 * Los nombres y la forma del body no cambian nunca: hay apps instaladas con versiones anteriores.
 */
const actions: ActionMap = {
  ...settingsActions,
  ...trainingActions,
  ...sleepActions,
  ...focusActions,
  ...planActions,
  ...nutritionActions,
  ...readingActions,
  ...scoreActions,
  ...goalsActions,
  ...voiceCheckinActions,
};

export async function GET(request: Request) {
  const timing = serverTiming();
  let response: Response;
  try {
    const user = await getSessionUser();
    timing.mark("auth");
    response = user
      ? Response.json(await readSnapshot(user, new URL(request.url).searchParams, timing))
      : fail("Necesitás iniciar sesión.", 401);
  } catch (cause) {
    console.error("progress GET", cause);
    response = isTransientSupabaseError(cause)
      ? fail("Tuvimos un problema temporal al conectar tus datos. Intentá nuevamente en unos segundos.", 503)
      : fail("No se pudieron cargar tus datos. Verificá Supabase.", 500);
  }
  response.headers.set("Server-Timing", timing.header());
  return response;
}

export async function POST(request: Request) {
  const timing = serverTiming();
  let response: Response;
  try {
    const user = await getSessionUser();
    timing.mark("auth");
    if (!user) {
      response = fail("Necesitás iniciar sesión.", 401);
    } else {
      const p = await request.json() as Record<string, unknown>;
      const action = String(p.action ?? "");
      const handler = actions[action];
      response = handler ? await handler({ p, action, email: user.email, user }) : fail("Acción desconocida.");
      timing.mark("action");
    }
  } catch (cause) {
    console.error("progress POST", cause);
    response = fail("No se pudo guardar. Verificá Supabase.", 500);
  }
  response.headers.set("Server-Timing", timing.header());
  return response;
}
