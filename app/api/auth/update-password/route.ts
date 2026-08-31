import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ACCESS_COOKIE, SUPABASE_URL, authHeaders } from "../../../lib/supabase-auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { password?: string } | null;
  const password = body?.password ?? "";
  if (password.length < 8) return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
  const accessToken = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!accessToken) return NextResponse.json({ error: "La sesión de recuperación venció." }, { status: 401 });
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: "PUT", headers: authHeaders(accessToken), body: JSON.stringify({ password }), cache: "no-store",
  });
  const data = await response.json().catch(() => ({})) as { msg?: string; error_description?: string };
  if (!response.ok) return NextResponse.json({ error: data.error_description ?? data.msg ?? "No pudimos actualizar la contraseña." }, { status: response.status });
  return NextResponse.json({ ok: true });
}
