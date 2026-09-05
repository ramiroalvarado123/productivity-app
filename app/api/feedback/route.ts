import { getChatGPTUser } from "../../chatgpt-auth";
import { insertRows } from "../../lib/supabase-db";

const TYPES = new Set(["positive", "idea", "bug", "dislike"]);
const MAX_MESSAGE = 2000;
const TYPE_LABELS: Record<string, string> = {
  positive: "Me gustó algo",
  idea: "Tengo una sugerencia",
  bug: "Encontré un problema",
  dislike: "Hay algo que no me gusta",
};

const feedbackRecipients = (process.env.FEEDBACK_TO_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim())
  .filter(Boolean);
const feedbackFrom = process.env.FEEDBACK_FROM_EMAIL?.trim() || "AVORA <onboarding@resend.dev>";

function escapeHtml(value: string) {
  return value.replace(/[&<>\"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;", "'": "&#39;" })[character] ?? character);
}

async function notifyFeedbackByEmail(values: {
  userEmail: string;
  type: string;
  message: string;
  section: string;
  pagePath: string;
  userAgent: string;
  appVersion: string;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey || !feedbackRecipients.length) {
    console.warn("feedback_email_not_configured");
    return "not_configured" as const;
  }

  const typeLabel = TYPE_LABELS[values.type] ?? values.type;
  const safeSection = values.section.replace(/[\r\n]+/g, " ");
  const subject = `[AVORA] ${typeLabel} · ${safeSection}`.slice(0, 180);
  const submittedAt = new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
  const text = [
    `Nuevo comentario de AVORA`,
    `Tipo: ${typeLabel}`,
    `Sección: ${safeSection}`,
    `Usuario: ${values.userEmail}`,
    `Fecha: ${submittedAt}`,
    "",
    values.message,
    "",
    `Ruta: ${values.pagePath || "/"}`,
    `Versión: ${values.appVersion}`,
    `Navegador: ${values.userAgent || "No disponible"}`,
  ].join("\n");
  const html = `<h2>Nuevo comentario de AVORA</h2><p><strong>Tipo:</strong> ${escapeHtml(typeLabel)}<br><strong>Sección:</strong> ${escapeHtml(safeSection)}<br><strong>Usuario:</strong> ${escapeHtml(values.userEmail)}<br><strong>Fecha:</strong> ${escapeHtml(submittedAt)}</p><blockquote>${escapeHtml(values.message).replace(/\n/g, "<br>")}</blockquote><p><strong>Ruta:</strong> ${escapeHtml(values.pagePath || "/")}<br><strong>Versión:</strong> ${escapeHtml(values.appVersion)}<br><strong>Navegador:</strong> ${escapeHtml(values.userAgent || "No disponible")}</p>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: feedbackFrom, to: feedbackRecipients, reply_to: values.userEmail, subject, text, html }),
      cache: "no-store",
    });
    if (!response.ok) {
      console.error("feedback_email_failed", response.status, await response.text());
      return "failed" as const;
    }
    return "sent" as const;
  } catch (error) {
    console.error("feedback_email_failed", error);
    return "failed" as const;
  }
}

function fail(message: string, status = 400) { return Response.json({ error: message }, { status }); }

export async function POST(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return fail("Necesitás iniciar sesión.", 401);
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) return fail("Datos inválidos.");
    const type = String(body.type ?? "");
    const message = String(body.message ?? "").trim();
    const section = String(body.section ?? "Otra").trim().slice(0, 80) || "Otra";
    const pagePath = String(body.pagePath ?? "").trim().slice(0, 300);
    const userAgent = String(body.userAgent ?? "").trim().slice(0, 500);
    const appVersion = String(body.appVersion ?? "beta").trim().slice(0, 40) || "beta";
    if (!TYPES.has(type)) return fail("Elegí un tipo de comentario válido.");
    if (message.length < 3) return fail("Contanos un poco más para poder entender el comentario.");
    if (message.length > MAX_MESSAGE) return fail(`El comentario puede tener hasta ${MAX_MESSAGE} caracteres.`);
    await insertRows("user_feedback", { userEmail: user.email, type, message, section, status: "pending", pagePath, userAgent, appVersion });
    const emailDelivery = await notifyFeedbackByEmail({ userEmail: user.email, type, message, section, pagePath, userAgent, appVersion });
    return Response.json({ ok: true, emailDelivery });
  } catch (error) {
    console.error("feedback_submit_failed", error);
    return fail("No pudimos guardar el comentario. Probá nuevamente.", 500);
  }
}
