import { getChatGPTUser } from "./chatgpt-auth";
import AuthPanel from "./auth-panel";
import NewUserPreview from "./new-user-preview";
import ProgressClient from "./progress-client";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams?: Promise<{ demo?: string }> }) {
  const params = searchParams ? await searchParams : {};
  if (params.demo === "new-user") return <NewUserPreview />;

  const user = await getChatGPTUser();
  if (user) {
    return <ProgressClient initialUser={{
      displayName: user.displayName,
      email: user.email,
      onboardingCompleted: user.onboardingCompleted,
      mainGoals: user.mainGoals,
      usagePreferences: user.usagePreferences,
      isPro: false,
      proSince: "",
    }} />;
  }
  return <AuthPanel />;
}
