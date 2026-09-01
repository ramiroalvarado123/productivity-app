import { getChatGPTUser } from "../../chatgpt-auth";

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Necesitás iniciar sesión." }, { status: 401 });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return Response.json({ error: "Falta activar la conexión segura de IA." }, { status: 503 });

  const form = await request.formData();
  const audio = form.get("audio");
  if (!(audio instanceof File) || !audio.size) return Response.json({ error: "No recibimos una grabación." }, { status: 400 });
  if (audio.size > 900 * 1024) return Response.json({ error: "La grabación es demasiado grande. Probá nuevamente; la aplicación la comprimirá automáticamente." }, { status: 413 });

  const transcriptionForm = new FormData();
  transcriptionForm.append("file", audio, audio.name || "preferencias-alimentarias.webm");
  transcriptionForm.append("model", "gpt-transcribe");
  transcriptionForm.append("prompt", "Preferencias alimentarias en español de Argentina: alergias, intolerancias, alimentos que no consume, horarios, presupuesto y comidas preferidas.");
  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: transcriptionForm,
  });
  if (!response.ok) {
    console.error("OpenAI diet intake transcription failed", response.status, (await response.text()).slice(0, 500));
    return Response.json({ error: "No pudimos transcribir el audio." }, { status: 502 });
  }
  const result = await response.json() as { text?: string };
  const transcript = String(result.text ?? "").trim();
  if (!transcript) return Response.json({ error: "No pudimos detectar palabras en la grabación." }, { status: 422 });
  return Response.json({ transcript });
}
