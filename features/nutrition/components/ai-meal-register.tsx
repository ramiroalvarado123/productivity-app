"use client";
import Image from "next/image";
import { useWorkspace } from "@/features/app-shell/workspace";
import { LockedFeature } from "@/features/pro/components/locked-feature";
import { SaveButtonContent } from "@/shared/ui/save-button";

/** Registro con IA: describir o fotografiar la comida, revisar la estimación y guardarla. */
export function AiMealRegister({ moment, date }: { moment: string; date: string }) {
  const {
    aiDescription, setAiDescription, mealPhoto, setMealPhoto, photoPreview, setPhotoPreview,
    estimating, estimate, setEstimate, selectMealPhoto, estimateMeal, isPro, openPro, saving, save, savePhase,
  } = useWorkspace();

  function updateNumber(field: "estimatedCalories" | "protein" | "carbs" | "fat", value: string) {
    if (!estimate) return;
    setEstimate({ ...estimate, [field]: Math.max(0, Number(value) || 0) });
  }

  async function saveEstimate() {
    if (!estimate) return;
    const saved = await save({
      action: "add_meal",
      date,
      name: moment || estimate.mealMoment || "",
      detail: [estimate.mealName.trim(), estimate.detail.trim()].filter(Boolean).join(" — "),
      calories: estimate.estimatedCalories,
      protein: estimate.protein,
      carbs: estimate.carbs,
      fat: estimate.fat,
    });
    if (!saved) return;
    setEstimate(null);
    setAiDescription("");
    setMealPhoto(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview("");
  }

  const box = <div className="ai-meal-box nutrition-ai-meal-box">
    <textarea value={aiDescription} onChange={(event) => setAiDescription(event.target.value)} placeholder="Ej. milanesa con puré, porción mediana…" aria-label="Describí la comida" />
    <div className="ai-photo-row">
      <label className="photo-button">📷 {mealPhoto ? "Cambiar foto" : "Sacar o subir foto"}
        <input type="file" accept="image/*" capture="environment" onChange={(event) => void selectMealPhoto(event.target.files?.[0])} />
      </label>
      {photoPreview && <div className="photo-preview"><Image src={photoPreview} alt="Comida a analizar" width={38} height={38} unoptimized /><button type="button" aria-label="Quitar foto" onClick={() => { URL.revokeObjectURL(photoPreview); setPhotoPreview(""); setMealPhoto(null); }}>×</button></div>}
      <button type="button" className="analyze-button" disabled={estimating || (!mealPhoto && !aiDescription.trim())} onClick={() => void estimateMeal()}>{estimating ? "Analizando…" : "Estimar con IA"}</button>
    </div>
    {estimate && <div className="estimate-result nutrition-estimate-result">
      <div className="estimate-head">
        <div><span>ESTIMACIÓN PARA REVISAR</span><b className="estimate-name">{estimate.mealName}</b></div>
        <label><input aria-label="Calorías estimadas" type="number" min="0" step="1" value={estimate.estimatedCalories} onChange={(event) => updateNumber("estimatedCalories", event.target.value)} /><small>kcal</small></label>
      </div>
      <input className="estimate-detail" aria-label="Detalle estimado" value={estimate.detail} onChange={(event) => setEstimate({ ...estimate, detail: event.target.value })} />
      <p aria-live="polite">{moment ? `Momento seleccionado: ${moment}` : estimate.mealMoment ? `Momento detectado: ${estimate.mealMoment}` : "Sin momento asignado; podés dejarlo así o elegir uno arriba."}</p>
      <div className="nutrition-estimate-macros">
        <label>Proteínas (g)<input type="number" min="0" step="1" value={estimate.protein} onChange={(event) => updateNumber("protein", event.target.value)} /></label>
        <label>Carbohidratos (g)<input type="number" min="0" step="1" value={estimate.carbs} onChange={(event) => updateNumber("carbs", event.target.value)} /></label>
        <label>Grasas (g)<input type="number" min="0" step="1" value={estimate.fat} onChange={(event) => updateNumber("fat", event.target.value)} /></label>
      </div>
      <p>Valores aproximados: revisalos antes de guardar. Rango probable: {estimate.minimumCalories}–{estimate.maximumCalories} kcal. {estimate.caveat}</p>
      <button type="button" className="confirm-estimate" disabled={saving} onClick={() => void saveEstimate()}><SaveButtonContent label="Confirmar y guardar" phase={savePhase("add_meal")} /></button>
    </div>}
  </div>;

  return isPro ? box : <LockedFeature title="Registro con IA" note="Estimá calorías y macros con texto o una foto." onOpen={openPro}>{box}</LockedFeature>;
}
