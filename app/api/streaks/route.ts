import { getChatGPTUser } from "../../chatgpt-auth";
import {
  declineAppStreakRestore,
  dismissAppStreakLoss,
  recordAppUse,
  restoreAppStreak,
  type AppEngagement,
  type EngagementPrompt,
} from "../../lib/app-engagement";
import { dateInTimeZone } from "../../lib/format";
import { profileEngagement, usagePreferencesJsonWithEngagement } from "../../lib/profile-metadata";
import { insertRows, selectRows, updateRows } from "../../lib/supabase-db";

type ProfileRow = Record<string, unknown> & {
  email: string;
  displayName: string;
  usagePreferencesJson: string;
};

function fail(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return fail("Necesitás iniciar sesión.", 401);

    const body = await request.json().catch(() => null) as { action?: unknown } | null;
    const action = String(body?.action ?? "");
    if (!["visit", "restore", "decline", "dismiss_loss"].includes(action)) return fail("Acción de racha inválida.");

    // La primera sesión de una cuenta suele terminar de crear el perfil en el
    // onboarding. Este upsert cubre también perfiles creados desde otra ruta.
    await insertRows("profiles", {
      email: user.email,
      displayName: user.displayName,
    }, { upsert: true, onConflict: ["email"], ignoreDuplicates: true });

    const profile = (await selectRows<ProfileRow>("profiles", { where: { email: user.email }, limit: 1 }))[0];
    if (!profile) return fail("No pudimos cargar tu perfil.", 404);

    const current = profileEngagement(profile.usagePreferencesJson);
    let next: AppEngagement;
    let prompt: EngagementPrompt = null;
    if (action === "visit") {
      const result = recordAppUse(current, dateInTimeZone("America/Argentina/Buenos_Aires"));
      next = result.state;
      prompt = result.prompt;
    } else if (action === "restore") {
      const result = restoreAppStreak(current);
      next = result.state;
      prompt = result.prompt;
    } else if (action === "decline") {
      next = declineAppStreakRestore(current);
    } else {
      next = dismissAppStreakLoss(current);
    }

    await updateRows("profiles", { email: user.email }, {
      usagePreferencesJson: usagePreferencesJsonWithEngagement(profile.usagePreferencesJson, next),
      updatedAt: new Date().toISOString(),
    });

    return Response.json({ ok: true, state: next, prompt });
  } catch (cause) {
    console.error("streaks POST", cause);
    return fail("No pudimos actualizar tu racha. Intentá nuevamente.", 500);
  }
}
