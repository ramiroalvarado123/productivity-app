import { NextResponse } from "next/server";
import { getChatGPTUser, updateChatGPTUserMetadata } from "@/server/auth/session";
import { insertRows, selectRows } from "@/server/db/postgrest";
import { usagePreferencesJsonWithPreferences } from "@/domain/profile-metadata";

const MONTH = /^\d{4}-\d{2}$/;
const USERNAME = /^[a-z0-9_]{3,20}$/;
const ALLOWED_GOALS = new Set(["training", "nutrition", "focus", "reading", "sleep", "goals"]);
const ALLOWED_PREFERENCES = new Set(["quick", "weekly", "ai"]);

function stringArray(value: FormDataEntryValue | null, allowed: Set<string>) {
  try {
    const parsed = JSON.parse(String(value ?? "[]"));
    return Array.isArray(parsed)
      ? parsed.map(String).filter((item) => allowed.has(item))
      : [];
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return NextResponse.redirect(new URL("/", request.url), 303);

    const form = await request.formData();
    const displayName = String(form.get("displayName") ?? "").trim().slice(0, 60);
    const username = String(form.get("username") ?? "").trim().toLowerCase();
    const mainGoals = stringArray(form.get("mainGoals"), ALLOWED_GOALS).slice(0, 3);
    const usagePreferences = stringArray(form.get("usagePreferences"), ALLOWED_PREFERENCES);
    const monthKey = String(form.get("monthKey") ?? "");

    if (displayName.length < 2 || !USERNAME.test(username) || !mainGoals.length || !MONTH.test(monthKey)) {
      return NextResponse.redirect(new URL("/?onboarding_error=invalid", request.url), 303);
    }

    const now = new Date().toISOString();
    try {
      const currentProfile = (await selectRows<Record<string, unknown> & { usagePreferencesJson?: string }>("profiles", { where: { email: user.email }, limit: 1 }))[0];
      await insertRows("profiles", {
        email: user.email,
        displayName,
        username,
        onboardingCompleted: true,
        mainGoalsJson: JSON.stringify(mainGoals),
        usagePreferencesJson: usagePreferencesJsonWithPreferences(currentProfile?.usagePreferencesJson, usagePreferences),
        updatedAt: now,
      }, { upsert: true, onConflict: ["email"] });
    } catch (error) {
      // El índice único de username es la última defensa si el chequeo en
      // vivo del cliente no corrió (js deshabilitado, carrera entre dos
      // pestañas, etc.).
      const message = error instanceof Error ? error.message : "";
      if (message.includes("profiles_username_key") || message.includes("23505")) {
        return NextResponse.redirect(new URL("/?onboarding_error=username_taken", request.url), 303);
      }
      throw error;
    }

    const weight = (goal: string) => mainGoals.includes(goal) ? 3 : 2;
    await insertRows("monthly_priorities", {
      userEmail: user.email,
      monthKey,
      gymWeight: weight("training"),
      nutritionWeight: weight("nutrition"),
      focusWeight: weight("focus"),
      readingWeight: weight("reading"),
      sleepWeight: weight("sleep"),
      goalsWeight: weight("goals"),
      updatedAt: now,
    }, { upsert: true, onConflict: ["userEmail", "monthKey"] });

    const metadataSaved = await updateChatGPTUserMetadata({
      displayName,
      onboardingCompleted: true,
      mainGoals,
      usagePreferences,
    });
    if (!metadataSaved) console.warn("onboarding: profile saved but auth metadata could not be synchronized");

    // `?tour=1` sólo existe en este redirect puntual: es lo que prende el
    // recorrido guiado la primera vez, sin necesitar guardar un flag aparte.
    return NextResponse.redirect(new URL("/?tour=1", request.url), 303);
  } catch (error) {
    console.error("onboarding POST", error);
    return NextResponse.redirect(new URL("/?onboarding_error=save", request.url), 303);
  }
}
