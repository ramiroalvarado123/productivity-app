import { getChatGPTUser } from "@/server/auth/session";

type ResponseOutput = { type?: string; content?: Array<{ type?: string; text?: string }> };

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, Math.min(index + chunk, bytes.length)));
  }
  return btoa(binary);
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Necesitás iniciar sesión." }, { status: 401 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "El análisis con IA está preparado, pero falta activar la conexión segura del modelo." }, { status: 503 });
  }

  const form = await request.formData();
  const description = String(form.get("description") ?? "").trim();
  const image = form.get("image");
  if (!description && !(image instanceof File && image.size)) {
    return Response.json({ error: "Escribí qué comiste o agregá una foto." }, { status: 400 });
  }
  if (image instanceof File && image.size > 5 * 1024 * 1024) {
    return Response.json({ error: "La imagen debe pesar menos de 5 MB." }, { status: 400 });
  }

  const content: Array<Record<string, unknown>> = [{
    type: "input_text",
    text: `Estimá esta comida para un registro personal de alimentación. Descripción del usuario: ${description || "No agregó descripción; analizá la foto."}\n\nIdentificá alimentos visibles o mencionados, estimá porciones realistas, calorías y macronutrientes aproximados. No inventes ingredientes invisibles como certeza: expresá la duda en caveat. Devolvé un nombre corto de la comida, un detalle útil para editar, el total central aproximado, proteínas, carbohidratos, grasas y un rango razonable. Si la imagen no muestra comida o no hay información suficiente, usá confidence low, items vacíos y explicalo. Esto no es consejo médico.`,
  }];

  if (image instanceof File && image.size) {
    const bytes = new Uint8Array(await image.arrayBuffer());
    content.push({ type: "input_image", image_url: `data:${image.type || "image/jpeg"};base64,${bytesToBase64(bytes)}`, detail: "high" });
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-5.6-luna",
      input: [{ role: "user", content }],
      max_output_tokens: 900,
      text: {
        format: {
          type: "json_schema",
          name: "meal_estimate",
          strict: true,
          schema: {
            type: "object",
            properties: {
              mealName: { type: "string" },
              detail: { type: "string" },
              estimatedCalories: { type: "integer" },
              minimumCalories: { type: "integer" },
              maximumCalories: { type: "integer" },
              protein: { type: "integer" },
              carbs: { type: "integer" },
              fat: { type: "integer" },
              confidence: { type: "string", enum: ["low", "medium", "high"] },
              items: { type: "array", items: { type: "object", properties: { name: { type: "string" }, portion: { type: "string" }, calories: { type: "integer" } }, required: ["name", "portion", "calories"], additionalProperties: false } },
              caveat: { type: "string" },
            },
            required: ["mealName", "detail", "estimatedCalories", "minimumCalories", "maximumCalories", "protein", "carbs", "fat", "confidence", "items", "caveat"],
            additionalProperties: false,
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("OpenAI meal estimate failed", response.status, detail.slice(0, 500));
    return Response.json({ error: "No pudimos analizar la comida ahora. Podés cargarla manualmente." }, { status: 502 });
  }

  const result = await response.json() as { output?: ResponseOutput[] };
  const outputText = result.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
  if (!outputText) return Response.json({ error: "La IA no devolvió una estimación utilizable." }, { status: 502 });
  return Response.json({ estimate: JSON.parse(outputText) });
}
