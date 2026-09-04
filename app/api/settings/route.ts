import { getChatGPTUser, updateChatGPTUserMetadata } from "../../chatgpt-auth";
import { insertRows, selectRows, updateRows } from "../../lib/supabase-db";

type ProfileRow = Record<string, unknown> & {
  email: string;
  displayName: string;
  usagePreferencesJson: string;
};

function stringArray(value: unknown) {
  try {
    const parsed = JSON.parse(String(value ?? "[]"));
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function fail(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

async function profileForCurrentUser() {
  const user = await getChatGPTUser();
  if (!user) return null;
  await insertRows("profiles", { email: user.email, displayName: user.displayName }, {
    upsert: true,
    onConflict: ["email"],
    ignoreDuplicates: true,
  });
  const profile = (await selectRows<ProfileRow>("profiles", { where: { email: user.email }, limit: 1 }))[0];
  return { user, profile };
}

export async function GET() {
  try {
    const current = await profileForCurrentUser();
    if (!current) return fail("Necesitás iniciar sesión.", 401);
    const usagePreferences = stringArray(current.profile?.usagePreferencesJson);
    return Response.json({
      displayName: current.profile?.displayName || current.user.displayName,
      email: current.user.email,
      weeklySummary: usagePreferences.includes("weekly"),
    });
  } catch {
    return fail("No pudimos cargar la configuración.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const current = await profileForCurrentUser();
    if (!current) return fail("Necesitás iniciar sesión.", 401);
    const body = await request.json().catch(() => null) as { displayName?: unknown; weeklySummary?: unknown } | null;
    if (!body) return fail("Datos inválidos.");

    const displayName = String(body.displayName ?? current.profile?.displayName ?? current.user.displayName).trim().slice(0, 60);
    if (displayName.length < 2) return fail("El nombre debe tener al menos 2 caracteres.");

    const currentPreferences = stringArray(current.profile?.usagePreferencesJson);
    const weeklySummary = typeof body.weeklySummary === "boolean" ? body.weeklySummary : currentPreferences.includes("weekly");
    const usagePreferences = Array.from(new Set([
      ...currentPreferences.filter((item) => item !== "weekly"),
      ...(weeklySummary ? ["weekly"] : []),
    ]));

    await updateRows("profiles", { email: current.user.email }, {
      displayName,
      usagePreferencesJson: JSON.stringify(usagePreferences),
      updatedAt: new Date().toISOString(),
    });
    await updateChatGPTUserMetadata({ displayName, usagePreferences });

    return Response.json({ ok: true, displayName, weeklySummary });
  } catch {
    return fail("No pudimos guardar la configuración.", 500);
  }
}
