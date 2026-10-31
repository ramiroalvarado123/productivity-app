import { callRpc, deleteRows } from "@/server/db/postgrest";
import { getSessionUser } from "@/server/auth/session";
import { fail, isMissingRpc, ok } from "@/server/http";
import { validDeviceToken } from "@/features/notifications/logic/device-token";

/** Registra el celular (iPhone/Android) de quien tiene la sesión para recibir avisos push. */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return fail("Necesitás iniciar sesión.", 401);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const platform = body?.platform === "ios" || body?.platform === "android" ? body.platform : null;
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  if (!platform || !validDeviceToken(platform, token)) return fail("Dispositivo inválido.");
  try {
    await callRpc("avora_register_push_device", {
      p_token: token,
      p_platform: platform,
      p_app_version: typeof body?.appVersion === "string" ? body.appVersion.slice(0, 40) : "",
    });
    return ok();
  } catch (error) {
    if (isMissingRpc(error)) return fail("Las notificaciones del celular todavía no están habilitadas.", 503);
    console.error("push device register", error);
    return fail("No pudimos activar las notificaciones.", 500);
  }
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) return fail("Necesitás iniciar sesión.", 401);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  if (!token || token.length > 4096) return fail("Dispositivo inválido.");
  try {
    await deleteRows("push_devices", { userEmail: user.email, token });
    return ok();
  } catch (error) {
    console.error("push device remove", error);
    return fail("No pudimos desactivar las notificaciones.", 500);
  }
}
