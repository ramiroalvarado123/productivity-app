import { ok, fail } from "@/server/http";
import { callRpc, selectRows, updateRows } from "@/server/db/postgrest";
import { upsert, now, today } from "@/server/db/rows";
import type { ProgressRow } from "@/server/db/rows";
import { MONTH, USERNAME } from "@/domain/validation";
import { updateAuthMetadata } from "@/server/auth/session";
import { usagePreferencesJsonWithPreferences } from "@/domain/profile-metadata";
import type { ActionMap } from "@/server/progress/types";

export const settingsActions: ActionMap = {
  complete_onboarding: async ({ p, email }) => {
    const displayName = String(p.displayName ?? "").trim().slice(0, 60), goals = Array.isArray(p.mainGoals) ? p.mainGoals.map(String).filter((v: string) => ["training", "nutrition", "focus", "reading", "sleep", "goals"].includes(v)).slice(0, 3) : [], preferences = Array.isArray(p.usagePreferences) ? p.usagePreferences.map(String).filter((v: string) => ["quick", "weekly", "ai"].includes(v)) : [], monthKey = String(p.monthKey ?? "");
    if (displayName.length < 2) return fail("Ingresá tu nombre."); if (!goals.length) return fail("Elegí al menos un objetivo."); if (!MONTH.test(monthKey)) return fail("Mes inválido.");
    const existingProfile = (await selectRows<ProgressRow>("profiles", { where: { email }, limit: 1 }))[0];
    await updateRows("profiles", { email }, { displayName, onboardingCompleted: true, mainGoalsJson: JSON.stringify(goals), usagePreferencesJson: usagePreferencesJsonWithPreferences(existingProfile?.usagePreferencesJson, preferences), updatedAt: now() });
    const weight = (goal: string) => goals.includes(goal) ? 3 : 2; await upsert("monthly_priorities", { userEmail: email, monthKey, gymWeight: weight("training"), nutritionWeight: weight("nutrition"), focusWeight: weight("focus"), readingWeight: weight("reading"), sleepWeight: weight("sleep"), goalsWeight: weight("goals") }, ["userEmail", "monthKey"]);
    if (!await updateAuthMetadata({ displayName, onboardingCompleted: true, mainGoals: goals, usagePreferences: preferences })) console.warn("progress: onboarding saved but auth metadata could not be synchronized");
    return ok();
  },
  set_pro: async ({ p, email }) => { const active = Boolean(p.active); await updateRows("profiles", { email }, { proSince: active ? today() : "", updatedAt: now() }); return ok({ isPro: active }); },
  set_focus_daily_target: async ({ p, email }) => {
    const minutes = Math.round(Number(p.minutes));
    if (!Number.isFinite(minutes) || minutes < 30 || minutes > 720) return fail("Elegí un objetivo diario entre 30 minutos y 12 horas.");
    await updateRows("profiles", { email }, { focusDailyTargetMinutes: minutes, updatedAt: now() });
    return ok({ focusDailyTargetMinutes: minutes });
  },
  // El nombre de usuario reemplaza al email para invitar amigos desde
  // adentro de la app. `avora_find_email_by_username` es security definer
  // porque la política de `profiles` sólo deja ver la fila propia.
  check_username: async ({ p, email }) => {
    const username = String(p.username ?? "").trim().toLowerCase();
    if (!USERNAME.test(username)) return ok({ available: false, reason: "format" });
    const owner = await callRpc<string | null>("avora_find_email_by_username", { p_username: username });
    return ok({ available: !owner || owner === email });
  },
  set_username: async ({ p, email }) => {
    const username = String(p.username ?? "").trim().toLowerCase();
    if (!USERNAME.test(username)) return fail("El nombre de usuario tiene que tener 3 a 20 letras, números o _.");
    const owner = await callRpc<string | null>("avora_find_email_by_username", { p_username: username });
    if (owner && owner !== email) return fail("Ese nombre de usuario ya está en uso.");
    await updateRows("profiles", { email }, { username, updatedAt: now() });
    return ok({ username });
  },
  // Sólo el nombre visible: no toca metas ni preferencias, así que no
  // sincroniza contra la metadata de auth (esa sí las pisa con lo que le
  // pases, y acá no tenemos el valor actual para no perderlas).
  update_profile: async ({ p, email }) => {
    const displayName = String(p.displayName ?? "").trim().slice(0, 60);
    if (displayName.length < 2) return fail("Ingresá tu nombre.");
    await updateRows("profiles", { email }, { displayName, updatedAt: now() });
    return ok({ displayName });
  },
};
