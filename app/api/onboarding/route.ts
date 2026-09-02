import { NextResponse } from "next/server";
import { getChatGPTUser, updateChatGPTUserMetadata } from "../../chatgpt-auth";
import { insertRows } from "../../lib/supabase-db";

const MONTH = /^\d{4}-\d{2}$/;
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
    const mainGoals = stringArray(form.get("mainGoals"), ALLOWED_GOALS).slice(0, 3);
    const usagePreferences = stringArray(form.get("usagePreferences"), ALLOWED_PREFERENCES);
    const monthKey = String(form.get("monthKey") ?? "");

    if (displayName.length < 2 || !mainGoals.length || !MONTH.test(monthKey)) {
      return NextResponse.redirect(new URL("/?onboarding_error=invalid", request.url), 303);
    }

    const now = new Date().toISOString();
    await insertRows("profiles", {
      email: user.email,
      displayName,
      onboardingCompleted: true,
      mainGoalsJson: JSON.stringify(mainGoals),
      usagePreferencesJson: JSON.stringify(usagePreferences),
      updatedAt: now,
    }, { upsert: true, onConflict: ["email"] });

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

    return NextResponse.redirect(new URL("/", request.url), 303);
  } catch (error) {
    console.error("onboarding POST", error);
    return NextResponse.redirect(new URL("/?onboarding_error=save", request.url), 303);
  }
}
