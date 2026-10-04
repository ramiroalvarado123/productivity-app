"use client";

import Image from "next/image";
import { NotificationSettings } from "@/features/notifications/components/notification-settings";
import { CSSProperties, FormEvent, type ReactNode } from "react";
import { BrandMark } from "@/shared/ui/brand-mark";
import { Dropdown } from "@/shared/ui/dropdown";
import { TourOverlay } from "@/shared/ui/tour-overlay";
import { pluralize } from "@/shared/lib/format";
import { scoreLabel } from "@/domain/score";
import { BADGE_DEFINITIONS } from "@/features/engagement/logic/badges";
import { BadgeEmblem, StreakFlameIcon } from "@/features/engagement/components/badge-icons";
import { NotificationsDialog, WeeklySummaryDialog } from "@/features/notifications/components/notifications-center";
import { EarlyAdopterAnnouncement } from "@/features/notifications/components/early-adopter-announcement";
import { GOAL_METRICS, GOAL_SOURCES, GROUP_ACCENTS, accentFor, goalPercent, goalPeriodLabel, goalSource, goalTotal, goalUnit, initialsFor, inviteMessage, isFresh, mailLink, shareStatus, whatsappLink, type GoalMetric, type GoalSource, type Group, type GroupGoal } from "@/features/friends/logic/social";
import type { DietForm, Section, SettingsView, StreakAction } from "@/shared/data/types";
import { estimateTargetCalories } from "@/features/nutrition/logic/diet";
import { DayStrip } from "@/shared/ui/day-strip";
import { FEEDBACK_SECTIONS, FEEDBACK_TYPES } from "@/features/settings/constants";
import { FRIEND_NUDGE_MESSAGES } from "@/features/friends/constants";
import type { GoalDraft, GroupPanelTab } from "@/features/friends/logic/goal-draft";
import { InsigniasModal } from "@/features/engagement/components/insignias-modal";
import { LockedFeature } from "@/features/pro/components/locked-feature";
import { SaveButtonContent } from "@/shared/ui/save-button";
import { TOUR_STEPS, friendsIcon, gearIcon, mobileNavItems, navItems, plusIcon } from "@/features/app-shell/navigation";
import { emptyGoalDraft } from "@/features/friends/logic/goal-draft";
import { useWorkspaceState, type WorkspaceProps } from "@/features/app-shell/use-workspace-state";
import { WorkspaceContext } from "@/features/app-shell/workspace";
import { FocusSection } from "@/features/focus/components/focus-section";
import { HomeSection } from "@/features/home/components/home-section";
import { PlanSection } from "@/features/plan/components/plan-section";
import { ProSection } from "@/features/pro/components/pro-section";
import { ReadingSection } from "@/features/reading/components/reading-section";
import { ScoreSection } from "@/features/score/components/score-section";
import { SleepSection } from "@/features/sleep/components/sleep-section";
import { StatsSection } from "@/features/stats/components/stats-section";
import { TrainingSection } from "@/features/training/components/training-section";
import { VoiceCheckinDialog } from "@/features/voice-checkin/components/voice-checkin-dialog";

export default function ProgressClient(props: WorkspaceProps) {
  const workspace = useWorkspaceState(props);
  const {
    today,
    monthKey,
    data,
    section,
    tourActive,
    setTourActive,
    profileMenuOpen,
    setProfileMenuOpen,
    profileMenuRef,
    mobileProfileRef,
    badgesOpen,
    setBadgesOpen,
    inboxOpen,
    setInboxOpen,
    openSummary,
    setOpenSummary,
    announcementOpen,
    announcementSaving,
    announcementError,
    engagement,
    streakActionBusy,
    setStreakActionBusy,
    streakActionError,
    setStreakActionError,
    settingsOpen,
    setSettingsOpen,
    settingsView,
    setSettingsView,
    settingsName,
    setSettingsName,
    settingsUsername,
    setSettingsUsername,
    feedbackOpen,
    setFeedbackOpen,
    feedbackType,
    setFeedbackType,
    feedbackSection,
    setFeedbackSection,
    feedbackMessage,
    setFeedbackMessage,
    feedbackSent,
    setFeedbackSent,
    avatarUploading,
    loading,
    saving,
    pullDistance,
    pullRefreshing,
    error,
    setError,
    onboardingStep,
    setOnboardingStep,
    onboardingName,
    setOnboardingName,
    onboardingUsername,
    setOnboardingUsername,
    onboardingGoals,
    setOnboardingGoals,
    onboardingPreferences,
    setOnboardingPreferences,
    usernameStatus,
    physicalTab,
    setPhysicalTab,
    focusTab,
    setFocusTab,
    voiceOpen,
    friendsNotice,
    setFriendsNotice,
    social,
    friendsTab,
    setFriendsTab,
    nudgeOpenFor,
    setNudgeOpenFor,
    inviteUsername,
    setInviteUsername,
    inviteLink,
    setInviteLink,
    inviteCopied,
    setInviteCopied,
    groupWizard,
    setGroupWizard,
    groupDraft,
    setGroupDraft,
    wizardGoal,
    setWizardGoal,
    wizardInvites,
    setWizardInvites,
    joinCode,
    setJoinCode,
    groupPanel,
    setGroupPanel,
    settingsDraft,
    setSettingsDraft,
    goalDraft,
    setGoalDraft,
    editingGoalId,
    setEditingGoalId,
    dietCalendarCursor,
    setDietCalendarCursor,
    aiDescription,
    setAiDescription,
    mealEntryDate,
    setMealEntryDate,
    mealPhoto,
    setMealPhoto,
    photoPreview,
    setPhotoPreview,
    estimating,
    estimate,
    setEstimate,
    dietForm,
    setDietForm,
    dietNumberDrafts,
    dietQuickCalories,
    dietQuickCaloriesDraft,
    setDietQuickField,
    beginDietNumberInput,
    updateDietNumberInput,
    finishDietNumberInput,
    beginDietQuickCaloriesInput,
    updateDietQuickCaloriesInput,
    finishDietQuickCaloriesInput,
    dietGenerating,
    generatedDietPlan,
    dietRecording,
    dietVoiceLoading,
    loadData,
    runStreakAction,
    acknowledgeAnnouncement,
    savePhase,
    save,
    sendSocial,
    score,
    badgeStats,
    entryDayLabel,
    historicalScore,
    displayName,
    savedDietPlan,
    displayedDietPlan,
    dietTargetCalories,
    inboxItems,
    unreadCount,
    markSummariesSeen,
    showSummary,
    weeklySummary,
    openSection,
    submitForm,
    openSettings,
    openPersonalSettings,
    openFeedback,
    saveSettings,
    submitFeedback,
    uploadAvatar,
    selectMealPhoto,
    estimateMeal,
    saveEstimate,
    generateDietPlan,
    saveDietPlan,
    saveDietTarget,
    addDietDetail,
    startDietRecording,
    stopDietRecording,
    isPro,
    openPro,
    openArea,
  } = workspace;

























  const dietCalendarStart = new Date(dietCalendarCursor + "-01T12:00:00");
  const dietCalendarMonthName = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(dietCalendarStart);
  const dietCalendarOffset = (dietCalendarStart.getDay() + 6) % 7;
  const dietCalendarDays = new Date(dietCalendarStart.getFullYear(), dietCalendarStart.getMonth() + 1, 0).getDate();
  const shiftDietCalendar = (amount: number) => {
    const next = new Date(dietCalendarStart);
    next.setMonth(next.getMonth() + amount);
    setDietCalendarCursor(next.toISOString().slice(0, 7));
  };
  const caloriesByDate = data.mealHistory.reduce<Record<string, number>>((totals, meal) => {
    totals[meal.mealDate] = (totals[meal.mealDate] ?? 0) + meal.calories;
    return totals;
  }, {});
  const calorieStatus = (total: number) => {
    if (!total) return "empty";
    if (!dietTargetCalories) return "has-data";
    const difference = Math.abs(total - dietTargetCalories) / dietTargetCalories;
    return difference <= .1 ? "on-target" : difference <= .2 ? "near-target" : "off-target";
  };

  const mealEntryMeals = data.mealHistory.filter((meal) => meal.mealDate === mealEntryDate);
  const mealEntryCalories = mealEntryMeals.reduce((sum, meal) => sum + meal.calories, 0);
  const mealsPanel = <article className="panel section-panel"><div className="panel-heading"><div><p>ENERGÍA DE {entryDayLabel(mealEntryDate)}</p><h2>Comidas</h2></div></div>
    <DayStrip label="Elegí el día de comidas que querés registrar" value={mealEntryDate} today={today} onChange={(date) => { setMealEntryDate(date); setEstimate(null); }} markedDates={new Set(data.mealHistory.map((meal) => meal.mealDate))} />
    {historicalScore(mealEntryDate)}
    {isPro ? <div className="ai-meal-box"><div className="ai-meal-title"><span>✦</span><div><b>Estimar con IA</b><small>Escribí qué comiste o mostralo con una foto.</small></div></div><textarea value={aiDescription} onChange={(event) => setAiDescription(event.target.value)} placeholder="Ej. milanesa con puré, porción mediana…" /><div className="ai-photo-row"><label className="photo-button">📷 {mealPhoto ? "Cambiar foto" : "Sacar o subir foto"}<input type="file" accept="image/*" capture="environment" onChange={(event) => void selectMealPhoto(event.target.files?.[0])} /></label>{photoPreview && <div className="photo-preview"><Image src={photoPreview} alt="Comida a analizar" width={38} height={38} unoptimized /><button onClick={() => { URL.revokeObjectURL(photoPreview); setPhotoPreview(""); setMealPhoto(null); }}>×</button></div>}<button className="analyze-button" disabled={estimating || (!mealPhoto && !aiDescription.trim())} onClick={() => void estimateMeal()}>{estimating ? "Analizando…" : "Analizar comida"}</button></div>
      {estimate && <div className="estimate-result"><div className="estimate-head"><div><span>ESTIMACIÓN PARA REVISAR</span><input value={estimate.mealName} onChange={(event) => setEstimate({ ...estimate, mealName: event.target.value })} /></div><label><input type="number" value={estimate.estimatedCalories} onChange={(event) => setEstimate({ ...estimate, estimatedCalories: Number(event.target.value) || 0 })} /><small>kcal</small></label></div><input className="estimate-detail" value={estimate.detail} onChange={(event) => setEstimate({ ...estimate, detail: event.target.value })} /><p>Rango probable: {estimate.minimumCalories}–{estimate.maximumCalories} kcal. {estimate.caveat}</p><button className="confirm-estimate" disabled={saving} onClick={() => void saveEstimate()}><SaveButtonContent label="Confirmar y guardar" phase={savePhase("add_meal")} /></button></div>}
    </div> : <LockedFeature
      title="Calorías con IA"
      note="Escribí qué comiste o sacale una foto al plato: la app estima calorías y macros."
      onOpen={openPro}
    ><div className="ai-meal-box"><div className="ai-meal-title"><span>✦</span><div><b>Estimar con IA</b><small>Escribí qué comiste o mostralo con una foto.</small></div></div><textarea readOnly value="" placeholder="Ej. milanesa con puré, porción mediana…" /><div className="ai-photo-row"><span className="photo-button">📷 Sacar o subir foto</span><span className="analyze-button">Analizar comida</span></div></div></LockedFeature>}
    <form className="meal-form" onSubmit={(event) => { const form = new FormData(event.currentTarget); void submitForm(event, { action: "add_meal", date: mealEntryDate, name: form.get("name"), detail: form.get("detail"), calories: form.get("calories"), protein: form.get("protein"), carbs: form.get("carbs"), fat: form.get("fat") }); }}>
      <label>Comida<input name="name" required placeholder="Ej. Milanesa con puré" /></label>
      <label>Detalle<input name="detail" required placeholder="Porción mediana, con ensalada…" /></label>
      <label>Calorías<input name="calories" type="number" min="0" placeholder="kcal" /></label>
      <button disabled={saving}><SaveButtonContent label="＋ Agregar" phase={savePhase("add_meal")} /></button>
    </form>
    <div className="meal-list">{mealEntryMeals.map((meal) => <div className="meal-row" key={meal.id}><span>🍽️</span><div><b>{meal.name}</b><small>{meal.detail} · P {meal.protein} / C {meal.carbs} / G {meal.fat}</small></div><strong>≈ {meal.calories} kcal</strong><button className="row-delete" onClick={() => void save({ action: "delete_meal", id: meal.id })}>×</button></div>)}{!mealEntryMeals.length && <div className="inline-empty"><span>🥗</span><p><b>Todavía no cargaste comidas {mealEntryDate === today ? "hoy" : "este día"}</b><small>Usá texto, foto o carga manual.</small></p></div>}</div><div className="calorie-total"><span>Total estimado</span><b>{mealEntryCalories.toLocaleString("es-AR")} kcal</b></div>
  </article>;

  const dietEstimate = estimateTargetCalories(dietForm);
  const dietQuickCaloriesValue = dietQuickCalories ?? dietEstimate?.targetCalories ?? 0;
  const dietQuickPanel = <article className="panel diet-quick-panel">
    <div className="panel-heading"><div><p>CALCULADORA RÁPIDA</p><h2>Calorías objetivo, sin IA</h2></div></div>
    <p className="diet-intro">Completá tus datos y te proponemos una cifra diaria de referencia. Podés aceptarla o modificarla antes de guardarla.</p>
    <div className="diet-fields">
      <label>Peso actual (kg)<input type="text" inputMode="decimal" min="35" max="300" value={dietNumberDrafts.currentWeightKg} onFocus={() => beginDietNumberInput("currentWeightKg")} onChange={(event) => updateDietNumberInput("currentWeightKg", event.target.value)} onBlur={() => finishDietNumberInput("currentWeightKg")} /></label>
      <label>Peso objetivo (kg)<input type="text" inputMode="decimal" min="35" max="300" value={dietNumberDrafts.targetWeightKg} onFocus={() => beginDietNumberInput("targetWeightKg")} onChange={(event) => updateDietNumberInput("targetWeightKg", event.target.value)} onBlur={() => finishDietNumberInput("targetWeightKg")} /></label>
      <label>Altura (cm)<input type="text" inputMode="numeric" min="120" max="230" value={dietNumberDrafts.heightCm} onFocus={() => beginDietNumberInput("heightCm")} onChange={(event) => updateDietNumberInput("heightCm", event.target.value)} onBlur={() => finishDietNumberInput("heightCm")} /></label>
      <label>Edad<input type="text" inputMode="numeric" min="18" max="100" value={dietNumberDrafts.age} onFocus={() => beginDietNumberInput("age")} onChange={(event) => updateDietNumberInput("age", event.target.value)} onBlur={() => finishDietNumberInput("age")} /></label>
      <label>Género<Dropdown ariaLabel="Género para la estimación" value={dietForm.sex} onChange={(value) => setDietQuickField("sex", value as DietForm["sex"])} options={[{ value: "unspecified", label: "Prefiero no indicar" }, { value: "male", label: "Masculino" }, { value: "female", label: "Femenino" }]} /></label>
      <label>Actividad<Dropdown ariaLabel="Actividad habitual" value={dietForm.activityLevel} onChange={(value) => setDietQuickField("activityLevel", value as DietForm["activityLevel"])} options={[{ value: "sedentary", label: "Baja / sedentaria" }, { value: "light", label: "Ligera · 1–3 días" }, { value: "moderate", label: "Moderada · 3–5 días" }, { value: "high", label: "Alta · 6–7 días" }]} /></label>
      <label>Intensidad<Dropdown ariaLabel="Intensidad del objetivo" value={dietForm.goalPace} onChange={(value) => setDietQuickField("goalPace", value as DietForm["goalPace"])} options={[{ value: "gentle", label: "Gradual" }, { value: "moderate", label: "Moderado" }]} /></label>
    </div>
    <div className="diet-quick-result">
      <label><span>CALORÍAS OBJETIVO</span><input type="text" inputMode="numeric" min="1000" max="6000" value={dietQuickCaloriesDraft ?? (dietQuickCaloriesValue ? String(dietQuickCaloriesValue) : "")} onFocus={beginDietQuickCaloriesInput} onChange={(event) => updateDietQuickCaloriesInput(event.target.value)} onBlur={finishDietQuickCaloriesInput} /><small>{dietEstimate ? `Sugerencia: ${dietEstimate.targetCalories.toLocaleString("es-AR")} kcal · mantenimiento ${dietEstimate.maintenanceCalories.toLocaleString("es-AR")} kcal` : "Completá tus datos para calcular una sugerencia."}</small></label>
      <button className="primary-action" type="button" disabled={saving || !dietQuickCaloriesValue} onClick={() => void saveDietTarget(dietQuickCaloriesValue)}><SaveButtonContent label="Guardar objetivo" phase={savePhase("set_diet_target")} /></button>
    </div>
  </article>;

  const dietPlannerPanel = <article className="panel diet-planner-panel">
    <div className="panel-heading"><div><p>PLAN PERSONAL CON IA</p><h2>Armá una alimentación sencilla para tu objetivo</h2></div>{savedDietPlan && <span className="week-pill">Plan guardado</span>}</div>
    <p className="diet-intro">Completá tus datos y contanos qué necesitás. La aplicación calcula una referencia energética y la IA propone opciones intercambiables; no reemplaza la evaluación de un nutricionista.</p>
    <div className="diet-builder-grid">
      <div className="diet-fields">
        <label>Edad<input type="text" inputMode="numeric" min="18" max="100" value={dietNumberDrafts.age} onFocus={() => beginDietNumberInput("age")} onChange={(event) => updateDietNumberInput("age", event.target.value)} onBlur={() => finishDietNumberInput("age")} /></label>
        <label>Altura (cm)<input type="text" inputMode="numeric" min="120" max="230" value={dietNumberDrafts.heightCm} onFocus={() => beginDietNumberInput("heightCm")} onChange={(event) => updateDietNumberInput("heightCm", event.target.value)} onBlur={() => finishDietNumberInput("heightCm")} /></label>
        <label>Peso actual (kg)<input type="text" inputMode="decimal" min="35" max="300" value={dietNumberDrafts.currentWeightKg} onFocus={() => beginDietNumberInput("currentWeightKg")} onChange={(event) => updateDietNumberInput("currentWeightKg", event.target.value)} onBlur={() => finishDietNumberInput("currentWeightKg")} /></label>
        <label>Peso objetivo (kg)<input type="text" inputMode="decimal" min="35" max="300" value={dietNumberDrafts.targetWeightKg} onFocus={() => beginDietNumberInput("targetWeightKg")} onChange={(event) => updateDietNumberInput("targetWeightKg", event.target.value)} onBlur={() => finishDietNumberInput("targetWeightKg")} /></label>
        <label>Sexo para la estimación<Dropdown ariaLabel="Sexo para la estimación" value={dietForm.sex} onChange={(value) => setDietForm({ ...dietForm, sex: value as DietForm["sex"] })} options={[{ value: "unspecified", label: "Prefiero no indicar" }, { value: "male", label: "Masculino" }, { value: "female", label: "Femenino" }]} /></label>
        <label>Actividad habitual<Dropdown ariaLabel="Actividad habitual" value={dietForm.activityLevel} onChange={(value) => setDietForm({ ...dietForm, activityLevel: value as DietForm["activityLevel"] })} options={[{ value: "sedentary", label: "Baja / sedentaria" }, { value: "light", label: "Ligera · 1–3 días" }, { value: "moderate", label: "Moderada · 3–5 días" }, { value: "high", label: "Alta · 6–7 días" }]} /></label>
        <label>Ritmo del objetivo<Dropdown ariaLabel="Ritmo del objetivo" value={dietForm.goalPace} onChange={(value) => setDietForm({ ...dietForm, goalPace: value as DietForm["goalPace"] })} options={[{ value: "gentle", label: "Gradual" }, { value: "moderate", label: "Moderado" }]} /></label>
        <label>Estilo preferido<input value={dietForm.preferences} onChange={(event) => setDietForm({ ...dietForm, preferences: event.target.value })} placeholder="Ej. económico, vegetariano, 4 comidas" /></label>
      </div>
      <div className="diet-conversation"><div className="diet-conversation-head"><span>✦</span><div><b>Contale los detalles a la aplicación</b><small>Intolerancias, alergias, horarios, gustos, presupuesto o alimentos que evitás.</small></div></div><div className="diet-detail-chips">{["Intolerancia a la lactosa", "Sin gluten", "Vegetariano", "Poco tiempo para cocinar"].map((detail) => <button key={detail} type="button" onClick={() => addDietDetail(detail)}>{detail}</button>)}</div><textarea value={dietForm.details} onChange={(event) => setDietForm({ ...dietForm, details: event.target.value })} placeholder="Ej. Soy intolerante a la lactosa, almuerzo fuera de casa y necesito comidas simples…" /><button className={"diet-voice-button " + (dietRecording ? "recording" : "")} type="button" disabled={dietVoiceLoading} onClick={() => dietRecording ? stopDietRecording() : void startDietRecording()}><span>{dietRecording ? "■" : "●"}</span>{dietVoiceLoading ? "Interpretando audio…" : dietRecording ? "Terminar grabación" : "Contarlo por audio"}</button><small className="privacy-note">El audio se transcribe y no se conserva.</small></div>
    </div>
    <button className="generate-diet-button" type="button" disabled={dietGenerating} onClick={() => void generateDietPlan()}>{dietGenerating ? "Creando opciones…" : displayedDietPlan ? "Actualizar mi plan con IA" : "Crear mi plan con IA"}</button>
    {displayedDietPlan && <div className="diet-plan-result"><div className="diet-plan-summary"><div><span>OBJETIVO DIARIO APROXIMADO</span><b>{displayedDietPlan.targetCalories.toLocaleString("es-AR")} kcal</b><small>Rango orientativo {displayedDietPlan.calorieRangeMinimum.toLocaleString("es-AR")}–{displayedDietPlan.calorieRangeMaximum.toLocaleString("es-AR")} kcal · mantenimiento estimado {displayedDietPlan.maintenanceCalories.toLocaleString("es-AR")}</small></div><p>{displayedDietPlan.summary}</p></div><div className="macro-row"><span><b>{displayedDietPlan.macros.proteinGrams} g</b>Proteínas</span><span><b>{displayedDietPlan.macros.carbsGrams} g</b>Carbohidratos</span><span><b>{displayedDietPlan.macros.fatGrams} g</b>Grasas</span></div><div className="diet-meal-options">{displayedDietPlan.meals.map((meal) => <article key={meal.slot}><span>{meal.slot}</span><p>{meal.guidance}</p><ul>{meal.options.map((option) => <li key={option}>{option}</li>)}</ul></article>)}</div><div className="diet-plan-bottom"><div><b>Restricciones aplicadas</b><p>{displayedDietPlan.appliedRestrictions.length ? displayedDietPlan.appliedRestrictions.join(" · ") : "Ninguna indicada"}</p></div><div><b>Importante</b><p>{displayedDietPlan.safetyNote}</p></div></div>{generatedDietPlan && <button className="save-diet-button" type="button" disabled={saving} onClick={() => void saveDietPlan()}><SaveButtonContent label="Guardar este plan y usarlo como objetivo" phase={savePhase("save_diet_plan")} /></button>}</div>}
  </article>;

  const calorieCalendarPanel = <article className="panel calorie-calendar-panel"><div className="calorie-calendar-top"><div><p>SEGUIMIENTO DE LA DIETA</p><h2>Calorías por día</h2><small>{dietTargetCalories ? <>Tu referencia actual es <b>{dietTargetCalories.toLocaleString("es-AR")} kcal diarias.</b></> : "Creá y guardá un plan para comparar cada día con tu objetivo."}</small></div><div className="calorie-calendar-nav"><button onClick={() => shiftDietCalendar(-1)}>‹</button><b>{dietCalendarMonthName}</b><button onClick={() => shiftDietCalendar(1)}>›</button></div></div><div className="calorie-calendar"><div className="calorie-weekdays">{["L", "M", "M", "J", "V", "S", "D"].map((day, index) => <b key={day + index}>{day}</b>)}</div><div className="calorie-calendar-cells">{Array.from({ length: dietCalendarOffset }, (_, index) => <span className="blank" key={"diet-blank-" + index} />)}{Array.from({ length: dietCalendarDays }, (_, index) => { const day = index + 1; const iso = dietCalendarCursor + "-" + String(day).padStart(2, "0"); const total = caloriesByDate[iso] ?? 0; return <div className={calorieStatus(total) + (iso === today ? " today" : "")} key={iso} title={total ? total + " kcal registradas" : "Sin comidas registradas"}><span>{day}</span><b>{total ? total.toLocaleString("es-AR") : "—"}</b><small>kcal</small></div>; })}</div></div><div className="calorie-legend"><span><i className="on-target" />En objetivo ±10%</span><span><i className="near-target" />Cerca ±20%</span><span><i className="off-target" />Fuera del rango</span><span><i className="empty" />Sin registro</span></div></article>;






  const settingsTitles: Record<SettingsView, string> = { home: "Configuración", personal: "Datos personales", language: "Idioma", notifications: "Notificaciones" };
  const settingsDialog = settingsOpen && <div className="voice-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false); }}>
    <section className="checkout-dialog settings-dialog settings-navigation" role="dialog" aria-modal="true" aria-label={settingsTitles[settingsView]}>
      <header className="settings-dialog-head">
        {settingsView !== "home" && <button type="button" className="settings-back" onClick={() => { setError(""); setSettingsView("home"); }} aria-label="Volver a Configuración">←</button>}
        <div><p className="checkout-label">CONFIGURACIÓN</p><h2>{settingsTitles[settingsView]}</h2></div>
        <button type="button" className="settings-close" onClick={() => setSettingsOpen(false)} aria-label="Cerrar">×</button>
      </header>

      {settingsView === "home" && <div className="settings-hub">
        <p>CUENTA</p>
        <button type="button" onClick={openPersonalSettings}><span aria-hidden="true">♙</span><div><b>Datos personales</b><small>Nombre, usuario y foto de perfil</small></div><i aria-hidden="true">›</i></button>
        <p>PREFERENCIAS</p>
        <button type="button" onClick={() => setSettingsView("language")}><span aria-hidden="true">文</span><div><b>Idioma</b><small>Español (Argentina)</small></div><i aria-hidden="true">›</i></button>
        <button type="button" onClick={() => setSettingsView("notifications")}><span aria-hidden="true">◌</span><div><b>Notificaciones</b><small>Resúmenes y próximos recordatorios</small></div><i aria-hidden="true">›</i></button>
      </div>}

      {settingsView === "personal" && <>
        <div className="avatar-editor">
          <div className="avatar-preview">{data.profile.avatarUrl ? <Image src={data.profile.avatarUrl} alt="Tu foto de perfil" width={64} height={64} unoptimized /> : <span>{displayName.charAt(0)}</span>}</div>
          <label className="avatar-upload-button">
            {avatarUploading ? "Subiendo…" : "Cambiar foto"}
            <input type="file" accept="image/*" disabled={avatarUploading} onChange={(event) => { void uploadAvatar(event.target.files?.[0]); event.target.value = ""; }} />
          </label>
        </div>
        <form className="data-form settings-form" onSubmit={saveSettings}>
          <label>Nombre<input value={settingsName} onChange={(event) => setSettingsName(event.target.value)} maxLength={60} required /></label>
          <label>Nombre de usuario<div className="username-input"><span>@</span><input value={settingsUsername} onChange={(event) => setSettingsUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} maxLength={20} /></div><small className="field-note">3 a 20 letras, números o _. Con esto te invitan tus amigos.</small></label>
          {error && <div className="error-banner">{error}<button type="button" onClick={() => setError("")}>Cerrar</button></div>}
          <div className="checkout-actions">
            <button type="button" className="checkout-cancel" onClick={() => setSettingsOpen(false)}>Cancelar</button>
            <button type="submit" className="checkout-pay" disabled={saving}><SaveButtonContent label="Guardar cambios" phase={savePhase("personal_settings")} /></button>
          </div>
        </form>
      </>}

      {settingsView === "language" && <div className="settings-subpanel">
        <p className="settings-copy">Elegí el idioma de la interfaz de AVORA.</p>
        <button type="button" className="settings-choice is-selected"><span>ES</span><div><b>Español (Argentina)</b><small>Idioma actual</small></div><i>✓</i></button>
        <button type="button" className="settings-choice" disabled><span>EN</span><div><b>English</b><small>Disponible próximamente</small></div><i>Próximamente</i></button>
      </div>}

      {settingsView === "notifications" && <NotificationSettings isPro={data.profile.isPro} />}
    </section>
  </div>;

  const feedbackDialog = feedbackOpen && <div className="voice-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setFeedbackOpen(false); }}>
    <section className="checkout-dialog settings-dialog feedback-dialog" role="dialog" aria-modal="true" aria-label="Ayudanos a mejorar AVORA">
      <header className="settings-dialog-head"><div><p className="checkout-label">TU EXPERIENCIA IMPORTA</p><h2>Ayudanos a mejorar AVORA</h2></div><button type="button" className="settings-close" onClick={() => setFeedbackOpen(false)} aria-label="Cerrar">×</button></header>
      {feedbackSent ? <div className="feedback-success"><span>✓</span><h3>Gracias por ayudarnos.</h3><p>Tu comentario quedó guardado para que podamos revisarlo durante la beta.</p><button type="button" onClick={() => setFeedbackSent(false)}>Enviar otro comentario</button></div> : <form className="feedback-form" onSubmit={submitFeedback}>
        <p className="settings-copy">Puede ser algo que te gustó, una idea, algo que cambiarías o un error.</p>
        <div className="feedback-types">{FEEDBACK_TYPES.map(([value, icon, title, copy]) => <button type="button" key={value} className={feedbackType === value ? "active" : ""} onClick={() => setFeedbackType(value)}><span>{icon}</span><p><b>{title}</b><small>{copy}</small></p><i>{feedbackType === value ? "✓" : ""}</i></button>)}</div>
        <label>¿En qué parte de AVORA?<select value={feedbackSection} onChange={(event) => setFeedbackSection(event.target.value)}>{FEEDBACK_SECTIONS.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Contanos un poco más<textarea value={feedbackMessage} onChange={(event) => setFeedbackMessage(event.target.value)} maxLength={2000} required placeholder={feedbackType === "bug" ? "Ej. Cuando selecciono cuatro prioridades, solo aparecen tres…" : "Escribí tu comentario…"} /></label>
        <div className="feedback-meta"><span>Adjuntamos automáticamente la pantalla, el navegador y la versión para entender el contexto.</span><b>{feedbackMessage.length}/2000</b></div>
        {error && <div className="error-banner">{error}<button type="button" onClick={() => setError("")}>Cerrar</button></div>}
        <button className="checkout-pay settings-save" disabled={saving || feedbackMessage.trim().length < 3}><SaveButtonContent label="Enviar comentario" phase={savePhase("submit_feedback")} /></button>
      </form>}
    </section>
  </div>;

  // ---------------------------------------------------------------------------
  // Amigos y grupos
  // ---------------------------------------------------------------------------
  const myEmail = social.me || data.profile.email.toLowerCase();
  const myStreak = { current: engagement?.currentStreak ?? 0, best: engagement?.bestStreak ?? 0, pendingToday: false };

  async function inviteFriend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInviteCopied(false);
    const result = await sendSocial({ action: "invite_friend", username: inviteUsername.trim().toLowerCase() });
    if (!result) return;
    const link = String(result.link ?? "");
    setInviteLink(link);
    setFriendsNotice(inviteUsername.trim()
      ? `Invitación lista para @${inviteUsername.trim().toLowerCase()}. Le aparece adentro de AVORA.`
      : "Link listo. Compartilo con quien quieras sumar.");
    setInviteUsername("");
  }

  async function copyInvite(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setInviteCopied(true);
    } catch {
      setFriendsNotice("No pudimos copiar el link. Seleccionalo y copialo a mano.");
    }
  }

  async function removeFriend(email: string, name: string) {
    if (!window.confirm(`¿Sacar a ${name} de tu círculo? Dejan de ver el Daily Score del otro.`)) return;
    if (await sendSocial({ action: "remove_friend", email })) setFriendsNotice(`${name} ya no está en tu círculo.`);
  }

  function closeGroupWizard() {
    setGroupWizard(false);
    setGroupDraft({ name: "", accent: "mint" });
    setWizardGoal(emptyGoalDraft());
    setWizardInvites([]);
  }

  /** El grupo se guarda entero: nombre, objetivo e invitaciones de una vez. */
  async function createGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await sendSocial({
      action: "create_group",
      name: groupDraft.name,
      accent: groupDraft.accent,
      goal: wizardGoal.title.trim() ? wizardGoal : null,
      invites: wizardInvites,
    });
    if (!result) return;
    const invited = Number(result.invited ?? 0);
    closeGroupWizard();
    setFriendsNotice(invited
      ? `Grupo guardado. Le mandamos la invitación a ${pluralize(invited, "persona", "personas")}: entran cuando la aceptan.`
      : "Grupo guardado. Sumá gente cuando quieras desde el ícono de amigos.");
  }

  async function joinGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await sendSocial({ action: "join_group", code: joinCode.trim() })) {
      setJoinCode("");
      setFriendsNotice("Entraste al grupo.");
    }
  }

  /** Abre —o cierra— uno de los tres paneles del encabezado de un grupo. */
  function toggleGroupPanel(group: Group, tab: GroupPanelTab) {
    const open = groupPanel?.id === group.id && groupPanel.tab === tab;
    setGroupPanel(open ? null : { id: group.id, tab });
    setEditingGoalId(null);
    setGoalDraft(emptyGoalDraft());
    if (!open && tab === "settings") setSettingsDraft({ name: group.name, accent: group.accent });
  }

  async function saveGroupSettings(event: FormEvent<HTMLFormElement>, groupId: number) {
    event.preventDefault();
    if (await sendSocial({ action: "update_group", groupId, ...settingsDraft })) {
      setFriendsNotice("Listo: el grupo quedó con el nombre y el color nuevos.");
    }
  }

  async function saveGroupGoal(event: FormEvent<HTMLFormElement>, groupId: number) {
    event.preventDefault();
    const editing = editingGoalId;
    const done = editing
      ? await sendSocial({ action: "update_group_goal", goalId: editing, ...goalDraft })
      : await sendSocial({ action: "add_group_goal", groupId, ...goalDraft });
    if (!done) return;
    setGoalDraft(emptyGoalDraft());
    setEditingGoalId(null);
    setFriendsNotice(editing
      ? "Objetivo actualizado."
      : "Objetivo fijado. Cada uno suma su parte y el grupo ve el total.");
  }

  /**
   * Los campos de un objetivo. Son los mismos al crear el grupo y al editarlo
   * después, así que el formulario se escribe una sola vez.
   */
  const goalFieldset = (draft: GoalDraft, update: (next: GoalDraft) => void) => <div className="goal-fields">
    <label className="wide"><span>¿Qué se proponen?</span>
      <input value={draft.title} onChange={(event) => update({ ...draft, title: event.target.value })} placeholder="Entrenar 12 veces este mes" maxLength={120} />
    </label>
    <label className="wide"><span>Cómo se cuenta</span>
      <Dropdown ariaLabel="Cómo se cuenta el objetivo" value={draft.source} onChange={(value) => update({ ...draft, source: value as GoalSource })} options={GOAL_SOURCES.map((source) => ({ value: source.value, label: source.label }))} />
    </label>
    <small className="goal-source-hint">{goalSource(draft.source).hint}</small>
    <label><span>Meta</span>
      <input type="number" min={1} max={100000} value={draft.targetValue} onChange={(event) => update({ ...draft, targetValue: Number(event.target.value) })} />
    </label>
    <label><span>Unidad</span>
      {draft.source === "manual"
        ? <Dropdown ariaLabel="Unidad del objetivo" value={draft.metric} onChange={(value) => update({ ...draft, metric: value as GoalMetric })} options={GOAL_METRICS.map((metric) => ({ value: metric.value, label: metric.label }))} />
        : <input value={goalSource(draft.source).unit} readOnly tabIndex={-1} />}
    </label>
    <label><span>Plazo</span>
      <Dropdown ariaLabel="Plazo del objetivo" value={draft.period} onChange={(value) => update({ ...draft, period: value as GroupGoal["period"] })} options={[{ value: "weekly", label: "Esta semana" }, { value: "monthly", label: "Este mes" }, { value: "custom", label: "Fecha propia" }]} />
    </label>
    {draft.period === "custom" && <label><span>Hasta</span>
      <input type="date" value={draft.dueDate} onChange={(event) => update({ ...draft, dueDate: event.target.value })} />
    </label>}
  </div>;

  const inviteText = inviteMessage(data.profile.displayName, inviteLink);
  const shareBox = inviteLink ? <div className="invite-share">
    <p><small>LINK DE INVITACIÓN</small><code>{inviteLink}</code></p>
    <div className="invite-share-actions">
      <button type="button" onClick={() => void copyInvite(inviteLink)}>{inviteCopied ? "Copiado ✓" : "Copiar link"}</button>
      <a href={whatsappLink(inviteText)} target="_blank" rel="noreferrer">WhatsApp</a>
      <a href={mailLink(inviteText)}>Mail</a>
    </div>
  </div> : null;

  const circleTab = <>
    <article className="panel invite-panel">
      <div className="panel-heading"><div><p>SUMAR GENTE</p><h2>Invitá a un amigo</h2></div></div>
      <form className="invite-form" onSubmit={inviteFriend}>
        <label><span>Nombre de usuario de tu amigo <small>(opcional)</small></span>
          <div className="username-input"><span>@</span><input value={inviteUsername} onChange={(event) => setInviteUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} maxLength={20} placeholder="su_usuario" /></div>
        </label>
        <button type="submit" disabled={saving}>{inviteUsername.trim() ? "Enviar invitación" : "Generar link"} <span>→</span></button>
      </form>
      <small className="invite-hint">Con el nombre de usuario le llega la invitación dentro de AVORA. Sin eso generás un link para mandar por WhatsApp o mail.</small>
      {shareBox}
    </article>

    {social.incoming.length > 0 && <article className="panel invite-inbox">
      <div className="panel-heading"><div><p>TE INVITARON</p><h2>{pluralize(social.incoming.length, "invitación pendiente", "invitaciones pendientes")}</h2></div></div>
      <ul className="invite-list">
        {social.incoming.map((invite) => <li key={invite.code}>
          <span className={"friend-avatar " + accentFor(invite.fromEmail)}>{initialsFor(invite.fromName || invite.fromEmail)}</span>
          <p><b>{invite.fromName || invite.fromEmail}</b><small>{invite.fromEmail}</small></p>
          <div>
            <button type="button" className="invite-accept" disabled={saving} onClick={() => void sendSocial({ action: "accept_invite", code: invite.code })}>Aceptar</button>
            <button type="button" className="invite-decline" disabled={saving} onClick={() => void sendSocial({ action: "decline_invite", code: invite.code })}>Rechazar</button>
          </div>
        </li>)}
      </ul>
    </article>}

    {social.outgoing.length > 0 && <article className="panel invite-inbox">
      <div className="panel-heading"><div><p>ESPERANDO RESPUESTA</p><h2>Invitaciones que mandaste</h2></div></div>
      <ul className="invite-list">
        {social.outgoing.map((invite) => <li key={invite.code}>
          <span className="friend-avatar">{invite.toEmail ? initialsFor(invite.toEmail) : "↗"}</span>
          <p><b>{invite.toEmail || "Link abierto"}</b><small>{invite.toEmail ? "Le aparece al iniciar sesión" : "Lo toma quien abra el link"}</small></p>
          <div>
            <button type="button" onClick={() => void copyInvite(`${window.location.origin}/invite/${invite.code}`)}>Copiar link</button>
            <button type="button" className="invite-decline" disabled={saving} onClick={() => void sendSocial({ action: "revoke_invite", code: invite.code })}>Cancelar</button>
          </div>
        </li>)}
      </ul>
    </article>}

    <section className="friends-score-grid">
      <article className="panel friend-score-card is-me">
        <div className="friend-score-head"><span className="friend-avatar">{initialsFor(data.profile.displayName)}</span><p><b>Vos</b><small>{myStreak.current > 0 ? <><StreakFlameIcon className="friend-streak-flame" /> {pluralize(myStreak.current, "día", "días")} de racha</> : "Empezá tu racha hoy"}</small></p></div>
        <div className="friend-score-main">
          <div className="friend-score-ring" style={{ "--friend-score": `${score}%` } as CSSProperties}><span><b>{score}</b><small>/100</small></span></div>
          <p><small>DAILY SCORE</small><b>{scoreLabel(score)}</b><span>Esto es lo único que ven tus amigos: el número y la racha, nunca tus registros.</span></p>
        </div>
      </article>
      {social.friends.map((friend) => {
        // `share` en una constante propia: el estrechamiento de `isFresh` no
        // sobrevive a un acceso por propiedad.
        const share = friend.share;
        const fresh = isFresh(share, today);
        const friendScore = fresh ? share.score : 0;
        return <article className={"panel friend-score-card" + (fresh ? "" : " is-stale")} key={friend.email}>
          <div className="friend-score-head">
            <span className={"friend-avatar " + accentFor(friend.email)}>{initialsFor(friend.name)}</span>
            <p><b>{friend.name}</b><small>{shareStatus(friend.share, today)}</small></p>
            <button type="button" aria-label={`Sacar a ${friend.name} de tu círculo`} onClick={() => void removeFriend(friend.email, friend.name)}>×</button>
          </div>
          <div className="friend-score-main">
            <div className="friend-score-ring" style={{ "--friend-score": `${friendScore}%` } as CSSProperties}><span><b>{fresh ? friendScore : "–"}</b><small>/100</small></span></div>
            <p><small>DAILY SCORE</small><b>{fresh ? share.headline : "Sin datos de hoy"}</b><span>{share ? <><StreakFlameIcon className="friend-streak-flame" /> {pluralize(share.streak, "día", "días")} de racha · mejor {share.bestStreak}</> : "Todavía sin racha"}</span></p>
          </div>
          <div className="friend-badges" aria-label={`Insignias desbloqueadas por ${friend.name}`}>
            <small>INSIGNIAS DESBLOQUEADAS</small>
            {share?.badges?.length ? <div className="friend-badge-list">{share.badges.map((id) => {
              const badge = BADGE_DEFINITIONS.find((item) => item.id === id);
              return badge ? <span className="friend-badge-chip" key={badge.id}><BadgeEmblem className="friend-badge-emblem" symbol={badge.symbol} tier={badge.tier} size={20} />{badge.title}</span> : null;
            })}</div> : <span className="friend-badges-empty">Todavía no desbloqueó insignias.</span>}
          </div>
          <div className="friend-nudge-wrap">
            <button type="button" className="friend-nudge" onClick={() => setNudgeOpenFor(nudgeOpenFor === friend.email ? null : friend.email)}>
              <span>✉ Mandar un mensaje</span><i>{nudgeOpenFor === friend.email ? "▲" : "▼"}</i>
            </button>
            {nudgeOpenFor === friend.email && <div className="ui-dropdown-panel friend-nudge-menu" role="menu">
              {FRIEND_NUDGE_MESSAGES.map((message) => <a key={message} role="menuitem" className="ui-dropdown-option" href={mailLink(message, friend.email)} onClick={() => setNudgeOpenFor(null)}>{message}</a>)}
            </div>}
          </div>
        </article>;
      })}
    </section>

    {social.friends.length === 0 && <p className="friends-empty">Todavía no tenés a nadie en tu círculo. Mandá una invitación y empiecen a compararse el Daily Score.</p>}
  </>;

  const groupsTab = <>
    {social.groupInvites.length > 0 && <article className="panel invite-inbox">
      <div className="panel-heading"><div><p>TE INVITARON A UN GRUPO</p><h2>{pluralize(social.groupInvites.length, "invitación pendiente", "invitaciones pendientes")}</h2></div></div>
      <ul className="invite-list">
        {social.groupInvites.map((invite) => <li key={invite.id}>
          <span className={"friend-avatar " + accentFor(invite.groupName || String(invite.groupId))}>{initialsFor(invite.groupName || "Grupo")}</span>
          <p><b>{invite.groupName || "Un grupo"}</b><small>Te invitó {invite.fromName || invite.fromEmail}</small></p>
          <div>
            <button type="button" className="invite-accept" disabled={saving} onClick={() => void sendSocial({ action: "accept_group_invite", inviteId: invite.id })}>Entrar</button>
            <button type="button" className="invite-decline" disabled={saving} onClick={() => void sendSocial({ action: "decline_group_invite", inviteId: invite.id })}>Rechazar</button>
          </div>
        </li>)}
      </ul>
    </article>}

    <article className="panel group-actions">
      <div className="panel-heading"><div><p>GRUPOS</p><h2>Objetivos en común</h2></div>
        {!groupWizard && <button type="button" className="accountability-add is-inline" onClick={() => setGroupWizard(true)}>＋ Crear grupo</button>}
      </div>
      {groupWizard ? <form className="group-wizard" onSubmit={createGroup}>
        <section className="group-step">
          <p><span>01</span>Nombre y color</p>
          <label className="group-field"><span>¿Cómo se llama el grupo?</span>
            <input autoFocus value={groupDraft.name} onChange={(event) => setGroupDraft({ ...groupDraft, name: event.target.value })} placeholder="Los del gimnasio" required minLength={2} maxLength={60} />
          </label>
          <div className="group-field"><span>Color</span>
            <div className="group-accents">{GROUP_ACCENTS.map((accent) => <button key={accent} type="button" className={"group-accent " + accent + (groupDraft.accent === accent ? " is-on" : "")} aria-label={`Color ${accent}`} aria-pressed={groupDraft.accent === accent} onClick={() => setGroupDraft({ ...groupDraft, accent })} />)}</div>
          </div>
        </section>

        <section className="group-step">
          <p><span>02</span>El objetivo en común</p>
          {goalFieldset(wizardGoal, setWizardGoal)}
        </section>

        <section className="group-step">
          <p><span>03</span>A quién invitás</p>
          {social.friends.length > 0 ? <>
            <div className="group-invite-picker">
              {social.friends.map((friend) => {
                const chosen = wizardInvites.includes(friend.email);
                return <button key={friend.email} type="button" className={chosen ? "is-on" : ""} aria-pressed={chosen}
                  onClick={() => setWizardInvites(chosen ? wizardInvites.filter((email) => email !== friend.email) : [...wizardInvites, friend.email])}>
                  <span className={"friend-avatar " + accentFor(friend.email)}>{initialsFor(friend.name)}</span>
                  <b>{friend.name}</b><i>{chosen ? "✓" : "＋"}</i>
                </button>;
              })}
            </div>
            <small className="group-step-hint">Les llega una invitación: entran al grupo recién cuando la aceptan.</small>
          </> : <p className="group-step-empty">Todavía no tenés a nadie en tu círculo. Guardá el grupo igual y sumá gente después desde el ícono de amigos.</p>}
        </section>

        <div className="group-wizard-actions">
          <button type="button" className="group-wizard-cancel" onClick={closeGroupWizard}>Cancelar</button>
          <button type="submit" disabled={saving || groupDraft.name.trim().length < 2}><SaveButtonContent label="Guardar grupo" phase={savePhase("create_group")} /></button>
        </div>
      </form> : <form className="group-join" onSubmit={joinGroup}>
        <label><span>¿Te pasaron un código?</span><input value={joinCode} onChange={(event) => setJoinCode(event.target.value)} placeholder="Código del grupo" /></label>
        <button type="submit" disabled={saving || !joinCode.trim()}>Entrar</button>
      </form>}
    </article>

    {social.groups.map((group) => {
      const isOwner = group.isOwner;
      const panel = groupPanel?.id === group.id ? groupPanel.tab : null;
      const candidates = social.friends.filter((friend) =>
        !group.members.some((member) => member.userEmail === friend.email)
        && !group.pending.some((invite) => invite.toEmail === friend.email));
      const tools: Array<[GroupPanelTab, ReactNode, string]> = [
        ["settings", gearIcon, "Configuración del grupo"],
        ["goals", plusIcon, "Objetivos del grupo"],
        ["members", friendsIcon, "Invitar y ver integrantes"],
      ];
      return <article className={"panel group-card " + group.accent} key={group.id}>
        <div className="group-card-head">
          <div className="group-card-id">
            <p>{pluralize(group.members.length, "integrante", "integrantes")}{group.pending.length > 0 ? ` · ${group.pending.length} sin responder` : ""}</p>
            <h3>{group.name}</h3>
          </div>
          <div className="group-member-stack">{group.members.slice(0, 5).map((member) => <span key={member.userEmail} className={accentFor(member.userEmail)} title={member.displayName}>{initialsFor(member.displayName)}</span>)}</div>
          <div className="group-card-tools">
            {tools.map(([tab, icon, label]) => <button key={tab} type="button" className={"group-tool" + (panel === tab ? " is-on" : "")}
              aria-label={`${label}: ${group.name}`} aria-pressed={panel === tab} onClick={() => toggleGroupPanel(group, tab)}>{icon}</button>)}
          </div>
        </div>

        <ul className="group-goal-list">
          {group.goals.map((goal) => {
            const mine = goal.contributions.find((item) => item.userEmail === myEmail)?.value ?? 0;
            const unit = goalUnit(goal);
            return <li key={goal.id}>
              <div className="group-goal-head">
                <div><small>{goalPeriodLabel(goal)}</small><b>{goal.title}</b></div>
                <p><strong>{goalTotal(goal)}</strong><small>de {goal.targetValue} {unit}</small></p>
              </div>
              <div className="accountability-track"><i style={{ width: `${goalPercent(goal)}%` }} /></div>
              <div className="group-goal-mine">
                {goal.source === "manual" ? <>
                  <span>Tu marca</span>
                  <button type="button" aria-label="Restar una" disabled={saving || mine <= 0} onClick={() => void sendSocial({ action: "log_goal_progress", goalId: goal.id, value: mine - 1 })}>−</button>
                  <b>{mine}</b>
                  <button type="button" aria-label="Sumar una" disabled={saving} onClick={() => void sendSocial({ action: "log_goal_progress", goalId: goal.id, value: mine + 1 })}>+</button>
                </> : <span className="group-goal-auto">↻ Se cuenta solo con lo que registrás en {goalSource(goal.source).label} · <b>{mine} {unit}</b></span>}
              </div>
              {group.members.length > 1 && <ul className="group-goal-contributions">
                {group.members.map((member) => {
                  const value = goal.contributions.find((item) => item.userEmail === member.userEmail)?.value ?? 0;
                  return <li key={member.userEmail}>
                    <span className={"friend-avatar " + accentFor(member.userEmail)}>{initialsFor(member.displayName)}</span>
                    <b>{member.displayName}</b><small>{value} {unit}</small>
                  </li>;
                })}
              </ul>}
            </li>;
          })}
          {!group.goals.length && <li className="group-goal-empty">Todavía no hay ningún objetivo. Abrí el ＋ y poné el primero.</li>}
        </ul>

        {panel === "settings" && <form className="group-panel" onSubmit={(event) => void saveGroupSettings(event, group.id)}>
          <p className="step-label">CONFIGURACIÓN DEL GRUPO</p>
          {isOwner ? <>
            <label className="group-field"><span>Nombre</span>
              <input value={settingsDraft.name} onChange={(event) => setSettingsDraft({ ...settingsDraft, name: event.target.value })} required minLength={2} maxLength={60} />
            </label>
            <div className="group-field"><span>Color</span>
              <div className="group-accents">{GROUP_ACCENTS.map((accent) => <button key={accent} type="button" className={"group-accent " + accent + (settingsDraft.accent === accent ? " is-on" : "")} aria-label={`Color ${accent}`} aria-pressed={settingsDraft.accent === accent} onClick={() => setSettingsDraft({ ...settingsDraft, accent })} />)}</div>
            </div>
            <button type="submit" className="group-save" disabled={saving}><SaveButtonContent label="Guardar cambios" phase={savePhase("update_group")} /></button>
          </> : <p className="group-panel-note">El nombre y el color los cambia quien creó el grupo.</p>}
          <div className="group-code">
            <p><small>CÓDIGO DEL GRUPO</small><code>{group.inviteCode}</code></p>
            <button type="button" onClick={() => void copyInvite(group.inviteCode)}>Copiar</button>
          </div>
          <div className="group-danger">
            {isOwner
              ? <button type="button" disabled={saving} onClick={() => { if (window.confirm(`¿Eliminar "${group.name}"? Se borra para todos los integrantes.`)) void sendSocial({ action: "delete_group", groupId: group.id }); }}>Eliminar grupo</button>
              : <button type="button" disabled={saving} onClick={() => { if (window.confirm(`¿Salir de "${group.name}"?`)) void sendSocial({ action: "leave_group", groupId: group.id }); }}>Salir del grupo</button>}
          </div>
        </form>}

        {panel === "goals" && <div className="group-panel">
          <p className="step-label">OBJETIVOS DEL GRUPO</p>
          {group.goals.length > 0 && <ul className="group-goal-admin">
            {group.goals.map((goal) => <li key={goal.id}>
              <p><b>{goal.title}</b><small>{goal.targetValue} {goalUnit(goal)} · {goalPeriodLabel(goal).toLowerCase()} · {goal.source === "manual" ? "a mano" : "automático"}</small></p>
              <button type="button" className={editingGoalId === goal.id ? "is-on" : ""} onClick={() => {
                setEditingGoalId(goal.id);
                setGoalDraft({ title: goal.title, source: goal.source, metric: goal.metric, targetValue: goal.targetValue, period: goal.period, dueDate: goal.dueDate });
              }}>Editar</button>
              {(goal.createdBy === myEmail || isOwner) && <button type="button" className="group-goal-drop" disabled={saving} onClick={() => { if (window.confirm(`¿Borrar el objetivo "${goal.title}"?`)) void sendSocial({ action: "delete_group_goal", goalId: goal.id }); }}>Borrar</button>}
            </li>)}
          </ul>}
          <form className="group-goal-form" onSubmit={(event) => void saveGroupGoal(event, group.id)}>
            <p className="step-label">{editingGoalId ? "EDITAR OBJETIVO" : "NUEVO OBJETIVO"}</p>
            {goalFieldset(goalDraft, setGoalDraft)}
            <div className="group-goal-form-actions">
              {editingGoalId !== null && <button type="button" className="group-wizard-cancel" onClick={() => { setEditingGoalId(null); setGoalDraft(emptyGoalDraft()); }}>Cancelar</button>}
              <button type="submit" disabled={saving || goalDraft.title.trim().length < 2}><SaveButtonContent label={editingGoalId ? "Guardar objetivo" : "Fijar objetivo"} phase={savePhase(editingGoalId ? "update_group_goal" : "add_group_goal")} /></button>
            </div>
          </form>
        </div>}

        {panel === "members" && <div className="group-panel">
          <p className="step-label">INTEGRANTES</p>
          <ul className="group-member-list">
            {group.members.map((member) => <li key={member.userEmail}>
              <span className={"friend-avatar " + accentFor(member.userEmail)}>{initialsFor(member.displayName)}</span>
              <b>{member.displayName}{member.userEmail === myEmail ? " (vos)" : ""}</b>
              <small>{member.role === "owner" ? "Creó el grupo" : "Integrante"}</small>
              {isOwner && member.userEmail !== myEmail && <button type="button" disabled={saving} onClick={() => { if (window.confirm(`¿Sacar a ${member.displayName} del grupo?`)) void sendSocial({ action: "remove_group_member", groupId: group.id, email: member.userEmail }); }}>Sacar</button>}
            </li>)}
            {group.pending.map((invite) => <li key={"invite-" + invite.id} className="is-pending">
              <span className="friend-avatar">{initialsFor(invite.toEmail)}</span>
              <b>{invite.toEmail}</b>
              <small>Invitación enviada</small>
              <button type="button" disabled={saving} onClick={() => void sendSocial({ action: "revoke_group_invite", inviteId: invite.id })}>Cancelar</button>
            </li>)}
          </ul>
          {candidates.length > 0 ? <div className="group-add-member">
            <span>Invitar a alguien de tu círculo</span>
            <div>{candidates.map((friend) => <button key={friend.email} type="button" disabled={saving} onClick={() => void sendSocial({ action: "invite_to_group", groupId: group.id, email: friend.email })}>＋ {friend.name}</button>)}</div>
            <small>Le llega una invitación: entra al grupo recién cuando la acepta.</small>
          </div> : <p className="group-panel-note">Todos los de tu círculo ya están adentro o tienen una invitación abierta.</p>}
          <div className="group-code">
            <p><small>CÓDIGO DEL GRUPO</small><code>{group.inviteCode}</code></p>
            <button type="button" onClick={() => void copyInvite(group.inviteCode)}>Copiar</button>
          </div>
        </div>}
      </article>;
    })}

    {!social.groups.length && !groupWizard && <p className="friends-empty">Sin grupos todavía. Creá uno, fijá el objetivo que los une e invitá a tu círculo.</p>}
  </>;

  const friendsPanel = <section className="friends-page">
    <article className="friends-hero">
      <div className="friends-hero-copy">
        <p>ACCOUNTABILITY PARTNERS</p>
        <h2>Avanzar acompañado<br /><em>cambia el compromiso.</em></h2>
        <small>Tus amigos ven tu Daily Score y tu racha de uso. Nada más: ni tus comidas, ni tu sueño, ni lo que escribís.</small>
        <div className="friends-hero-actions">
          <button type="button" className={friendsTab === "circle" ? "" : "secondary"} onClick={() => setFriendsTab("circle")}>Mi círculo{social.incoming.length > 0 ? ` (${social.incoming.length})` : ""}</button>
          <button type="button" className={friendsTab === "groups" ? "" : "secondary"} onClick={() => setFriendsTab("groups")}>Grupos{social.groupInvites.length > 0 ? ` (${social.groupInvites.length})` : ""}</button>
        </div>
      </div>
      <div className="friends-hero-visual" aria-hidden="true">
        <div className="friend-avatar-stack">
          <span>{initialsFor(data.profile.displayName)}</span>
          {social.friends.slice(0, 3).map((friend) => <span key={friend.email}>{initialsFor(friend.name)}</span>)}
        </div>
        <b>{pluralize(social.friends.length, "persona", "personas")}</b><small>en tu círculo</small>
        <div className="friends-weekly-proof"><strong>{myStreak.current}</strong><span>días seguidos<br />usando AVORA</span></div>
      </div>
    </article>
    {friendsNotice && <div className="friends-notice"><span>ⓘ</span><p>{friendsNotice}</p><button type="button" onClick={() => setFriendsNotice("")}>×</button></div>}
    {friendsTab === "circle" ? circleTab : groupsTab}
  </section>;

  const sectionTitles: Record<Section, [string, string]> = {
    summary: ["Buen día, " + displayName, "Tu plan de hoy y lo que conviene acomodar"],
    score: ["Daily Score", "Cómo se arma el puntaje y qué peso tiene cada área"],
    physical: ["Físico", "Entrenamiento y alimentación, el mismo cuerpo"],
    focus: [focusTab === "study" ? "Estudio" : "Trabajo", focusTab === "study" ? "Materias, foco, tareas y lecturas" : "Proyectos, foco profundo y entregas"],
    sleep: ["Sueño", "Horas de descanso y regularidad"],
    plan: ["Plan", "Lo que querés lograr y cuándo entra en el calendario"],
    stats: ["Progreso", "Rachas, tendencias y comparaciones"],
    friends: ["Amigos", "Daily Scores, objetivos compartidos y compromiso mutuo"],
    pro: [isPro ? "AVORA Pro" : "Pasate a Pro", isPro ? "Tu suscripción y todo lo que incluye" : "Lo que cambia cuando la app piensa con vos"],
  };
  const dateHeading = new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Buenos_Aires", weekday: "long", day: "numeric", month: "long" }).format(new Date(today + "T12:00:00")).toUpperCase();

  const onboardingGoalOptions = [
    ["training", "↗", "Entrenamiento", "Mejorar constancia y rendimiento"],
    ["focus", "⌁", "Estudio / Trabajo", "Avanzar con foco y organización"],
    ["nutrition", "◇", "Alimentación", "Comer de acuerdo con mis objetivos"],
    ["reading", "▱", "Lectura", "Leer y recordar más"],
    ["sleep", "☾", "Sueño", "Descansar mejor y con regularidad"],
    ["goals", "◎", "Objetivos", "Cumplir metas concretas"],
  ];
  function goBackFromOnboarding() {
    if (onboardingStep === 2) {
      setOnboardingStep(1);
      return;
    }
    window.location.href = "/signout-with-chatgpt?return_to=/";
  }
  if (!loading && !data.profile.onboardingCompleted) {
    const toggleGoal = (goal: string) => setOnboardingGoals((current) => current.includes(goal) ? current.filter((item) => item !== goal) : current.length < 3 ? [...current, goal] : current);
    const togglePreference = (preference: string) => setOnboardingPreferences((current) => current.includes(preference) ? current.filter((item) => item !== preference) : [...current, preference]);
    return <main className="editorial-onboarding">
      <header className="editorial-onboarding-header"><button type="button" className="lifetrack-brand onboarding-brand-back" onClick={goBackFromOnboarding} aria-label={onboardingStep === 2 ? "Volver al primer paso" : "Volver al inicio de sesión"}><span className="brand-mark"><BrandMark /></span><b>AVORA</b></button><span>Paso {onboardingStep} de 2</span></header>
      <div className="editorial-stepper" aria-label={`Paso ${onboardingStep} de 2`}>
        <div className="active"><span>01</span><b>Perfil</b><i /></div><div className={onboardingStep === 2 ? "active" : ""}><span>02</span><b>Prioridades</b></div>
      </div>
      <section className="editorial-onboarding-body">
        <div className="editorial-story">
          <span className="editorial-number">0{onboardingStep}</span>
          {onboardingStep === 1 ? <><h1>Primero,<br />conocerte.</h1><p>Este nombre aparecerá en tu perfil y en tu experiencia diaria.</p></> : <><h1>Tus<br />prioridades.</h1><p>Elegí entre 1 y 3 áreas para personalizar tu Daily Score.</p></>}
        </div>
        <div className="editorial-form-area">
          {onboardingStep === 1 ? <>
            <label className="editorial-name">¿Cómo te llamás?<input autoFocus value={onboardingName} onChange={(event) => setOnboardingName(event.target.value)} maxLength={60} placeholder="Tu nombre" /></label>
            <label className="editorial-name editorial-username">Elegí un nombre de usuario
              <div className="username-input"><span>@</span><input value={onboardingUsername} onChange={(event) => setOnboardingUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} maxLength={20} placeholder="tu_usuario" /></div>
              <small className={"username-status " + usernameStatus}>
                {usernameStatus === "checking" ? "Comprobando…"
                  : usernameStatus === "available" ? "✓ Disponible"
                  : usernameStatus === "taken" ? "Ya está en uso, probá con otro"
                  : usernameStatus === "invalid" ? "3 a 20 letras, números o _"
                  : "Con esto te van a poder invitar tus amigos"}
              </small>
            </label>
            <button className="editorial-primary" disabled={onboardingName.trim().length < 2 || usernameStatus !== "available"} onClick={() => setOnboardingStep(2)}>Continuar <span>→</span></button>
            <p className="editorial-note"><span>🔒</span> Podés cambiarlo cuando quieras.</p>
            <button type="button" className="editorial-back onboarding-login-back" onClick={goBackFromOnboarding}>← Volver al inicio de sesión</button>
          </> : <>
            <div className="editorial-priority-heading"><p>TUS PRIORIDADES</p><h2>¿Cuáles son tus prioridades?</h2><small>Elegí entre 1 y 3 áreas. Después podés cambiarlas cuando quieras.</small></div>
            <div className="editorial-goals">{onboardingGoalOptions.map(([value, icon, label, copy]) => <button type="button" aria-pressed={onboardingGoals.includes(value)} className={onboardingGoals.includes(value) ? "selected" : ""} key={value} onClick={() => toggleGoal(value)}><span>{icon}</span><p><b>{label}</b><small>{copy}</small></p><i>{onboardingGoals.includes(value) ? "✓" : "+"}</i></button>)}</div>
            <label className="weekly-consent"><input type="checkbox" checked={onboardingPreferences.includes("weekly")} onChange={() => togglePreference("weekly")} /><span aria-hidden="true">✉</span><p><b>Quiero recibir un resumen semanal de mi progreso</b><small>Podrás desactivarlo cuando quieras desde tu perfil.</small></p></label>
            {error && <div className="error-banner">{error}</div>}
            <div className="editorial-actions">
              <button type="button" className="editorial-back" onClick={() => setOnboardingStep(1)}>← Atrás</button>
              <form action="/api/onboarding" method="post" style={{ display: "contents" }}>
                <input type="hidden" name="displayName" value={onboardingName} />
                <input type="hidden" name="username" value={onboardingUsername} />
                <input type="hidden" name="mainGoals" value={JSON.stringify(onboardingGoals)} />
                <input type="hidden" name="usagePreferences" value={JSON.stringify(onboardingPreferences)} />
                <input type="hidden" name="monthKey" value={monthKey} />
                <button type="submit" className="editorial-primary" disabled={!onboardingGoals.length}>Entrar a AVORA <span>→</span></button>
              </form>
            </div>
          </>}
        </div>
      </section>
    </main>;
  }

  const profileMenuActions = <>
    <p>CUENTA</p>
    <button type="button" className="profile-menu-item" role="menuitem" onClick={() => { setProfileMenuOpen(false); setInboxOpen(true); }}>
      <span aria-hidden="true">◌</span>
      Notificaciones
      {unreadCount > 0 && <em className="profile-menu-count">{unreadCount}</em>}
    </button>
    <button type="button" className="profile-menu-item" role="menuitem" onClick={() => { setProfileMenuOpen(false); openSection("pro"); }}>
      <span aria-hidden="true">★</span>
      Gestionar membresía
    </button>
    <button type="button" className="profile-menu-item" role="menuitem" onClick={openSettings}>
      <span aria-hidden="true">⚙</span>
      Configuración
    </button>
    <button type="button" className="profile-menu-item" role="menuitem" onClick={() => { setProfileMenuOpen(false); setBadgesOpen(true); }}>
      <span aria-hidden="true">🏅</span>
      Mis Insignias
    </button>
    <button type="button" className="profile-menu-item" role="menuitem" onClick={openFeedback}>
      <span aria-hidden="true">♡</span>
      Ayudanos a mejorar AVORA
    </button>
    <a className="profile-menu-signout" href="/signout-with-chatgpt?return_to=/" role="menuitem">
      <span aria-hidden="true">↪</span>
      Cerrar sesión
    </a>
  </>;






  const streakPrompt = engagement?.pendingRestore ? "restore" : engagement?.lossNoticePending ? "lost" : null;
  async function submitStreakChoice(action: Exclude<StreakAction, "visit">) {
    setStreakActionBusy(true);
    setStreakActionError("");
    try {
      await runStreakAction(action);
    } catch (caught) {
      setStreakActionError(caught instanceof Error ? caught.message : "No pudimos actualizar tu racha.");
    } finally {
      setStreakActionBusy(false);
    }
  }

  const pullProgress = pullRefreshing ? 1 : Math.min(1, pullDistance / 72);
  return <WorkspaceContext.Provider value={workspace}>
    <div
      className={"pull-refresh-indicator " + ((pullDistance > 0 || pullRefreshing) ? "is-visible" : "")}
      style={{
        opacity: pullRefreshing ? 1 : Math.min(1, pullProgress * 1.3),
        transform: `translate(-50%, ${-44 + pullProgress * 52}px)`,
      }}
      role="status"
      aria-live="polite"
    >
      <span aria-hidden="true">{pullRefreshing ? "↻" : pullProgress >= 1 ? "↑" : "↓"}</span>
      <small>{pullRefreshing ? "Actualizando…" : pullProgress >= 1 ? "Soltá para actualizar" : "Deslizá para actualizar"}</small>
    </div>
    <main className="app-shell">
    <aside className="sidebar"><button type="button" className="side-brand" onClick={() => openSection("summary")} aria-label="Ir a Inicio"><span className="brand-mark small"><BrandMark /></span><b>AVORA</b></button><nav data-tour="nav">{navItems.map((item) => <button key={item.id} className={"nav-item " + (section === item.id ? "active" : "")} onClick={() => openSection(item.id)}><span className="nav-icon">{item.icon}</span>{item.label}</button>)}</nav><div className="profile-menu" ref={profileMenuRef}>
          {profileMenuOpen && <div className="profile-menu-panel" role="menu" aria-label="Opciones de la cuenta">{profileMenuActions}</div>}
          <button
            type="button"
            className="profile-chip profile-chip-button"
            data-tour="profile"
            onClick={() => setProfileMenuOpen((open) => !open)}
            aria-expanded={profileMenuOpen}
            aria-haspopup="menu"
          >
            {data.profile.avatarUrl ? <Image className="profile-chip-avatar" src={data.profile.avatarUrl} alt="" width={36} height={36} unoptimized /> : <span>{displayName.charAt(0)}</span>}
            <div><b>{displayName}</b><small>{data.profile.username ? "@" + data.profile.username : "Datos guardados"}</small></div>
            {unreadCount > 0 && <em className="profile-unread-count" aria-label={`${unreadCount} notificaciones sin leer`}>{unreadCount}</em>}
            <i className="profile-menu-chevron" aria-hidden="true">{profileMenuOpen ? "▾" : "▴"}</i>
          </button>
        </div></aside>
    <section className="dashboard"><header className="topbar"><div><p>{dateHeading}</p><h1>{sectionTitles[section][0]} {section === "summary" && <span>👋</span>}</h1><small className="page-subtitle">{sectionTitles[section][1]}</small></div><div className="topbar-actions"><div className={"save-status " + (saving ? "saving" : "")}><i />{saving ? "Guardando…" : "Todo guardado"}</div><div className="mobile-profile-wrap" ref={mobileProfileRef}><button type="button" className="mobile-profile-button" onClick={() => setProfileMenuOpen((open) => !open)} aria-expanded={profileMenuOpen} aria-haspopup="menu" aria-label="Abrir menú de cuenta">{data.profile.avatarUrl ? <Image src={data.profile.avatarUrl} alt="" width={42} height={42} unoptimized /> : <span>{initialsFor(data.profile.displayName) || displayName.charAt(0)}</span>}{unreadCount > 0 && <i className="profile-unread-dot" aria-label={`${unreadCount} notificaciones sin leer`} />}</button>{profileMenuOpen && <div className="profile-menu-panel mobile-profile-panel" role="menu" aria-label="Opciones de la cuenta">{profileMenuActions}</div>}</div></div></header>
      {error && <div className="error-banner">{error}{(error.includes("cargar") || error.includes("conectar tus datos")) && <button type="button" onClick={() => void loadData()}>Reintentar</button>}<button type="button" onClick={() => setError("")}>Cerrar</button></div>}
      {section === "summary" && <HomeSection />}
      {section === "score" && <ScoreSection />}
      {section === "physical" && <>
        <div className="period-switch section-switch">
          <button className={physicalTab === "training" ? "active" : ""} onClick={() => setPhysicalTab("training")}>Entrenamiento</button>
          <button className={physicalTab === "meals" ? "active" : ""} onClick={() => setPhysicalTab("meals")}>Alimentación</button>
        </div>
        {physicalTab === "training" ? <TrainingSection key={today} /> : <section className="single-section meals-section">
          {mealsPanel}
          {dietQuickPanel}
          {isPro ? dietPlannerPanel : <LockedFeature
            title="Plan de alimentación"
            note="Calculado con tu edad, peso y actividad, y adaptado a tus intolerancias."
            onOpen={openPro}
          >{dietPlannerPanel}</LockedFeature>}
          {calorieCalendarPanel}
        </section>}
      </>}
      {section === "focus" && <>
        <div className="period-switch section-switch">
          <button className={focusTab === "study" ? "active" : ""} onClick={() => setFocusTab("study")}>Estudio</button>
          <button className={focusTab === "work" ? "active" : ""} onClick={() => setFocusTab("work")}>Trabajo</button>
        </div>
        <FocusSection key={today} />
        {focusTab === "study" && <ReadingSection key={today} />}
      </>}
      {section === "sleep" && <SleepSection key={today} />}
      {section === "plan" && <PlanSection key={today} />}
      {section === "stats" && <StatsSection key={today} />}
      {section === "friends" && friendsPanel}
      {section === "pro" && <ProSection />}
    </section>
    <nav className="mobile-nav">{mobileNavItems.map((item) => <button key={item.id} className={[section === item.id ? "active" : "", item.center ? "is-center" : ""].filter(Boolean).join(" ")} onClick={() => openSection(item.id)}><span className="nav-icon">{item.icon}</span>{item.mobile}</button>)}</nav>
    {settingsDialog}
    {feedbackDialog}
    {announcementOpen && <EarlyAdopterAnnouncement busy={announcementSaving} error={announcementError} onAcknowledge={() => void acknowledgeAnnouncement()} />}
    {badgesOpen && <InsigniasModal stats={badgeStats} onClose={() => setBadgesOpen(false)} />}
    {inboxOpen && <NotificationsDialog
      items={inboxItems}
      today={today}
      busy={saving}
      onClose={() => setInboxOpen(false)}
      onOpenSummary={(weekStart) => showSummary(weekStart, false)}
      onFriendInvite={(code, accept) => void sendSocial({ action: accept ? "accept_invite" : "decline_invite", code })}
      onGroupInvite={(inviteId, accept) => void sendSocial({ action: accept ? "accept_group_invite" : "decline_group_invite", inviteId })}
      onMarkAllRead={() => markSummariesSeen(inboxItems.filter((item) => item.kind === "weekly_summary" && item.unread).map((item) => item.id))}
    />}
    {openSummary && weeklySummary && <WeeklySummaryDialog
      summary={weeklySummary}
      fresh={openSummary.fresh}
      onClose={() => setOpenSummary(null)}
      onOpenArea={(area) => { setOpenSummary(null); setInboxOpen(false); openArea({ training: "training", focus: "focus", sleep: "sleep", nutrition: "meals", reading: "books", goals: "goals" }[area]); }}
    />}
    {!announcementOpen && streakPrompt === "restore" && engagement?.pendingRestore && <div className="streak-modal-overlay" role="presentation">
      <section className="streak-modal" role="dialog" aria-modal="true" aria-labelledby="streak-modal-title">
        <span className="streak-modal-flame"><StreakFlameIcon /></span>
        <p className="streak-details-eyebrow">TU CONSTANCIA</p>
        <h2 id="streak-modal-title">¿Querés restablecer tu racha?</h2>
        <p>La última vez llevabas {pluralize(engagement.pendingRestore.startStreak, "día seguido", "días seguidos")}. Usá un restablecedor para recuperarla.</p>
        <small>Te quedan {engagement.restoresAvailable} de 3.</small>
        {streakActionError && <p className="streak-modal-error" role="alert">{streakActionError}</p>}
        <div className="streak-modal-actions">
          <button type="button" className="streak-modal-primary" disabled={streakActionBusy} onClick={() => void submitStreakChoice("restore")}>{streakActionBusy ? "Actualizando…" : "Restablecer racha"}</button>
          <button type="button" className="streak-modal-secondary" disabled={streakActionBusy} onClick={() => void submitStreakChoice("decline")}>Empezar de nuevo</button>
        </div>
      </section>
    </div>}
    {!announcementOpen && streakPrompt === "lost" && engagement && <div className="streak-modal-overlay" role="presentation">
      <section className="streak-modal" role="dialog" aria-modal="true" aria-labelledby="streak-modal-title">
        <span className="streak-modal-flame muted"><StreakFlameIcon /></span>
        <p className="streak-details-eyebrow">TU CONSTANCIA</p>
        <h2 id="streak-modal-title">Perdiste tu racha</h2>
        <p>{engagement.restoresAvailable === 0 ? "No tenés restablecedores para recuperarla." : "No tenés suficientes restablecedores para recuperarla."} Tu nueva racha empezó hoy.</p>
        {streakActionError && <p className="streak-modal-error" role="alert">{streakActionError}</p>}
        <div className="streak-modal-actions">
          <button type="button" className="streak-modal-primary" disabled={streakActionBusy} onClick={() => void submitStreakChoice("dismiss_loss")}>{streakActionBusy ? "Guardando…" : "Entendido"}</button>
        </div>
      </section>
    </div>}
    {tourActive && section === "summary" && <TourOverlay steps={TOUR_STEPS} onDone={() => setTourActive(false)} />}
    {voiceOpen && <VoiceCheckinDialog />}
    </main>
  </WorkspaceContext.Provider>;
}
