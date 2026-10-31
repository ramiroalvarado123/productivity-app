import type { PushNotificationsPlugin } from "@capacitor/push-notifications";

/**
 * Avisos push dentro de la app de iPhone/Android (Capacitor). Solo se usa cuando `isNativeApp()`.
 * El celular se registra en el servidor (`/api/notifications/devices`) con su token de APNs/FCM.
 */

const TOKEN_KEY = "avora.push-token";
const TOKEN_WAIT_MS = 15_000;

export type NativePushPermission = "granted" | "denied" | "default";
export type NativePushResult = { ok: true } | { ok: false; error: string };

async function plugin(): Promise<PushNotificationsPlugin> {
  return (await import("@capacitor/push-notifications")).PushNotifications;
}

function storedToken() {
  try { return window.localStorage.getItem(TOKEN_KEY) ?? ""; } catch { return ""; }
}
function storeToken(token: string) {
  try { if (token) window.localStorage.setItem(TOKEN_KEY, token); else window.localStorage.removeItem(TOKEN_KEY); } catch { /* sin almacenamiento */ }
}

/** ¿Este celular ya quedó registrado para recibir avisos? */
export function hasNativePushToken() { return Boolean(storedToken()); }

export async function nativePushPermission(): Promise<NativePushPermission> {
  const { receive } = await (await plugin()).checkPermissions();
  return receive === "granted" ? "granted" : receive === "denied" ? "denied" : "default";
}

/** Pide el token al sistema (APNs / FCM). Si el sistema no responde en 15 s, falla. */
async function requestToken(push: PushNotificationsPlugin) {
  const handles: Array<{ remove: () => Promise<void> }> = [];
  try {
    return await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("El celular no devolvió el registro para los avisos.")), TOKEN_WAIT_MS);
      void (async () => {
        handles.push(await push.addListener("registration", ({ value }) => { clearTimeout(timer); resolve(value); }));
        handles.push(await push.addListener("registrationError", ({ error }) => { clearTimeout(timer); reject(new Error(error)); }));
        await push.register();
      })().catch((cause) => { clearTimeout(timer); reject(cause); });
    });
  } finally {
    await Promise.all(handles.map((handle) => handle.remove()));
  }
}

async function sendToServer(token: string): Promise<NativePushResult> {
  const platform = /android/i.test(navigator.userAgent) ? "android" : "ios";
  const response = await fetch("/api/notifications/devices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ token, platform }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    return { ok: false, error: body.error || "No pudimos activar las notificaciones." };
  }
  storeToken(token);
  return { ok: true };
}

/** Pide permiso (si falta), registra el celular y lo da de alta en el servidor. */
export async function enableNativePush(): Promise<NativePushResult> {
  try {
    const push = await plugin();
    let permission = await nativePushPermission();
    if (permission === "default") {
      const { receive } = await push.requestPermissions();
      permission = receive === "granted" ? "granted" : "denied";
    }
    if (permission !== "granted") return { ok: false, error: "Las notificaciones están bloqueadas: activalas desde los Ajustes del celular." };
    return await sendToServer(await requestToken(push));
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : "No pudimos activar las notificaciones." };
  }
}

/** Da de baja este celular en el servidor y se olvida del token. */
export async function disableNativePush(): Promise<void> {
  const token = storedToken();
  storeToken("");
  if (!token) return;
  await fetch("/api/notifications/devices", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ token }),
  }).catch(() => undefined);
}

/**
 * Al abrir la app: los tokens cambian (reinstalación, restauración), así que si los avisos están
 * activos se vuelve a pedir el token y se actualiza en el servidor.
 */
export async function refreshNativePush(): Promise<void> {
  if (!hasNativePushToken() || (await nativePushPermission()) !== "granted") return;
  const preferences = await fetch("/api/notifications/preferences", { cache: "no-store", credentials: "same-origin" }).catch(() => null);
  if (!preferences?.ok) return;
  const body = await preferences.json().catch(() => null) as { pushEnabled?: unknown } | null;
  if (body?.pushEnabled !== true) return;
  await sendToServer(await requestToken(await plugin())).catch(() => undefined);
}

/** Al tocar un aviso se abre la pantalla que indica (solo rutas internas de AVORA). */
export async function listenForPushTaps(): Promise<() => void> {
  const push = await plugin();
  const handle = await push.addListener("pushNotificationActionPerformed", ({ notification }) => {
    const url = (notification.data as { url?: unknown } | undefined)?.url;
    if (typeof url === "string" && url.startsWith("/") && !url.startsWith("//")) window.location.assign(url);
  });
  return () => { void handle.remove(); };
}

/** Antes de cerrar sesión: este celular deja de recibir los avisos de esa cuenta. */
export function unregisterOnSignOut() {
  const onClick = (event: MouseEvent) => {
    const link = (event.target as Element | null)?.closest?.("a[href^='/signout-with-chatgpt']");
    if (!(link instanceof HTMLAnchorElement)) return;
    event.preventDefault();
    const destination = link.href;
    void Promise.race([disableNativePush(), new Promise((resolve) => setTimeout(resolve, 2000))])
      .finally(() => window.location.assign(destination));
  };
  document.addEventListener("click", onClick, true);
  return () => document.removeEventListener("click", onClick, true);
}
