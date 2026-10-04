import { getChatGPTUser, updateChatGPTUserMetadata } from "@/server/auth/session";
import { insertRows, selectRows, updateRows } from "@/server/db/postgrest";
import { profilePreferences, usagePreferencesJsonWithPreferences } from "@/domain/profile-metadata";

type ProfileRow = Record<string, unknown> & { email: string; displayName: string; usagePreferencesJson: string };
function fail(message: string, status = 400) { return Response.json({ error: message }, { status }); }

async function profileForCurrentUser() {
  const user = await getChatGPTUser();
  if (!user) return null;
  await insertRows("profiles", { email: user.email, displayName: user.displayName }, { upsert: true, onConflict: ["email"], ignoreDuplicates: true });
  const profile = (await selectRows<ProfileRow>("profiles", { where: { email: user.email }, limit: 1 }))[0];
  return { user, profile };
}

export async function GET() {
  try {
    const current = await profileForCurrentUser();
    if (!current) return fail("Necesitás iniciar sesión.", 401);
    const usagePreferences = profilePreferences(current.profile?.usagePreferencesJson);
    return Response.json({ displayName: current.profile?.displayName || current.user.displayName, email: current.user.email, weeklySummary: usagePreferences.includes("weekly") });
  } catch { return fail("No pudimos cargar la configuración.", 500); }
}

export async function POST(request: Request) {
  try {
    const current = await profileForCurrentUser();
    if (!current) return fail("Necesitás iniciar sesión.", 401);
    const body = await request.json().catch(() => null) as { displayName?: unknown; weeklySummary?: unknown } | null;
    if (!body) return fail("Datos inválidos.");
    const requestedName = String(body.displayName ?? "").trim();
    const displayName = (requestedName || current.profile?.displayName || current.user.displayName).trim().slice(0, 60);
    if (displayName.length < 2) return fail("El nombre debe tener al menos 2 caracteres.");
    const currentPreferences = profilePreferences(current.profile?.usagePreferencesJson);
    const weeklySummary = typeof body.weeklySummary === "boolean" ? body.weeklySummary : currentPreferences.includes("weekly");
    const usagePreferences = Array.from(new Set([...currentPreferences.filter((item) => item !== "weekly"), ...(weeklySummary ? ["weekly"] : [])]));
    await updateRows("profiles", { email: current.user.email }, { displayName, usagePreferencesJson: usagePreferencesJsonWithPreferences(current.profile?.usagePreferencesJson, usagePreferences), updatedAt: new Date().toISOString() });
    await updateChatGPTUserMetadata({ displayName, onboardingCompleted: current.user.onboardingCompleted, mainGoals: current.user.mainGoals, usagePreferences });
    return Response.json({ ok: true, displayName, weeklySummary });
  } catch { return fail("No pudimos guardar la configuración.", 500); }
}
