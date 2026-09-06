import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_COOKIE, SUPABASE_URL, authHeaders, displayNameFor, type SupabaseUser } from "./lib/supabase-auth";

export type ChatGPTUser = {
  displayName: string;
  email: string;
  fullName: string | null;
  onboardingCompleted: boolean;
  mainGoals: string[];
  usagePreferences: string[];
};

function metadataStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: authHeaders(token), cache: "no-store" });
  if (!response.ok) return null;
  const user = await response.json() as SupabaseUser;
  if (!user.email) return null;
  const displayName = displayNameFor(user);
  const metadata = user.user_metadata ?? {};
  return {
    displayName,
    email: user.email,
    fullName: displayName,
    onboardingCompleted: metadata.onboarding_completed === true,
    mainGoals: metadataStringArray(metadata.main_goals),
    usagePreferences: metadataStringArray(metadata.usage_preferences),
  };
}

export async function updateChatGPTUserMetadata(values: {
  displayName: string;
  onboardingCompleted: boolean;
  mainGoals: string[];
  usagePreferences: string[];
}): Promise<boolean> {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) return false;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({
      data: {
        display_name: values.displayName,
        full_name: values.displayName,
        onboarding_completed: values.onboardingCompleted,
        main_goals: values.mainGoals,
        usage_preferences: values.usagePreferences,
      },
    }),
    cache: "no-store",
  });
  return response.ok;
}

export async function requireChatGPTUser(returnTo: string): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;
  redirect(chatGPTSignInPath(returnTo));
}

export function chatGPTSignInPath(returnTo: string): string {
  const next = safeRelativeReturnPath(returnTo);
  return `/?next=${encodeURIComponent(next)}`;
}

export function chatGPTSignOutPath(returnTo = "/"): string {
  return `/signout-with-chatgpt?return_to=${encodeURIComponent(safeRelativeReturnPath(returnTo))}`;
}

function safeRelativeReturnPath(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  try {
    const url = new URL(value, "https://app.local");
    if (url.origin !== "https://app.local") return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return "/"; }
}
