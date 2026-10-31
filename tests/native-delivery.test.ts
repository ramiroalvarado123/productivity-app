import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import http2 from "node:http2";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { decodeProtectedHeader, jwtVerify, importSPKI } from "jose";
import {
  apnsExpired, apnsPayload, fcmExpired, fcmMessage, nativePushConfigured, normalizePem, parseFcmAccount, sendApns, sendFcm,
} from "@/features/notifications/server/native-delivery";

const note = { title: "Balance del día", body: "Cerrá tu día en un minuto.", url: "/?section=summary" };

test("el payload de iPhone lleva la ruta fuera de aps para recibirla al tocar el aviso", () => {
  const payload = apnsPayload(note);
  assert.equal(payload.aps.alert.title, note.title);
  assert.equal(payload.url, note.url);
});

test("el mensaje de Android lleva la ruta en data", () => {
  const { message } = fcmMessage("tok", note);
  assert.equal(message.token, "tok");
  assert.deepEqual(message.data, { url: note.url });
});

test("reconoce qué errores significan que el token ya no sirve", () => {
  assert.equal(apnsExpired(410, "Unregistered"), true);
  assert.equal(apnsExpired(400, "BadDeviceToken"), true);
  assert.equal(apnsExpired(403, "ExpiredProviderToken"), false);
  assert.equal(apnsExpired(500, ""), false);
  assert.equal(fcmExpired(404, "UNREGISTERED"), true);
  assert.equal(fcmExpired(400, '{"error":{"status":"INVALID_ARGUMENT"}}'), true);
  assert.equal(fcmExpired(500, "boom"), false);
});

test("la configuración se detecta por las variables de entorno", () => {
  assert.equal(nativePushConfigured("ios", {}), false);
  assert.equal(nativePushConfigured("ios", { APNS_KEY_ID: "K", APNS_TEAM_ID: "T", APNS_PRIVATE_KEY: "P" }), true);
  assert.equal(nativePushConfigured("android", { FCM_SERVICE_ACCOUNT: "no es json" }), false);
  assert.equal(parseFcmAccount(JSON.stringify({ project_id: "p", client_email: "e@x", private_key: "k" }))?.projectId, "p");
  assert.equal(normalizePem("-----BEGIN-----\\nabc\\n-----END-----"), "-----BEGIN-----\nabc\n-----END-----");
});

test("FCM: pide el token de Google firmado con la cuenta de servicio y manda el mensaje", async () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const env = { FCM_SERVICE_ACCOUNT: JSON.stringify({ project_id: "avora-test", client_email: "bot@avora-test.iam", private_key: privateKey.export({ type: "pkcs8", format: "pem" }) }) };
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetcher = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    if (url.includes("oauth2")) return Response.json({ access_token: "google-token", expires_in: 3600 });
    return Response.json({ name: "ok" });
  }) as unknown as typeof fetch;

  const result = await sendFcm("device-token", note, env, fetcher);
  assert.deepEqual(result, { ok: true });
  // La aserción JWT va firmada con la clave privada de la cuenta de servicio.
  const assertion = new URLSearchParams(String(calls[0].init?.body)).get("assertion") ?? "";
  const verified = await jwtVerify(assertion, await importSPKI(publicKey.export({ type: "spki", format: "pem" }) as string, "RS256"), { audience: "https://oauth2.googleapis.com/token" });
  assert.equal(verified.payload.iss, "bot@avora-test.iam");
  assert.equal(calls[1].url, "https://fcm.googleapis.com/v1/projects/avora-test/messages:send");
  assert.equal((calls[1].init?.headers as Record<string, string>).Authorization, "Bearer google-token");
});

test("FCM: un token vencido se informa como expirado", async () => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const env = { FCM_SERVICE_ACCOUNT: JSON.stringify({ project_id: "p2", client_email: "bot2@p2.iam", private_key: privateKey.export({ type: "pkcs8", format: "pem" }) }) };
  const fetcher = (async (url: string) => url.includes("oauth2")
    ? Response.json({ access_token: "t", expires_in: 3600 })
    : new Response('{"error":{"status":"NOT_FOUND","details":[{"errorCode":"UNREGISTERED"}]}}', { status: 404 })) as unknown as typeof fetch;
  const result = await sendFcm("viejo", note, env, fetcher);
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.expired, true);
});

test("APNs: manda POST HTTP/2 al token con el JWT firmado y el topic de la app", async () => {
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const seen: { path?: string; headers?: http2.IncomingHttpHeaders; body?: string } = {};
  const server = http2.createServer();
  server.on("stream", (stream, headers) => {
    seen.path = String(headers[":path"]);
    seen.headers = headers;
    let body = "";
    stream.on("data", (chunk) => { body += chunk; });
    stream.on("end", () => {
      seen.body = body;
      const bad = String(headers[":path"]).endsWith("/malo");
      stream.respond({ ":status": bad ? 400 : 200 });
      stream.end(bad ? JSON.stringify({ reason: "BadDeviceToken" }) : "");
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const env = {
    APNS_KEY_ID: "ABC123DEFG", APNS_TEAM_ID: "TEAM123456", APNS_BUNDLE_ID: "com.avora.test",
    APNS_PRIVATE_KEY: String(privateKey.export({ type: "pkcs8", format: "pem" })).replace(/\n/g, "\\n"),
    APNS_HOST: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
  };
  try {
    assert.deepEqual(await sendApns("aabbcc", note, env), { ok: true });
    assert.equal(seen.path, "/3/device/aabbcc");
    assert.equal(seen.headers?.["apns-topic"], "com.avora.test");
    assert.equal(seen.headers?.["apns-push-type"], "alert");
    const jwt = String(seen.headers?.authorization).replace("bearer ", "");
    assert.equal(decodeProtectedHeader(jwt).kid, "ABC123DEFG");
    const verified = await jwtVerify(jwt, await importSPKI(publicKey.export({ type: "spki", format: "pem" }) as string, "ES256"));
    assert.equal(verified.payload.iss, "TEAM123456");
    assert.equal(JSON.parse(seen.body ?? "{}").url, note.url);

    const rejected = await sendApns("malo", note, env);
    assert.equal(rejected.ok, false);
    assert.equal(!rejected.ok && rejected.expired, true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
