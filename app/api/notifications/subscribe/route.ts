import { deleteRows, insertRows } from "@/server/db/postgrest";
import { getChatGPTUser } from "@/server/auth/session";

function fail(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

function isValidEndpoint(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("https://") && value.length <= 2000;
}

export async function POST(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return fail("Necesitás iniciar sesión.", 401);
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const subscription = body?.subscription;
    if (!subscription || typeof subscription !== "object" || Array.isArray(subscription)) return fail("Suscripción inválida.");
    const value = subscription as Record<string, unknown>;
    const endpoint = value.endpoint;
    const keys = value.keys;
    if (!isValidEndpoint(endpoint) || !keys || typeof keys !== "object" || Array.isArray(keys)) return fail("Suscripción inválida.");
    const keyValues = keys as Record<string, unknown>;
    const p256dh = keyValues.p256dh;
    const auth = keyValues.auth;
    if (typeof p256dh !== "string" || !p256dh || p256dh.length > 500 || typeof auth !== "string" || !auth || auth.length > 500) return fail("Claves de suscripción inválidas.");

    await insertRows("profiles", { email: user.email, displayName: user.displayName }, { upsert: true, onConflict: ["email"], ignoreDuplicates: true });
    const clientContext = body?.clientContext === "app" ? "app" : "browser";
    try {
      await insertRows("push_subscriptions", {
        userEmail: user.email,
        endpoint,
        p256dh,
        auth,
        userAgent: String(body?.userAgent ?? "").slice(0, 500),
        clientContext,
        updatedAt: new Date().toISOString(),
      }, { upsert: true, onConflict: ["endpoint"] });
    } catch (error) {
      // Compatibilidad temporal con bases que aún no tienen la columna nueva.
      console.warn("push subscription context column unavailable", error);
      await insertRows("push_subscriptions", {
        userEmail: user.email,
        endpoint,
        p256dh,
        auth,
        userAgent: String(body?.userAgent ?? "").slice(0, 500),
        updatedAt: new Date().toISOString(),
      }, { upsert: true, onConflict: ["endpoint"] });
    }
    // Activar el permiso en la misma operación para evitar una segunda
    // llamada de red al guardar las preferencias.
    await insertRows("notification_preferences", {
      userEmail: user.email,
      pushEnabled: true,
    }, { upsert: true, onConflict: ["userEmail"] });

    return Response.json({ ok: true });
  } catch (error) {
    console.error("notifications subscribe failed", error);
    return fail("No pudimos activar las notificaciones.", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return fail("Necesitás iniciar sesión.", 401);
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const endpoint = body?.endpoint;
    if (!isValidEndpoint(endpoint)) return fail("Endpoint inválido.");
    await deleteRows("push_subscriptions", { userEmail: user.email, endpoint });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("notifications unsubscribe failed", error);
    return fail("No pudimos desactivar las notificaciones.", 500);
  }
}
