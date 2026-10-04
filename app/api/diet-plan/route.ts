import { getChatGPTUser } from "@/server/auth/session";

type ResponseOutput = { type?: string; content?: Array<{ type?: string; text?: string }> };

const activityMultipliers: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
};

function numberInRange(value: unknown, minimum: number, maximum: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Necesitás iniciar sesión." }, { status: 401 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return Response.json({ error: "Falta activar la conexión segura de IA." }, { status: 503 });

  const payload = await request.json() as Record<string, unknown>;
  const age = numberInRange(payload.age, 18, 100);
  const heightCm = numberInRange(payload.heightCm, 120, 230);
  const currentWeightKg = numberInRange(payload.currentWeightKg, 35, 300);
  const targetWeightKg = numberInRange(payload.targetWeightKg, 35, 300);
  const sex = String(payload.sex ?? "unspecified");
  const activityLevel = String(payload.activityLevel ?? "light");
  const goalPace = String(payload.goalPace ?? "gentle");
  const preferences = String(payload.preferences ?? "").trim().slice(0, 500);
  const details = String(payload.details ?? "").trim().slice(0, 2000);

  if (!age || !heightCm || !currentWeightKg || !targetWeightKg) {
    return Response.json({ error: "Completá edad, altura, peso actual y peso objetivo con valores válidos." }, { status: 400 });
  }
  if (!["female", "male", "unspecified"].includes(sex) || !activityMultipliers[activityLevel] || !["gentle", "moderate"].includes(goalPace)) {
    return Response.json({ error: "Revisá la configuración del plan." }, { status: 400 });
  }

  const targetBmi = targetWeightKg / ((heightCm / 100) ** 2);
  if (targetBmi < 18.5) {
    return Response.json({ error: "Ese objetivo quedaría por debajo del rango general de referencia. Consultalo con un profesional antes de crear un plan." }, { status: 400 });
  }

  const sexOffset = sex === "male" ? 5 : sex === "female" ? -161 : -78;
  const basalEstimate = 10 * currentWeightKg + 6.25 * heightCm - 5 * age + sexOffset;
  const maintenanceCalories = Math.round(basalEstimate * activityMultipliers[activityLevel]);
  const difference = targetWeightKg - currentWeightKg;
  const adjustment = goalPace === "moderate" ? 450 : 300;
  const minimumCalories = sex === "male" ? 1500 : sex === "female" ? 1200 : 1350;
  const targetCalories = Math.round(Math.max(minimumCalories, Math.min(6000, maintenanceCalories + (difference < -0.5 ? -adjustment : difference > 0.5 ? Math.min(300, adjustment) : 0))) / 10) * 10;
  const direction = difference < -0.5 ? "lose" : difference > 0.5 ? "gain" : "maintain";
  const medicalFlag = /diabet|embaraz|gesta|renal|riñ[oó]n|anorex|bulimi|trastorno aliment|medicaci[oó]n|celiaqu/i.test(details);

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-5.6-luna",
      input: [{ role: "user", content: [{ type: "input_text", text: `Creá un plan de alimentación general, sencillo, realista y económico para una persona adulta. No es tratamiento médico ni una dieta clínica. Usá estas estimaciones ya calculadas por la aplicación y no las reemplaces: mantenimiento aproximado ${maintenanceCalories} kcal/día; objetivo aproximado ${targetCalories} kcal/día; dirección ${direction}.

Datos: edad ${age}; sexo para estimación energética ${sex}; altura ${heightCm} cm; peso actual ${currentWeightKg} kg; peso objetivo ${targetWeightKg} kg; actividad ${activityLevel}; ritmo ${goalPace}. Preferencias: ${preferences || "sin preferencia indicada"}. Detalles expresados por el usuario: ${details || "ninguno"}.

Tratà alergias e intolerancias como exclusiones estrictas: no sugieras el alimento ni derivados. Ofrecé opciones intercambiables, con ingredientes comunes y porciones orientativas. No prometas resultados ni indiques suplementos, ayunos extremos o menos calorías que el objetivo calculado. Si aparecen embarazo, diabetes, enfermedad renal, celiaquía, trastornos alimentarios, medicación u otra condición que requiera atención personalizada, mantené las sugerencias muy generales, marcá needsProfessional=true y explicá que debe consultar a un nutricionista o médico. medicalFlag detectado por la app: ${medicalFlag}.` }] }],
      max_output_tokens: 2400,
      text: { format: { type: "json_schema", name: "simple_diet_plan", strict: true, schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          targetCalories: { type: "integer" },
          calorieRangeMinimum: { type: "integer" },
          calorieRangeMaximum: { type: "integer" },
          maintenanceCalories: { type: "integer" },
          goalDirection: { type: "string", enum: ["lose", "maintain", "gain"] },
          paceText: { type: "string" },
          macros: { type: "object", properties: { proteinGrams: { type: "integer" }, carbsGrams: { type: "integer" }, fatGrams: { type: "integer" } }, required: ["proteinGrams", "carbsGrams", "fatGrams"], additionalProperties: false },
          meals: { type: "array", minItems: 3, maxItems: 6, items: { type: "object", properties: { slot: { type: "string" }, guidance: { type: "string" }, options: { type: "array", minItems: 2, maxItems: 4, items: { type: "string" } } }, required: ["slot", "guidance", "options"], additionalProperties: false } },
          weeklyTips: { type: "array", minItems: 3, maxItems: 6, items: { type: "string" } },
          shoppingBasics: { type: "array", minItems: 5, maxItems: 14, items: { type: "string" } },
          appliedRestrictions: { type: "array", maxItems: 12, items: { type: "string" } },
          safetyNote: { type: "string" },
          needsProfessional: { type: "boolean" },
        },
        required: ["summary", "targetCalories", "calorieRangeMinimum", "calorieRangeMaximum", "maintenanceCalories", "goalDirection", "paceText", "macros", "meals", "weeklyTips", "shoppingBasics", "appliedRestrictions", "safetyNote", "needsProfessional"],
        additionalProperties: false,
      } } },
    }),
  });

  if (!response.ok) {
    console.error("OpenAI diet plan failed", response.status, (await response.text()).slice(0, 500));
    return Response.json({ error: "No pudimos crear el plan ahora. Intentá nuevamente." }, { status: 502 });
  }
  const result = await response.json() as { output?: ResponseOutput[] };
  const outputText = result.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
  if (!outputText) return Response.json({ error: "La IA no devolvió un plan utilizable." }, { status: 502 });
  const plan = JSON.parse(outputText) as Record<string, unknown>;
  plan.targetCalories = targetCalories;
  plan.maintenanceCalories = maintenanceCalories;
  return Response.json({ plan });
}
