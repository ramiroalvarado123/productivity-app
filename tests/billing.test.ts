import assert from "node:assert/strict";
import test from "node:test";
import { decideFromWebhook, emailFromEvent, proFromSubscriber } from "@/server/billing/revenuecat";

const now = new Date("2026-11-10T12:00:00Z");
const future = now.getTime() + 30 * 86400_000;
const past = now.getTime() - 86400_000;
const event = (type: string, extra: Record<string, unknown> = {}) => ({
  event: { type, app_user_id: "Ana@Mail.com", entitlement_ids: ["pro"], product_id: "avora_pro_monthly", store: "APP_STORE", ...extra },
});

test("una compra o renovación vigente activa Pro", () => {
  for (const type of ["INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE", "UNCANCELLATION"]) {
    const decision = decideFromWebhook(event(type, { expiration_at_ms: future }), now);
    assert.equal(decision.action, "grant", type);
    if (decision.action === "grant") {
      assert.equal(decision.email, "ana@mail.com");
      assert.equal(decision.state.active, true);
      assert.equal(decision.state.productId, "avora_pro_monthly");
    }
  }
});

test("cancelar o un problema de cobro no quita Pro hasta que venza", () => {
  assert.equal(decideFromWebhook(event("CANCELLATION", { expiration_at_ms: future }), now).action, "ignore");
  assert.equal(decideFromWebhook(event("BILLING_ISSUE", { expiration_at_ms: future }), now).action, "ignore");
});

test("al vencer, se revoca Pro", () => {
  const decision = decideFromWebhook(event("EXPIRATION", { expiration_at_ms: past }), now);
  assert.equal(decision.action, "revoke");
});

test("eventos desordenados o repetidos no hacen daño", () => {
  assert.equal(decideFromWebhook(event("EXPIRATION", { expiration_at_ms: future }), now).action, "ignore");
  assert.equal(decideFromWebhook(event("RENEWAL", { expiration_at_ms: past }), now).action, "ignore");
});

test("ignora usuarios anónimos, otros entitlements y basura", () => {
  assert.equal(decideFromWebhook(event("INITIAL_PURCHASE", { app_user_id: "$RCAnonymousID:abc", expiration_at_ms: future }), now).action, "ignore");
  assert.equal(decideFromWebhook(event("INITIAL_PURCHASE", { entitlement_ids: ["otro"], expiration_at_ms: future }), now).action, "ignore");
  assert.equal(decideFromWebhook(null, now).action, "ignore");
  assert.equal(decideFromWebhook({ event: {} }, now).action, "ignore");
});

test("si el id principal es anónimo, usa el email de los alias", () => {
  assert.equal(emailFromEvent({ app_user_id: "$RCAnonymousID:x", aliases: ["$RCAnonymousID:x", "Beto@Mail.com"] }), "beto@mail.com");
});

test("Pro según la consulta al suscriptor: vigente, vencido, vitalicio y sin compras", () => {
  const sub = (expires: string | null) => ({ subscriber: { entitlements: { pro: { expires_date: expires, product_identifier: "p" } }, subscriptions: { p: { store: "play_store" } } } });
  assert.deepEqual(proFromSubscriber(sub("2026-12-01T00:00:00Z"), now), { active: true, expiresAt: "2026-12-01T00:00:00Z", productId: "p", store: "play_store" });
  assert.equal(proFromSubscriber(sub("2026-11-01T00:00:00Z"), now).active, false);
  assert.equal(proFromSubscriber(sub(null), now).active, true);
  assert.equal(proFromSubscriber({ subscriber: { entitlements: {} } }, now).active, false);
  assert.equal(proFromSubscriber(null, now).active, false);
});
