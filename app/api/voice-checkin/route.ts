import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";

type ResponseOutput = { type?: string; content?: Array<{ type?: string; text?: string }> };

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Necesitás iniciar sesión." }, { status: 401 });

  const apiKey = (env as unknown as Record<string, string | undefined>).OPENAI_API_KEY;
  if (!apiKey) return Response.json({ error: "La grabadora ya está preparada, pero falta activar la conexión segura de IA." }, { status: 503 });

  const form = await request.formData();
  const audio = form.get("audio");
  const date = String(form.get("date") ?? "");
  if (!(audio instanceof File) || !audio.size) return Response.json({ error: "No recibimos una grabación." }, { status: 400 });
  if (audio.size > 900 * 1024) return Response.json({ error: "La grabación es demasiado grande. Probá nuevamente; la aplicación la comprimirá automáticamente." }, { status: 413 });

  const transcriptionForm = new FormData();
  transcriptionForm.append("file", audio, audio.name || "cierre-del-dia.webm");
  transcriptionForm.append("model", "gpt-transcribe");
  transcriptionForm.append("prompt", "Registro personal en español de Argentina sobre gimnasio, entrenamiento, comidas, calorías, proteínas, carbohidratos, grasas, agua, lectura, estudio, hábitos, sueño, objetivos y reflexiones del día.");

  const transcriptionResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: transcriptionForm,
  });
  if (!transcriptionResponse.ok) {
    console.error("OpenAI transcription failed", transcriptionResponse.status, (await transcriptionResponse.text()).slice(0, 500));
    return Response.json({ error: "No pudimos transcribir el audio. Podés intentarlo de nuevo." }, { status: 502 });
  }
  const transcription = await transcriptionResponse.json() as { text?: string };
  const transcript = String(transcription.text ?? "").trim();
  if (!transcript) return Response.json({ error: "No pudimos detectar palabras en la grabación." }, { status: 422 });

  const interpretationResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-5.6-luna",
      input: [{ role: "user", content: [{ type: "input_text", text: `Fecha del registro: ${date}.\n\nTranscripción: ${transcript}\n\nConvertí únicamente la información explícita del usuario en un cierre diario estructurado. No inventes entrenamientos, comidas, páginas, tiempos, horarios ni objetivos. Podés estimar calorías y macronutrientes solo cuando el usuario describe una comida; mantené valores razonables y conservadores. Para hábitos incluí acciones concretas que dijo haber cumplido hoy. Para journal resumí reflexiones, ideas o problemas que no correspondan a otra categoría. Solo agregá goals si expresó claramente algo que quiere conseguir; inferí weekly/monthly/annual/custom por sus palabras y usa una fecha ISO coherente. Si no menciona una categoría, devolvé cero, cadena vacía o lista vacía según el campo.` }] }],
      max_output_tokens: 1600,
      text: { format: { type: "json_schema", name: "daily_voice_checkin", strict: true, schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          gym: { type: "object", properties: { attended: { type: ["boolean", "null"] }, detail: { type: "string" } }, required: ["attended", "detail"], additionalProperties: false },
          meals: { type: "array", maxItems: 8, items: { type: "object", properties: { name: { type: "string" }, detail: { type: "string" }, calories: { type: "integer" }, protein: { type: "integer" }, carbs: { type: "integer" }, fat: { type: "integer" } }, required: ["name", "detail", "calories", "protein", "carbs", "fat"], additionalProperties: false } },
          reading: { type: "object", properties: { bookTitle: { type: "string" }, pages: { type: "integer" }, minutes: { type: "integer" }, note: { type: "string" } }, required: ["bookTitle", "pages", "minutes", "note"], additionalProperties: false },
          habits: { type: "array", maxItems: 12, items: { type: "string" } },
          study: { type: "object", properties: { minutes: { type: "integer" }, detail: { type: "string" }, tasks: { type: "array", maxItems: 10, items: { type: "string" } } }, required: ["minutes", "detail", "tasks"], additionalProperties: false },
          sleep: { type: "object", properties: { minutes: { type: "integer" }, bedtime: { type: "string" }, wakeTime: { type: "string" } }, required: ["minutes", "bedtime", "wakeTime"], additionalProperties: false },
          waterMl: { type: "integer" },
          journal: { type: "string" },
          goals: { type: "array", maxItems: 5, items: { type: "object", properties: { title: { type: "string" }, period: { type: "string", enum: ["weekly", "monthly", "annual", "custom"] }, category: { type: "string", enum: ["general", "gym", "nutrition", "reading"] }, targetDate: { type: "string" } }, required: ["title", "period", "category", "targetDate"], additionalProperties: false } },
          confidence: { type: "string", enum: ["low", "medium", "high"] },
        },
        required: ["summary", "gym", "meals", "reading", "habits", "study", "sleep", "waterMl", "journal", "goals", "confidence"],
        additionalProperties: false,
      } } },
    }),
  });
  if (!interpretationResponse.ok) {
    console.error("OpenAI voice interpretation failed", interpretationResponse.status, (await interpretationResponse.text()).slice(0, 500));
    return Response.json({ error: "Transcribimos el audio, pero no pudimos organizarlo. Intentá nuevamente." }, { status: 502 });
  }
  const result = await interpretationResponse.json() as { output?: ResponseOutput[] };
  const outputText = result.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
  if (!outputText) return Response.json({ error: "La IA no devolvió un registro utilizable." }, { status: 502 });
  return Response.json({ checkin: { ...JSON.parse(outputText), transcript } });
}
