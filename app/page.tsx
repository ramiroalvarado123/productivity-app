import { getChatGPTUser } from "./chatgpt-auth";
import AuthPanel from "./auth-panel";
import NewUserPreview from "./new-user-preview";
import ProgressClient from "./progress-client";
import { selectRows } from "./lib/supabase-db";

export const dynamic = "force-dynamic";

type ProfileRow = Record<string, unknown> & {
  displayName: string;
  onboardingCompleted: boolean;
  mainGoalsJson: string;
  usagePreferencesJson: string;
  proSince: string | null;
};

function stringArray(value: unknown) {
  try {
    const parsed = JSON.parse(String(value ?? "[]"));
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

const onboardingErrors: Record<string, string> = {
  invalid: "Revisá tu nombre y elegí entre 1 y 3 prioridades.",
  session: "Tu sesión venció. Volvé a iniciar sesión.",
  save: "No pudimos guardar tus prioridades. Intentá nuevamente.",
};

export default async function Home({ searchParams }: { searchParams?: Promise<{ demo?: string; onboarding_error?: string }> }) {
  const params = searchParams ? await searchParams : {};
  if (params.demo === "new-user") return <NewUserPreview />;

  const user = await getChatGPTUser();
  if (user) {
    let profile: ProfileRow | undefined;
    try {
      profile = (await selectRows<ProfileRow>("profiles", { where: { email: user.email }, limit: 1 }))[0];
    } catch (error) {
      console.error("home profile", error);
    }
    const persistedOnboarding = profile?.onboardingCompleted === true;
    return <ProgressClient initialUser={{
      displayName: profile?.displayName || user.displayName,
      email: user.email,
      onboardingCompleted: persistedOnboarding || user.onboardingCompleted,
      mainGoals: persistedOnboarding ? stringArray(profile?.mainGoalsJson) : user.mainGoals,
      usagePreferences: persistedOnboarding ? stringArray(profile?.usagePreferencesJson) : user.usagePreferences,
      isPro: Boolean(profile?.proSince),
      proSince: profile?.proSince ?? "",
    }} initialError={params.onboarding_error ? onboardingErrors[params.onboarding_error] : undefined} />;
  }
  return <AuthPanel />;
}
