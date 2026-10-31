import assert from "node:assert/strict";
import test from "node:test";
import { AI_ENDPOINTS, requiresAiConsent } from "@/features/ai-consent/logic/consent";

const origin = "https://avora.example";

test("cada ruta con IA pide permiso cuando se le manda algo (POST)", () => {
  for (const path of AI_ENDPOINTS) {
    assert.equal(requiresAiConsent(path, "POST", origin), true, path);
    assert.equal(requiresAiConsent(`${origin}${path}`, "post", origin), true, path);
  }
});

test("leer la revisión semanal ya generada no manda datos a la IA", () => {
  assert.equal(requiresAiConsent("/api/weekly-ai?week=2026-10-26", "GET", origin), false);
});

test("las rutas de AVORA que no usan IA no piden permiso", () => {
  assert.equal(requiresAiConsent("/api/progress", "POST", origin), false);
  assert.equal(requiresAiConsent("/api/diet-plan-export", "POST", origin), false);
});

test("un pedido a otro sitio nunca cuenta, aunque la ruta se parezca", () => {
  assert.equal(requiresAiConsent("https://otro.example/api/diet-plan", "POST", origin), false);
  assert.equal(requiresAiConsent("http://[", "POST", origin), false);
});
