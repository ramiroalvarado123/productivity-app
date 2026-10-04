import { getSessionUser } from "@/server/auth/session";
import AuthPanel from "@/features/auth/components/auth-panel";
import NewUserPreview from "@/features/onboarding/components/new-user-preview";
import ProgressClient from "@/features/app-shell/progress-app";
import { selectRows } from "@/server/db/postgrest";
import { readPendingInvite } from "@/server/auth/cookies";
import { profilePreferences } from "@/domain/profile-metadata";

export const dynamic = "force-dynamic";

type ProfileRow = Record<string, unknown> & {
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
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
  invalid: "Revisá tu nombre, tu nombre de usuario y elegí entre 1 y 3 prioridades.",
  session: "Tu sesión venció. Volvé a iniciar sesión.",
  save: "No pudimos guardar tus prioridades. Intentá nuevamente.",
  username_taken: "Ese nombre de usuario ya está en uso. Elegí otro.",
};

const inviteNotices: Record<string, string> = {
  pending: "Iniciá sesión o creá tu cuenta y sumamos a tu amigo apenas entres.",
  ok: "",
  error: "",
};

export default async function Home({ searchParams }: { searchParams?: Promise<{ demo?: string; onboarding_error?: string; invite?: string; tour?: string }> }) {
  const params = searchParams ? await searchParams : {};
  if (params.demo === "new-user") return <NewUserPreview />;

  const user = await getSessionUser();
  if (user) {
    let profile: ProfileRow | undefined;
    try {
      profile = (await selectRows<ProfileRow>("profiles", { where: { email: user.email }, limit: 1 }))[0];
    } catch (error) {
      console.error("home profile", error);
    }
    const persistedOnboarding = profile?.onboardingCompleted === true;
    // Un link de invitación abierto sin sesión deja el código esperando en una
    // cookie: el cliente lo canjea apenas monta y la ruta lo borra.
    const pendingInvite = await readPendingInvite();
    return <ProgressClient pendingInviteCode={pendingInvite} inviteResult={params.invite === "ok" ? "ok" : params.invite === "error" ? "error" : ""} showTutorial={params.tour === "1"} initialUser={{
      displayName: profile?.displayName || user.displayName,
      username: profile?.username || "",
      avatarUrl: profile?.avatarUrl || "",
      email: user.email,
      onboardingCompleted: persistedOnboarding || user.onboardingCompleted,
      mainGoals: persistedOnboarding ? stringArray(profile?.mainGoalsJson) : user.mainGoals,
      usagePreferences: persistedOnboarding ? profilePreferences(profile?.usagePreferencesJson) : user.usagePreferences,
      isPro: Boolean(profile?.proSince),
      proSince: profile?.proSince ?? "",
    }} initialError={params.onboarding_error ? onboardingErrors[params.onboarding_error] : undefined} />;
  }
  return <AuthPanel notice={params.invite ? inviteNotices[params.invite] ?? "" : ""} />;
}
