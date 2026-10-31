import http2 from "node:http2";
import { SignJWT, importPKCS8 } from "jose";

/**
 * Avisos push a la app nativa. iPhone: APNs directo con la clave .p8 de Apple (la app registra
 * el token de APNs, sin Firebase en iOS). Android: Firebase Cloud Messaging (API v1) con una
 * cuenta de servicio. Sin las variables de entorno correspondientes no se envía nada y no falla.
 */

export type NativeNotification = { title: string; body: string; url: string };
export type NativePlatform = "ios" | "android";
/** `expired`: el token ya no sirve (app desinstalada, token viejo) y hay que borrarlo. */
export type NativeResult = { ok: true } | { ok: false; expired: boolean; reason: string };

type Env = Record<string, string | undefined>;

const APNS_TOKEN_TTL_MS = 40 * 60_000; // Apple pide renovar el JWT entre 20 y 60 minutos.

// --- Configuración -------------------------------------------------------------------------

export function apnsConfigured(env: Env = process.env) {
  return Boolean(env.APNS_KEY_ID && env.APNS_TEAM_ID && env.APNS_PRIVATE_KEY);
}

export type FcmAccount = { projectId: string; clientEmail: string; privateKey: string };

/** La cuenta de servicio llega como JSON en una variable de entorno. */
export function parseFcmAccount(raw: string | undefined): FcmAccount | null {
  if (!raw) return null;
  try {
    const json = JSON.parse(raw) as Record<string, unknown>;
    const projectId = String(json.project_id ?? "");
    const clientEmail = String(json.client_email ?? "");
    const privateKey = String(json.private_key ?? "");
    return projectId && clientEmail && privateKey ? { projectId, clientEmail, privateKey } : null;
  } catch {
    return null;
  }
}

export function nativePushConfigured(platform: NativePlatform, env: Env = process.env) {
  return platform === "ios" ? apnsConfigured(env) : parseFcmAccount(env.FCM_SERVICE_ACCOUNT) !== null;
}

/** Las claves .p8 se pegan en Vercel en una sola línea: acepta `\n` escritos como texto. */
export function normalizePem(value: string) {
  return value.replace(/\\n/g, "\n").trim();
}

// --- Payloads (puros) ------------------------------------------------------------------------

export function apnsPayload(notification: NativeNotification) {
  return {
    aps: { alert: { title: notification.title, body: notification.body }, sound: "default" },
    // Viaja fuera de `aps` para que la app lo reciba en `notification.data` al tocar el aviso.
    url: notification.url,
  };
}

export function fcmMessage(token: string, notification: NativeNotification) {
  return {
    message: {
      token,
      notification: { title: notification.title, body: notification.body },
      data: { url: notification.url },
      android: { priority: "HIGH" },
    },
  };
}

/** APNs: 410 = el dispositivo ya no recibe avisos de la app; 400 con estos motivos = token inválido. */
export function apnsExpired(status: number, reason: string) {
  return status === 410 || (status === 400 && (reason === "BadDeviceToken" || reason === "DeviceTokenNotForTopic"));
}

/** FCM: 404 (UNREGISTERED) o 400 por token inválido. */
export function fcmExpired(status: number, body: string) {
  return status === 404 || (status === 400 && /registration token|INVALID_ARGUMENT/i.test(body));
}

// --- APNs ----------------------------------------------------------------------------------

let apnsJwt: { value: string; expiresAt: number } | null = null;
let apnsSession: { origin: string; session: http2.ClientHttp2Session } | null = null;

async function apnsAuthorization(env: Env) {
  if (apnsJwt && apnsJwt.expiresAt > Date.now()) return apnsJwt.value;
  const key = await importPKCS8(normalizePem(env.APNS_PRIVATE_KEY ?? ""), "ES256");
  const value = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: env.APNS_KEY_ID })
    .setIssuer(env.APNS_TEAM_ID ?? "")
    .setIssuedAt()
    .sign(key);
  apnsJwt = { value, expiresAt: Date.now() + APNS_TOKEN_TTL_MS };
  return value;
}

function apnsConnection(origin: string) {
  if (apnsSession && apnsSession.origin === origin && !apnsSession.session.closed && !apnsSession.session.destroyed) return apnsSession.session;
  const session = http2.connect(origin);
  session.on("error", () => { if (apnsSession?.session === session) apnsSession = null; });
  session.on("close", () => { if (apnsSession?.session === session) apnsSession = null; });
  session.unref();
  apnsSession = { origin, session };
  return session;
}

export async function sendApns(token: string, notification: NativeNotification, env: Env = process.env): Promise<NativeResult> {
  if (!apnsConfigured(env)) return { ok: false, expired: false, reason: "APNs sin configurar" };
  // `APNS_ENV=sandbox` solo para compilaciones de desarrollo de Xcode; TestFlight y App Store usan producción.
  const origin = env.APNS_HOST ?? (env.APNS_ENV === "sandbox" ? "https://api.sandbox.push.apple.com" : "https://api.push.apple.com");
  try {
    const authorization = await apnsAuthorization(env);
    const session = apnsConnection(origin);
    return await new Promise<NativeResult>((resolve) => {
      const request = session.request({
        ":method": "POST",
        ":path": `/3/device/${token}`,
        authorization: `bearer ${authorization}`,
        "apns-topic": env.APNS_BUNDLE_ID ?? "com.avora.app",
        "apns-push-type": "alert",
        "apns-priority": "10",
        "apns-expiration": String(Math.floor(Date.now() / 1000) + 3600),
      });
      let status = 0;
      let body = "";
      request.setEncoding("utf8");
      request.setTimeout(10_000, () => request.close(http2.constants.NGHTTP2_CANCEL));
      request.on("response", (headers) => { status = Number(headers[":status"] ?? 0); });
      request.on("data", (chunk: string) => { body += chunk; });
      request.on("error", (error) => resolve({ ok: false, expired: false, reason: error.message }));
      request.on("close", () => {
        if (status === 200) return resolve({ ok: true });
        let reason = body;
        try { reason = (JSON.parse(body) as { reason?: string }).reason ?? body; } catch { /* cuerpo vacío */ }
        resolve({ ok: false, expired: apnsExpired(status, reason), reason: `${status || "sin respuesta"}: ${reason}` });
      });
      request.end(JSON.stringify(apnsPayload(notification)));
    });
  } catch (error) {
    return { ok: false, expired: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

// --- FCM -----------------------------------------------------------------------------------

let fcmToken: { value: string; expiresAt: number; account: string } | null = null;

async function fcmAccessToken(account: FcmAccount, fetcher: typeof fetch) {
  if (fcmToken && fcmToken.account === account.clientEmail && fcmToken.expiresAt > Date.now() + 60_000) return fcmToken.value;
  const key = await importPKCS8(normalizePem(account.privateKey), "RS256");
  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/firebase.messaging" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(account.clientEmail)
    .setSubject(account.clientEmail)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt()
    .setExpirationTime("55m")
    .sign(key);
  const response = await fetcher("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const json = await response.json().catch(() => ({})) as { access_token?: string; expires_in?: number };
  if (!response.ok || !json.access_token) throw new Error(`Google OAuth ${response.status}`);
  fcmToken = { value: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000, account: account.clientEmail };
  return json.access_token;
}

export async function sendFcm(
  token: string,
  notification: NativeNotification,
  env: Env = process.env,
  fetcher: typeof fetch = fetch,
): Promise<NativeResult> {
  const account = parseFcmAccount(env.FCM_SERVICE_ACCOUNT);
  if (!account) return { ok: false, expired: false, reason: "FCM sin configurar" };
  try {
    const accessToken = await fcmAccessToken(account, fetcher);
    const response = await fetcher(`https://fcm.googleapis.com/v1/projects/${account.projectId}/messages:send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(fcmMessage(token, notification)),
    });
    if (response.ok) return { ok: true };
    const body = await response.text();
    return { ok: false, expired: fcmExpired(response.status, body), reason: `${response.status}: ${body.slice(0, 200)}` };
  } catch (error) {
    return { ok: false, expired: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

export function sendNativePush(platform: NativePlatform, token: string, notification: NativeNotification) {
  return platform === "ios" ? sendApns(token, notification) : sendFcm(token, notification);
}
