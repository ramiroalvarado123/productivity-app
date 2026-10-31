/**
 * Permiso para enviar datos a la IA de un tercero (OpenAI). Apple (5.1.2) y Google
 * piden que la persona lo autorice de forma explícita y que pueda retirarlo.
 */

/** Pedidos que mandan audio, fotos o datos personales a OpenAI. Cada ruta nueva con IA se agrega acá. */
export const AI_ENDPOINTS = [
  "/api/voice-checkin",
  "/api/estimate-calories",
  "/api/diet-plan",
  "/api/diet-intake",
  "/api/weekly-ai",
] as const;

export const AI_CONSENT_DECLINED_MESSAGE =
  "Para usar esta función necesitamos tu permiso para procesar los datos con IA. Podés darlo cuando quieras.";

/** ¿Este pedido manda datos a la IA? Solo cuenta lo que se escribe (POST) hacia AVORA. */
export function requiresAiConsent(url: string, method: string, origin: string) {
  if (method.toUpperCase() !== "POST") return false;
  let target: URL;
  try { target = new URL(url, origin); } catch { return false; }
  if (target.origin !== origin) return false;
  return (AI_ENDPOINTS as readonly string[]).includes(target.pathname);
}
