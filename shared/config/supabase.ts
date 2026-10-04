export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://fajvufcwkevwznudrxgp.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_S0I-uGMT6rOyP29pw1QZTw_CPH_u8Z6";

export const ACCESS_COOKIE = "avora_access_token";
export const REFRESH_COOKIE = "avora_refresh_token";

export type SupabaseSession = {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  token_type?: string;
  user?: SupabaseUser;
};

export type SupabaseUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

export function authHeaders(accessToken?: string) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

export function displayNameFor(user: SupabaseUser) {
  const metadata = user.user_metadata ?? {};
  const name = metadata.full_name ?? metadata.name ?? metadata.display_name;
  return typeof name === "string" && name.trim() ? name.trim() : (user.email ?? "Usuario AVORA");
}
