import { argentinaDate, argentinaMinutes, datePlus } from "@/domain/dates";
import { DATE } from "@/domain/validation";
import { profileEngagement } from "@/domain/profile-metadata";
import { lastClosedWeekStart } from "@/features/notifications/logic/weekly-summary";
import { isMissingWeeklyAiSchema } from "@/features/notifications/logic/weekly-ai-schema";
import { buildWeeklyAiMetrics, weeklyAiModelMetrics, type WeeklyAiReviewOutput } from "@/features/notifications/logic/weekly-ai-context";
import { readSnapshot } from "@/features/app-shell/server/snapshot";
import { getSessionUser } from "@/server/auth/session";
import type { SessionUser } from "@/server/auth/session";
import { deleteRows, insertRows, selectRows, updateRows } from "@/server/db/postgrest";
import { serverTiming } from "@/server/http";
import type { ProgressData } from "@/shared/data/types";

type ProfileRow = Record<string, unknown> & { proSince?: string; usagePreferencesJson?: string };
type ReviewRow = Record<string, unknown> & {
  weekStart: string;
  weekEnd: string;
  status: string;
  contextUsed?: boolean;
  resultJson?: WeeklyAiReviewOutput;
  metricsJson?: unknown;
  updatedAt?: string;
};
type MemoryRow = Record<string, unknown> & {
  memoryKey: string;
  category: string;
  content: string;
  validUntil: string | null;
};
type MemoryUpdate = { key: string; category: string; content: string; expiresAt: string | null };
type OpenAiOutput = { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
type JsonSchema = Record<string, unknown>;

const MODEL = "gpt-5.6-luna";
const MEMORY_CATEGORIES = new Set(["preference", "priority", "availability", "temporary_constraint"]);
const REVIEW_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    wins: { type: "array", maxItems: 3, items: { type: "string" } },
    improvements: { type: "array", maxItems: 3, items: { type: "string" } },
    comparison: { type: "string" },
    priorityInsights: { type: "array", maxItems: 3, items: { type: "string" } },
    detections: { type: "array", maxItems: 2, items: { type: "string" } },
  },
  required: ["summary", "wins", "improvements", "comparison", "priorityInsights", "detections"],
  additionalProperties: false,
};

function fail(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

function unavailableResponse(cause: unknown, fallback: string) {
  if (isMissingWeeklyAiSchema(cause)) {
    return Response.json({
      code: "weekly_ai_migration_required",
      error: "La revisión con IA todavía no está disponible. El resumen dominical sigue funcionando.",
    }, { status: 503 });
  }
  console.error("weekly AI request failed", cause);
  return fail(fallback, 503);
}

function validMonday(value: string) {
  if (!DATE.test(value)) return false;
  const date = new Date(value + "T12:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && date.getUTCDay() === 1;
}

function trimText(value: unknown, maximum: number) {
  return String(value ?? "").trim().slice(0, maximum);
}

function outputText(result: OpenAiOutput) {
  return result.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text ?? "";
}

async function requestStructuredOutput(apiKey: string, name: string, schema: JsonSchema, input: string, maxTokens: number) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      input: [{ role: "user", content: [{ type: "input_text", text: input }] }],
      max_output_tokens: maxTokens,
      text: { format: { type: "json_schema", name, strict: true, schema } },
    }),
  });
  if (!response.ok) {
    console.error("OpenAI weekly review failed", response.status, (await response.text()).slice(0, 500));
    throw new Error("No pudimos generar la revisión ahora.");
  }
  const text = outputText(await response.json() as OpenAiOutput);
  if (!text) throw new Error("La IA no devolvió una revisión utilizable.");
  return JSON.parse(text) as unknown;
}

function reviewOutput(value: unknown): WeeklyAiReviewOutput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("La IA no devolvió una revisión utilizable.");
  const row = value as Record<string, unknown>;
  const list = (key: string, maximum: number) => Array.isArray(row[key])
    ? (row[key] as unknown[]).slice(0, maximum).map((item) => trimText(item, 220)).filter(Boolean)
    : [];
  const review = {
    summary: trimText(row.summary, 420),
    wins: list("wins", 3),
    improvements: list("improvements", 3),
    comparison: trimText(row.comparison, 260),
    priorityInsights: list("priorityInsights", 3),
    detections: list("detections", 2),
  };
  if (!review.summary || !review.comparison) throw new Error("La IA no devolvió una revisión utilizable.");
  return review;
}

function storedMemories(rows: MemoryRow[], today: string) {
  return rows.filter((row) => !row.validUntil || row.validUntil >= today)
    .slice(0, 20)
    .map((row) => ({ key: row.memoryKey, category: row.category, content: row.content, expiresAt: row.validUntil }));
}

async function loadProfile(email: string) {
  return (await selectRows<ProfileRow>("profiles", {
    where: { email },
    columns: ["email", "proSince", "usagePreferencesJson"],
    limit: 1,
  }))[0] ?? null;
}

async function authorize() {
  const user = await getSessionUser();
  if (!user) return { response: fail("Necesitás iniciar sesión.", 401) } as const;
  const profile = await loadProfile(user.email);
  if (!profile?.proSince) return { response: fail("Esta función está disponible para cuentas Pro.", 403) } as const;
  return { user, profile } as const;
}

function parseWeekStart(value: unknown) {
  const weekStart = String(value ?? "");
  return validMonday(weekStart) ? weekStart : "";
}

async function getReview(email: string, weekStart: string) {
  return (await selectRows<ReviewRow>("weekly_ai_reviews", {
    where: { userEmail: email, weekStart },
    limit: 1,
  }))[0] ?? null;
}

async function getUserMemories(email: string, today: string) {
  const rows = await selectRows<MemoryRow>("weekly_ai_memory", {
    where: { userEmail: email },
    order: [["updatedAt", "desc"]],
    limit: 200,
  });
  return storedMemories(rows, today);
}

async function pruneUserMemories(email: string, today: string) {
  const rows = await selectRows<MemoryRow>("weekly_ai_memory", {
    where: { userEmail: email },
    order: [["updatedAt", "desc"]],
    limit: 200,
  });
  const keep = new Set(storedMemories(rows, today).map((row) => row.key));
  await Promise.all(rows.filter((row) => !keep.has(row.memoryKey))
    .map((row) => deleteRows("weekly_ai_memory", { userEmail: email, memoryKey: row.memoryKey })));
}

function reviewResponse(row: ReviewRow | null) {
  if (!row) return Response.json({ status: "missing", review: null });
  if (row.status !== "ready") return Response.json({ status: row.status, review: null });
  return Response.json({
    status: "ready",
    review: { result: row.resultJson, metrics: row.metricsJson, weekStart: row.weekStart, weekEnd: row.weekEnd, contextUsed: Boolean(row.contextUsed) },
  });
}

async function getReviewHandler(request: Request) {
  const auth = await authorize();
  if ("response" in auth) return auth.response;
  const weekStart = parseWeekStart(new URL(request.url).searchParams.get("weekStart"));
  if (!weekStart) return fail("La semana solicitada no es válida.");
  return reviewResponse(await getReview(auth.user.email, weekStart));
}

function normalizeMemoryUpdates(value: unknown, today: string): MemoryUpdate[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 3).flatMap((candidate) => {
    if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) return [];
    const row = candidate as Record<string, unknown>;
    const key = trimText(row.key, 40).toLowerCase();
    const category = trimText(row.category, 32);
    const content = trimText(row.content, 180);
    const rawExpiry = row.expiresAt === null ? null : trimText(row.expiresAt, 10);
    const expiresAt = rawExpiry && DATE.test(rawExpiry) ? rawExpiry : null;
    if (!/^[a-z0-9_-]{1,40}$/.test(key) || !MEMORY_CATEGORIES.has(category) || !content) return [];
    if (expiresAt && expiresAt < today) return [];
    if (category === "temporary_constraint" && !expiresAt) return [];
    return [{ key, category, content, expiresAt }];
  });
}

const MEMORY_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    reply: { type: "string" },
    memories: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          key: { type: "string" },
          category: { type: "string", enum: ["preference", "priority", "availability", "temporary_constraint"] },
          content: { type: "string" },
          expiresAt: { anyOf: [{ type: "string" }, { type: "null" }] },
        },
        required: ["key", "category", "content", "expiresAt"],
        additionalProperties: false,
      },
    },
  },
  required: ["reply", "memories"],
  additionalProperties: false,
};

async function respondToContext(email: string, weekStart: string, message: string, apiKey: string) {
  if (message.length < 2) return fail("Escribí un poco más para que AVORA pueda responder.");
  const current = await getReview(email, weekStart);
  if (!current || current.status !== "ready") return fail("La revisión semanal todavía no está lista.", 409);
  if (current.contextUsed) return fail("Ya usaste el contexto de esta revisión semanal.", 409);
  const today = argentinaDate();
  const claimed = await updateRows<ReviewRow>("weekly_ai_reviews", {
    userEmail: email,
    weekStart,
    status: "ready",
    contextUsed: false,
  }, { contextUsed: true, updatedAt: new Date().toISOString() }, true);
  if (!claimed.length) return fail("Ya usaste el contexto de esta revisión semanal.", 409);
  const row = claimed[0];
  try {
    const memories = await getUserMemories(email, today);
    const generated = await requestStructuredOutput(
      apiKey,
        "avora_weekly_context_reply",
        MEMORY_SCHEMA,
        "Respondé en español rioplatense, en una o dos frases, a la pregunta o contexto del usuario. No continúes una conversación: usá solamente esta pregunta, la revisión actual y las memorias estructuradas. No inventes motivos ni datos. Guardá memoria únicamente cuando el usuario haya dicho explícitamente una preferencia, prioridad, disponibilidad o restricción temporal útil para próximas semanas. No guardes la conversación, datos íntimos ni hechos inferidos. Para restricciones temporales usá una fecha de vencimiento concreta. Reutilizá una key estable para actualizar una memoria previa relacionada y evitar duplicados. Si no hay nada que conservar, devolvé memories vacío.\n\nPregunta actual: " + message + "\n\nRevisión: " + JSON.stringify({ result: row.resultJson, metrics: row.metricsJson }) + "\n\nMemoria activa: " + JSON.stringify(memories),
      420,
    );
    if (typeof generated !== "object" || generated === null || Array.isArray(generated)) throw new Error("La IA no devolvió una respuesta utilizable.");
    const payload = generated as Record<string, unknown>;
    const reply = trimText(payload.reply, 320);
    if (!reply) throw new Error("La IA no devolvió una respuesta utilizable.");
    const updates = normalizeMemoryUpdates(payload.memories, today);
    if (updates.length) {
      await insertRows("weekly_ai_memory", updates.map((memory) => ({
        userEmail: email,
        memoryKey: memory.key,
        category: memory.category,
        content: memory.content,
        validUntil: memory.expiresAt,
        sourceWeekStart: weekStart,
        updatedAt: new Date().toISOString(),
      })), { upsert: true, onConflict: ["userEmail", "memoryKey"] });
    }
    await pruneUserMemories(email, today);
    return Response.json({ reply, contextUsed: true });
  } catch (cause) {
    await updateRows("weekly_ai_reviews", { userEmail: email, weekStart, status: "ready", contextUsed: true }, { contextUsed: false, updatedAt: new Date().toISOString() }).catch(() => undefined);
    throw cause;
  }
}

async function generateReview(user: SessionUser, profile: ProfileRow, weekStart: string, apiKey: string) {
  const email = user.email;
  const currentDate = argentinaDate();
  const closeDate = lastClosedWeekStart(currentDate, argentinaMinutes(), 15 * 60);
  if (weekStart !== closeDate) return fail("Sólo se puede generar la revisión de la última semana cerrada.", 409);

  let existing = await getReview(email, weekStart);
  if (existing?.status === "ready") return reviewResponse(existing);

  let claimed = false;
  const now = new Date().toISOString();
  if (!existing) {
    const inserted = await insertRows<ReviewRow>("weekly_ai_reviews", {
      userEmail: email,
      weekStart,
      weekEnd: datePlus(weekStart, 6),
      status: "pending",
      updatedAt: now,
    }, { upsert: true, onConflict: ["userEmail", "weekStart"], ignoreDuplicates: true, returnRows: true });
    claimed = inserted.length > 0;
    existing = await getReview(email, weekStart);
  } else if (existing.status === "failed") {
    const updated = await updateRows<ReviewRow>("weekly_ai_reviews", {
      userEmail: email,
      weekStart,
      status: "failed",
      updatedAt: existing.updatedAt ?? null,
    }, { status: "pending", updatedAt: now, lastError: "" }, true);
    claimed = updated.length > 0;
    existing = updated[0] ?? await getReview(email, weekStart);
  } else if (existing.status === "pending") {
    const pendingSince = Date.parse(String(existing.updatedAt ?? ""));
    if (Number.isFinite(pendingSince) && Date.now() - pendingSince > 120_000) {
      const updated = await updateRows<ReviewRow>("weekly_ai_reviews", {
        userEmail: email,
        weekStart,
        status: "pending",
        updatedAt: existing.updatedAt ?? null,
      }, { status: "pending", updatedAt: now, lastError: "" }, true);
      claimed = updated.length > 0;
      existing = updated[0] ?? await getReview(email, weekStart);
    }
  }
  if (!existing) return fail("No pudimos preparar la revisión semanal.", 503);
  if (!claimed) return Response.json({ status: existing.status, review: null }, { status: 202 });

  try {
    const timing = serverTiming();
    const params = new URLSearchParams({
      date: currentDate,
      weekStart,
      weekEnd: datePlus(weekStart, 6),
      month: currentDate.slice(0, 7),
    });
    const data = await readSnapshot(user, params, timing) as unknown as ProgressData;
    const engagement = profileEngagement(profile.usagePreferencesJson);
    const metrics = buildWeeklyAiMetrics(data, weekStart, currentDate, {
      currentStreak: engagement.currentStreak,
      bestStreak: engagement.bestStreak,
      totalUseDays: engagement.totalUseDays,
    });
    const memories = await getUserMemories(email, currentDate);
    const promptContext = {
      week: weeklyAiModelMetrics(metrics),
      persistentMemory: memories,
    };
    const raw = await requestStructuredOutput(
      apiKey,
      "avora_weekly_review",
      REVIEW_SCHEMA,
      "Sos AVORA, una app de progreso personal. Analizá únicamente estos datos objetivos ya calculados por el servidor y escribí en español rioplatense, con voseo, con frases breves y respetuosas.\n\nDevolvé: un resumen conciso; hasta 3 logros; hasta 3 oportunidades concretas para mejorar; una comparación con la semana anterior usando solamente la diferencia entregada; hasta 3 observaciones sobre prioridades del usuario frente a su actividad; y detecciones de patrones objetivos. Si no hay comparación válida, decilo con claridad. No inventes causas, correlaciones ni actividades. No digas que una meta se cumplió si el dato no lo muestra. Si hay poca historia, no agregues detecciones y no hagas afirmaciones específicas. Solo agregá patrones en detections si evidenceWeeks es al menos 4 y los datos los respaldan claramente; podés devolver una lista vacía. Las tareas y eventos próximos se muestran aparte desde sus registros exactos, no los recrees en el texto.\n\nContexto: " + JSON.stringify(promptContext),
      1500,
    );
    const result = reviewOutput(raw);
    if (metrics.evidenceWeeks < 4) result.detections = [];
    const saved = await updateRows("weekly_ai_reviews", { userEmail: email, weekStart }, {
      weekEnd: metrics.weekEnd,
      status: "ready",
      resultJson: result,
      metricsJson: metrics,
      model: MODEL,
      lastError: "",
      updatedAt: new Date().toISOString(),
    }, true);
    if (!saved.length) throw new Error("No pudimos guardar la revisión semanal.");
    return Response.json({ status: "ready", review: { result, metrics, weekStart, weekEnd: metrics.weekEnd } });
  } catch (cause) {
    console.error("weekly AI generation failed", cause);
    await updateRows("weekly_ai_reviews", { userEmail: email, weekStart }, {
      status: "failed",
      lastError: "No se pudo generar la revisión.",
      updatedAt: new Date().toISOString(),
    }).catch(() => undefined);
    return fail(cause instanceof Error ? cause.message : "No pudimos generar la revisión ahora.", 502);
  }
}

export async function GET(request: Request) {
  try {
    return await getReviewHandler(request);
  } catch (cause) {
    return unavailableResponse(cause, "No se pudo cargar la revisión semanal. Intentá nuevamente.");
  }
}

export async function POST(request: Request) {
  try {
    const auth = await authorize();
    if ("response" in auth) return auth.response;
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const weekStart = parseWeekStart(body?.weekStart);
    if (!weekStart) return fail("La semana solicitada no es válida.");
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return fail("La conexión de IA no está disponible.", 503);
    const action = String(body?.action ?? "");
    if (action === "respond") {
      return await respondToContext(auth.user.email, weekStart, trimText(body?.message, 400), apiKey);
    }
    if (action !== "generate") return fail("La acción de revisión no es válida.");
    return await generateReview(auth.user, auth.profile, weekStart, apiKey);
  } catch (cause) {
    return unavailableResponse(cause, "No pudimos procesar la revisión semanal. Intentá nuevamente.");
  }
}
