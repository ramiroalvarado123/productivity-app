"use client";

import { FormEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { listPhrase } from "@/shared/lib/format";
import { quoteForDate } from "@/shared/lib/quotes";
import { streakFor, sumByDate, weeklyStreakFor } from "@/domain/streaks";
import { type AppEngagement } from "@/features/engagement/logic/app-engagement";
import { dayBlocks, dayWindow, freeSlots, inferTaskCategory, overlappingBlocks, unscheduledTasks } from "@/domain/schedule";
import { buildInsights, closeInsights, type ComingDay, type InsightAction } from "@/features/insights/logic/insights";
import { dayFactors, scoreFrom, scoreWeightsForDate, trainingContribution, type DayRecord, type ScoreWeights } from "@/domain/score";
import { applyPatch, type DataPatch } from "@/shared/data/apply-patch";
import { BADGE_DEFINITIONS, type BadgeStats } from "@/features/engagement/logic/badges";
import { type InboxItem } from "@/features/notifications/components/notifications-center";
import { buildPatternInsights, rankInsights, type AreaKey } from "@/features/insights/logic/patterns";
import { buildWeeklySummary, lastClosedWeekStart } from "@/features/notifications/logic/weekly-summary";
import { useDebouncedRefresh } from "@/shared/data/use-debounced-refresh";
import { EARLY_ADOPTER_ANNOUNCEMENT_ID } from "@/features/notifications/logic/announcements";
import { emptySocial, goalWindow, type GroupAccent, type GroupGoal, type SocialData } from "@/features/friends/logic/social";
import type { DietForm, DietNumberDrafts, DietNumberKey, DietPlanContent, FeedbackType, FocusTab, MealEstimate, PhysicalTab, Priorities, ProgressData, SavePhase, Section, SettingsView, StreakAction, TrainingLog, User } from "@/shared/data/types";
import { DIET_NUMBER_LIMITS, dietNumberDraftsFrom, estimateTargetCalories, isDietNumberKey, parseDietNumber, parseDietPlan, preparePhoto } from "@/features/nutrition/logic/diet";
import type { GoalDraft, GroupPanelTab } from "@/features/friends/logic/goal-draft";
import { MAX_VOICE_UPLOAD_BYTES, VOICE_AUTO_STOP_BYTES } from "@/features/voice-checkin/constants";
import { SaveButtonContent } from "@/shared/ui/save-button";
import { insightTargets } from "@/features/app-shell/navigation";
import { argentinaDate, argentinaMinutes, dateMinus, datePlus, dayDistance, formatDate, weekFor, weekdayLabel } from "@/domain/dates";
import { emptyData } from "@/shared/data/empty-data";
import { emptyGoalDraft } from "@/features/friends/logic/goal-draft";
import { getTrainingWeeklyTargetServerSnapshot, getTrainingWeeklyTargetSnapshot, setTrainingWeeklyTargetValue, subscribeTrainingWeeklyTarget } from "@/features/training/hooks/use-training-weekly-target";
import { planDisciplineIdFor } from "@/domain/plan-disciplines";
import { readJson } from "@/shared/api/read-json";

/** Las props con las que arranca la app (vienen del servidor en app/page.tsx). */
export type WorkspaceProps = {
  initialUser: User;
  initialError?: string;
  /** Código guardado al abrir un link de invitación sin sesión. */
  pendingInviteCode?: string;
  /** Resultado de un link abierto ya con sesión, para avisar sin recargar. */
  inviteResult?: "" | "ok" | "error";
  /** Sólo viene en true en el primer redirect después de completar el onboarding (ver `?tour=1`). */
  showTutorial?: boolean;
};

/**
 * Todo lo que comparten las secciones: datos, guardado, Daily Score, rachas,
 * avisos y amigos. Las secciones lo leen con `useWorkspace()`; su estado propio
 * (formularios, fechas elegidas) vive en cada componente de sección.
 */
export function useWorkspaceState({ initialUser, initialError = "", pendingInviteCode = "", inviteResult = "", showTutorial = false }: WorkspaceProps) {
  const [today, setToday] = useState(argentinaDate);
  const monthKey = today.slice(0, 7);
  const week = useMemo(() => weekFor(today), [today]);
  const [data, setData] = useState<ProgressData>(() => emptyData(initialUser, monthKey));
  const [section, setSection] = useState<Section>("summary");
  const [tourActive, setTourActive] = useState(showTutorial);
  // El query param sólo sirve para prender el tour en este redirect puntual:
  // se lo saca de la URL enseguida para que un refresh no lo repita.
  useEffect(() => {
    if (!showTutorial) return;
    window.history.replaceState(null, "", window.location.pathname);
  }, [showTutorial]);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const mobileProfileRef = useRef<HTMLDivElement>(null);
  const [badgesOpen, setBadgesOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  /** Lunes de la semana cuyo resumen está abierto; `fresh` cuando se abrió solo por estar recién listo. */
  const [openSummary, setOpenSummary] = useState<{ weekStart: string; fresh: boolean } | null>(null);
  const autoSummaryRef = useRef("");
  const urlIntentRef = useRef<{ summary: string; notifications: boolean; section: string } | null>(null);
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const [announcementSaving, setAnnouncementSaving] = useState(false);
  const [announcementError, setAnnouncementError] = useState("");
  const announcementAcknowledgedRef = useRef(false);
  const [engagement, setEngagement] = useState<AppEngagement | null>(null);
  const [streakActionBusy, setStreakActionBusy] = useState(false);
  const [streakActionError, setStreakActionError] = useState("");
  const engagementVisitRef = useRef("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsView, setSettingsView] = useState<SettingsView>("home");
  const [settingsName, setSettingsName] = useState("");
  const [settingsUsername, setSettingsUsername] = useState("");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("idea");
  const [feedbackSection, setFeedbackSection] = useState("Inicio");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [loading, setLoading] = useState(initialUser.onboardingCompleted);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [saving, setSaving] = useState(false);
  // Estado del gesto móvil "tirar para actualizar". Los refs mantienen el
  // seguimiento del dedo sin recrear listeners en cada movimiento.
  const [pullDistance, setPullDistance] = useState(0);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const pullStartYRef = useRef<number | null>(null);
  const pullStartXRef = useRef<number | null>(null);
  const pullDistanceRef = useRef(0);
  const pullTrackingRef = useRef(false);
  const pullRefreshingRef = useRef(false);
  const [saveFeedback, setSaveFeedback] = useState<{ key: string; phase: Exclude<SavePhase, null> } | null>(null);
  const saveFeedbackTimerRef = useRef<number | null>(null);
  const [error, setError] = useState(initialError);
  const [onboardingStep, setOnboardingStep] = useState<1 | 2>(1);
  const [onboardingName, setOnboardingName] = useState(initialUser.displayName);
  const [onboardingUsername, setOnboardingUsername] = useState("");
  const [onboardingGoals, setOnboardingGoals] = useState<string[]>([]);
  const [onboardingPreferences, setOnboardingPreferences] = useState<string[]>([]);
  const usernameValue = onboardingUsername.trim().toLowerCase();
  const usernameFormatValid = /^[a-z0-9_]{3,20}$/.test(usernameValue);
  // Chequeo en vivo, con debounce, de si el nombre de usuario está libre. El
  // índice único del lado del servidor es la garantía real; esto es sólo para
  // avisar antes de que intenten enviar el formulario. El resultado va con el
  // valor que lo generó: si ya cambiaste lo que escribiste, "checking" se
  // deriva solo (más abajo) en vez de necesitar otro setState acá.
  const [usernameCheck, setUsernameCheck] = useState<{ value: string; status: "available" | "taken" } | null>(null);
  useEffect(() => {
    if (!usernameFormatValid) return;
    let cancelled = false;
    const timeout = setTimeout(() => {
      fetch("/api/progress", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ action: "check_username", username: usernameValue }) })
        .then((response) => response.json())
        .then((result: { available?: boolean }) => { if (!cancelled) setUsernameCheck({ value: usernameValue, status: result.available ? "available" : "taken" }); })
        .catch(() => {});
    }, 400);
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [usernameValue, usernameFormatValid]);
  const usernameStatus: "idle" | "checking" | "available" | "taken" | "invalid" = !usernameValue ? "idle"
    : !usernameFormatValid ? "invalid"
    : usernameCheck?.value === usernameValue ? usernameCheck.status
    : "checking";
  const [priorityDraft, setPriorityDraft] = useState<Priorities>({ monthKey, gymWeight: 2, nutritionWeight: 2, readingWeight: 2, sleepWeight: 2, focusWeight: 2, goalsWeight: 2 });
  // Meta de entrenamientos por semana, para la racha de constancia. Vive en
  // este navegador (no en el servidor) porque es una preferencia liviana de
  // lectura de la racha, no un dato que otra pantalla necesite.
  const trainingWeeklyTarget = useSyncExternalStore(subscribeTrainingWeeklyTarget, getTrainingWeeklyTargetSnapshot, getTrainingWeeklyTargetServerSnapshot);
  const setTrainingWeeklyTarget = setTrainingWeeklyTargetValue;
  const [physicalTab, setPhysicalTab] = useState<PhysicalTab>("training");
  const [focusTab, setFocusTab] = useState<FocusTab>("study");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [friendsNotice, setFriendsNotice] = useState(
    inviteResult === "ok" ? "¡Listo! Ya son amigos: van a ver el Daily Score del otro." :
    inviteResult === "error" ? "Esa invitación no se pudo usar: puede estar vencida, ya aceptada o ser para otra cuenta." : "",
  );
  const [social, setSocial] = useState<SocialData>(emptySocial);
  const [friendsTab, setFriendsTab] = useState<"circle" | "groups">("circle");
  const [nudgeOpenFor, setNudgeOpenFor] = useState<string | null>(null);
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);
  // Crear un grupo es un formulario aparte que termina en "Guardar grupo":
  // nombre, objetivo e invitaciones se deciden juntos y una sola vez.
  const [groupWizard, setGroupWizard] = useState(false);
  const [groupDraft, setGroupDraft] = useState({ name: "", accent: "mint" as GroupAccent });
  const [wizardGoal, setWizardGoal] = useState<GoalDraft>(emptyGoalDraft);
  const [wizardInvites, setWizardInvites] = useState<string[]>([]);
  const [joinCode, setJoinCode] = useState("");
  // Un grupo ya guardado muestra sólo su objetivo: el nombre, el color, los
  // objetivos y las invitaciones viven detrás de los tres íconos del encabezado.
  const [groupPanel, setGroupPanel] = useState<{ id: number; tab: GroupPanelTab } | null>(null);
  const [settingsDraft, setSettingsDraft] = useState({ name: "", accent: "mint" as GroupAccent });
  const [goalDraft, setGoalDraft] = useState<GoalDraft>(emptyGoalDraft);
  const [editingGoalId, setEditingGoalId] = useState<number | null>(null);
  /** Última marca automática publicada por objetivo, para no reenviarla igual. */
  const autoGoalRef = useRef<Record<number, number>>({});
  const publishedShareRef = useRef("");
  const pendingInviteRef = useRef(false);
  // Tildado optimista: la fila responde al toque y recién después se confirma
  // contra el servidor, así no hay medio segundo de pantalla muerta.
  const [pendingTasks, setPendingTasks] = useState<Record<number, boolean>>({});
  const [pendingEvents, setPendingEvents] = useState<Record<number, boolean>>({});
  const [agendaView, setAgendaView] = useState<"week" | "month">("week");
  const [nowMinutes, setNowMinutes] = useState(argentinaMinutes);
  const [dietCalendarCursor, setDietCalendarCursor] = useState(today.slice(0, 7));
  const [aiDescription, setAiDescription] = useState("");
  const [mealEntryDate, setMealEntryDate] = useState(today);
  const [mealPhoto, setMealPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState<MealEstimate | null>(null);
  const initialDietForm: DietForm = { age: 25, sex: "unspecified", heightCm: 175, currentWeightKg: 75, targetWeightKg: 70, activityLevel: "light", goalPace: "gentle", preferences: "", details: "" };
  const [dietForm, setDietForm] = useState<DietForm>(initialDietForm);
  const [dietNumberDrafts, setDietNumberDrafts] = useState<DietNumberDrafts>(() => dietNumberDraftsFrom(initialDietForm));
  const dietNumberFocusRef = useRef<Partial<Record<DietNumberKey, number>>>({});
  // Calculadora rápida (sin IA): null = seguir la sugerencia calculada en vivo; un número = lo que el usuario aceptó o modificó a mano.
  const [dietQuickCalories, setDietQuickCalories] = useState<number | null>(null);
  const [dietQuickCaloriesDraft, setDietQuickCaloriesDraft] = useState<string | null>(null);
  const dietQuickCaloriesFocusRef = useRef<number | null>(null);
  function setDietQuickField<K extends keyof DietForm>(key: K, value: DietForm[K]) {
    setDietForm((current) => ({ ...current, [key]: value }));
    if (isDietNumberKey(key)) setDietNumberDrafts((current) => ({ ...current, [key]: String(value) }));
    setDietQuickCalories(null);
    setDietQuickCaloriesDraft(null);
  }
  function beginDietNumberInput(key: DietNumberKey) {
    if (dietNumberFocusRef.current[key] === undefined) dietNumberFocusRef.current[key] = dietForm[key];
  }
  function updateDietNumberInput(key: DietNumberKey, raw: string) {
    setDietNumberDrafts((current) => ({ ...current, [key]: raw }));
    const parsed = parseDietNumber(raw);
    if (parsed !== null) setDietForm((current) => ({ ...current, [key]: parsed }));
    setDietQuickCalories(null);
    setDietQuickCaloriesDraft(null);
  }
  function finishDietNumberInput(key: DietNumberKey) {
    const raw = dietNumberDrafts[key].trim();
    const original = dietNumberFocusRef.current[key];
    const fallback = original ?? dietForm[key];
    const parsed = parseDietNumber(raw);
    const limits = DIET_NUMBER_LIMITS[key];
    if (raw === "" || parsed === null || parsed < limits.min || parsed > limits.max) {
      setDietForm((current) => ({ ...current, [key]: fallback }));
      setDietNumberDrafts((current) => ({ ...current, [key]: String(fallback) }));
    } else {
      setDietForm((current) => ({ ...current, [key]: parsed }));
      setDietNumberDrafts((current) => ({ ...current, [key]: String(parsed) }));
    }
    delete dietNumberFocusRef.current[key];
  }
  function beginDietQuickCaloriesInput() {
    const current = dietQuickCalories ?? estimateTargetCalories(dietForm)?.targetCalories ?? 0;
    dietQuickCaloriesFocusRef.current = current || null;
    setDietQuickCaloriesDraft(current ? String(current) : "");
  }
  function updateDietQuickCaloriesInput(raw: string) {
    setDietQuickCaloriesDraft(raw);
    const parsed = parseDietNumber(raw);
    if (parsed !== null) setDietQuickCalories(parsed);
  }
  function finishDietQuickCaloriesInput() {
    const raw = (dietQuickCaloriesDraft ?? "").trim();
    const fallback = dietQuickCaloriesFocusRef.current ?? dietQuickCalories ?? estimateTargetCalories(dietForm)?.targetCalories ?? 0;
    const parsed = parseDietNumber(raw);
    if (raw === "" || parsed === null || parsed < 1000 || parsed > 6000) {
      setDietQuickCalories(fallback || null);
      setDietQuickCaloriesDraft(fallback ? String(fallback) : "");
    } else {
      setDietQuickCalories(parsed);
      setDietQuickCaloriesDraft(String(parsed));
    }
    dietQuickCaloriesFocusRef.current = null;
  }
  const [dietGenerating, setDietGenerating] = useState(false);
  const [generatedDietPlan, setGeneratedDietPlan] = useState<DietPlanContent | null>(null);
  const [dietRecording, setDietRecording] = useState(false);
  const [dietVoiceLoading, setDietVoiceLoading] = useState(false);
  const dietRecorderRef = useRef<MediaRecorder | null>(null);
  const dietStreamRef = useRef<MediaStream | null>(null);
  const dietChunksRef = useRef<Blob[]>([]);
  const dietRecordingBytesRef = useRef(0);
  const dietStopTimerRef = useRef<number | null>(null);


  // El menú de cuenta se comporta como un desplegable real: cualquier toque
  // exterior o Escape lo cierra, sin interferir con sus acciones internas.
  useEffect(() => {
    if (!profileMenuOpen) return;
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!profileMenuRef.current?.contains(target) && !mobileProfileRef.current?.contains(target)) setProfileMenuOpen(false);
    };
    const closeWithEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setProfileMenuOpen(false); };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, [profileMenuOpen]);

  useEffect(() => () => {
    if (saveFeedbackTimerRef.current !== null) window.clearTimeout(saveFeedbackTimerRef.current);
  }, []);

  // Cada carga lleva un número: si llega una respuesta vieja después de una más nueva (o de un guardado), se descarta.
  const dietHydratedRef = useRef(false);
  const loadSeqRef = useRef(0);
  const silentFailuresRef = useRef(0);
  const loadData = useCallback(async (options?: { silent?: boolean }) => {
    const seq = ++loadSeqRef.current;
    const silent = options?.silent === true;
    try {
      const url = "/api/progress?date=" + today + "&weekStart=" + week[0].iso + "&weekEnd=" + week[6].iso + "&month=" + monthKey;
      let response: Response | null = null;
      let lastError: unknown = null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          response = await fetch(url, { cache: "no-store", credentials: "same-origin" });
          const transient = [408, 425, 429, 500, 502, 503, 504].includes(response.status);
          if (response.ok || !transient || attempt === 2) break;
        } catch (caught) {
          lastError = caught;
          if (attempt === 2) throw caught;
        }
        await new Promise((resolve) => window.setTimeout(resolve, attempt === 0 ? 600 : 1600));
      }
      if (!response) throw lastError instanceof Error ? lastError : new Error("No pudimos cargar tus datos.");
      const next = await readJson<ProgressData & { error?: string }>(response);
      if (!response.ok) throw new Error(next.error || "No pudimos cargar tus datos.");
      if (seq !== loadSeqRef.current) return;
      setData(next);
      if (!announcementAcknowledgedRef.current && next.profile.onboardingCompleted && !next.profile.seenAnnouncements?.includes(EARLY_ADOPTER_ANNOUNCEMENT_ID)) {
        setAnnouncementOpen(true);
      }
      setPriorityDraft(next.priorities);
      if (next.dietPlan && !dietHydratedRef.current) {
        const hydratedDietForm: DietForm = {
          age: next.dietPlan.age,
          sex: next.dietPlan.sex,
          heightCm: next.dietPlan.heightCm,
          currentWeightKg: next.dietPlan.currentWeightDeciKg / 10,
          targetWeightKg: next.dietPlan.targetWeightDeciKg / 10,
          activityLevel: next.dietPlan.activityLevel,
          goalPace: next.dietPlan.goalPace,
          preferences: next.dietPlan.preferences,
          details: next.dietPlan.details,
        };
        setDietForm(hydratedDietForm);
        setDietNumberDrafts(dietNumberDraftsFrom(hydratedDietForm));
        setDietQuickCalories(next.dietPlan.targetCalories || null);
        setDietQuickCaloriesDraft(null);
        dietHydratedRef.current = true;
      }
      const hadVisibleFailure = silentFailuresRef.current >= 2;
      silentFailuresRef.current = 0;
      if (!silent || hadVisibleFailure) setError("");
    } catch (caught) {
      if (seq !== loadSeqRef.current) return;
      // Una recarga silenciosa que falla una vez no molesta: el guardado ya salió bien. Recién a la segunda seguida avisamos.
      if (silent) {
        silentFailuresRef.current += 1;
        if (silentFailuresRef.current < 2) return;
      }
      setError(caught instanceof Error ? caught.message : "Ocurrió un error.");
    } finally {
      if (seq === loadSeqRef.current) setLoading(false);
    }
  }, [today, week, monthKey]);
  const silentReload = useCallback(() => loadData({ silent: true }), [loadData]);
  const scheduleRefresh = useDebouncedRefresh(silentReload, 800);
  const runStreakAction = useCallback(async (action: StreakAction) => {
    const response = await fetch("/api/streaks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ action }),
    });
    const result = await readJson<{ state?: AppEngagement; error?: string }>(response);
    if (!response.ok || !result.state) throw new Error(result.error || "No pudimos actualizar tu racha.");
    setEngagement(result.state);
    setStreakActionError("");
    return result.state;
  }, []);
  const acknowledgeAnnouncement = useCallback(async () => {
    if (announcementSaving) return;
    setAnnouncementSaving(true);
    setAnnouncementError("");
    try {
      const response = await fetch("/api/announcements/seen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ announcementId: EARLY_ADOPTER_ANNOUNCEMENT_ID }),
      });
      const result = await readJson<{ ok?: boolean; error?: string }>(response);
      if (!response.ok || !result.ok) throw new Error(result.error || "No pudimos guardar el anuncio.");
      announcementAcknowledgedRef.current = true;
      setData((current) => ({
        ...current,
        profile: { ...current.profile, seenAnnouncements: [...new Set([...(current.profile.seenAnnouncements ?? []), EARLY_ADOPTER_ANNOUNCEMENT_ID])] },
      }));
      setAnnouncementOpen(false);
    } catch (caught) {
      setAnnouncementError(caught instanceof Error ? caught.message : "No pudimos guardar el anuncio. Intentá nuevamente.");
    } finally {
      setAnnouncementSaving(false);
    }
  }, [announcementSaving]);

  // Initial synchronization with the signed-in user's persisted workspace.
  useEffect(() => {
    if (!initialUser.onboardingCompleted) return;
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadData, initialUser.onboardingCompleted]);

  // Cada cuenta registra una visita por día argentino, aunque abra AVORA desde
  // otro teléfono. El servidor deduplica las cargas repetidas del mismo día.
  useEffect(() => {
    if (!data.profile.onboardingCompleted || engagementVisitRef.current === today) return;
    engagementVisitRef.current = today;
    let cancelled = false;
    void runStreakAction("visit").catch((caught) => {
      if (cancelled) return;
      engagementVisitRef.current = "";
      setStreakActionError(caught instanceof Error ? caught.message : "No pudimos cargar tu racha.");
    });
    return () => { cancelled = true; };
  }, [data.profile.onboardingCompleted, today, runStreakAction]);
  // El plan del día marca "ahora" y no ofrece horarios que ya pasaron.
  useEffect(() => {
    const timer = window.setInterval(() => setNowMinutes(argentinaMinutes()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  // Detecta el cambio de fecha en Argentina aunque la app permanezca abierta.
  useEffect(() => {
    const syncToday = () => {
      const nextToday = argentinaDate();
      setToday((current) => current === nextToday ? current : nextToday);
      setNowMinutes(argentinaMinutes());
    };
    syncToday();
    const timer = window.setInterval(syncToday, 30000);
    window.addEventListener("focus", syncToday);
    window.addEventListener("pageshow", syncToday);
    document.addEventListener("visibilitychange", syncToday);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", syncToday);
      window.removeEventListener("pageshow", syncToday);
      document.removeEventListener("visibilitychange", syncToday);
    };
  }, []);
  // Keep the page counter aligned when the visible book changes.
  /* eslint-disable react-hooks/set-state-in-effect */


  const beginSaveFeedback = useCallback((key: string) => {
    if (saveFeedbackTimerRef.current !== null) window.clearTimeout(saveFeedbackTimerRef.current);
    setSaveFeedback({ key, phase: "saving" });
  }, []);

  const finishSaveFeedback = useCallback((key: string, succeeded: boolean) => {
    if (!succeeded) {
      setSaveFeedback((current) => current?.key === key ? null : current);
      return;
    }
    setSaveFeedback({ key, phase: "saved" });
    saveFeedbackTimerRef.current = window.setTimeout(() => {
      setSaveFeedback((current) => current?.key === key && current.phase === "saved" ? null : current);
      saveFeedbackTimerRef.current = null;
    }, 1000);
  }, []);

  const savePhase = (key: string): SavePhase => saveFeedback?.key === key ? saveFeedback.phase : null;
  const saveLabel = (label: ReactNode, key: string) => <SaveButtonContent label={label} phase={savePhase(key)} />;

  async function save(payload: Record<string, unknown>, feedbackKey = String(payload.action ?? "save")) {
    beginSaveFeedback(feedbackKey);
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/progress", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(payload) });
      const result = await readJson<{ error?: string; patch?: DataPatch }>(response);
      if (!response.ok) throw new Error(result.error || "No se pudo guardar.");
      // El servidor devuelve las filas que cambió: se ven al instante y la recarga silenciosa solo reconcilia.
      if (result.patch) setData((current) => applyPatch(current, result.patch!, today));
      // Las cargas en vuelo son anteriores a este guardado: se descartan y la recarga silenciosa trae el dato nuevo.
      loadSeqRef.current += 1;
      void scheduleRefresh();
      finishSaveFeedback(feedbackKey, true);
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo guardar.");
      finishSaveFeedback(feedbackKey, false);
      return false;
    } finally {
      setSaving(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Círculo social. Vive en su propio pedido: es la única parte de la app que
  // lee filas de otras cuentas, y no tiene por qué demorar el resto del panel.
  // ---------------------------------------------------------------------------
  const loadSocial = useCallback(async () => {
    try {
      const response = await fetch("/api/friends", { cache: "no-store", credentials: "same-origin" });
      const next = await readJson<SocialData & { error?: string }>(response);
      if (!response.ok) throw new Error(next.error || "No pudimos cargar tu círculo.");
      setSocial(next);
    } catch (caught) {
      setFriendsNotice(caught instanceof Error ? caught.message : "No pudimos cargar tu círculo.");
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setRefreshVersion((version) => version + 1);
    await Promise.allSettled([loadData(), loadSocial()]);
  }, [loadData, loadSocial]);

  // En celulares, tirar hacia abajo desde el inicio actualiza todo el espacio de trabajo
  // sin sacar al usuario de la sección en la que estaba.
  useEffect(() => {
    if (typeof window === "undefined" || !("ontouchstart" in window)) return;
    const threshold = 72;
    const pointerIsTouch = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
    if (!pointerIsTouch) return;
    const isAtTop = () => {
      const scrollElement = document.scrollingElement;
      return (scrollElement?.scrollTop ?? window.scrollY) <= 0;
    };
    const isBlockedTarget = (target: EventTarget | null) => (
      target instanceof Element &&
      Boolean(target.closest("input, textarea, select, button, [contenteditable='true'], [role='dialog']"))
    );
    const resetPull = () => {
      pullTrackingRef.current = false;
      pullStartYRef.current = null;
      pullStartXRef.current = null;
      pullDistanceRef.current = 0;
      setPullDistance(0);
    };
    const handleTouchStart = (event: TouchEvent) => {
      if (pullRefreshingRef.current || event.touches.length !== 1 || !isAtTop() || isBlockedTarget(event.target)) {
        resetPull();
        return;
      }
      const touch = event.touches[0];
      pullStartYRef.current = touch?.clientY ?? null;
      pullStartXRef.current = touch?.clientX ?? null;
      pullTrackingRef.current = pullStartYRef.current !== null && pullStartXRef.current !== null;
    };
    const handleTouchMove = (event: TouchEvent) => {
      if (!pullTrackingRef.current || pullRefreshingRef.current) return;
      if (event.touches.length !== 1) {
        resetPull();
        return;
      }
      const touch = event.touches[0];
      if (!touch || pullStartYRef.current === null || pullStartXRef.current === null) return;
      const deltaY = touch.clientY - pullStartYRef.current;
      const deltaX = touch.clientX - pullStartXRef.current;
      if (deltaY <= 0 || !isAtTop() || Math.abs(deltaX) > Math.abs(deltaY)) {
        resetPull();
        return;
      }
      pullDistanceRef.current = Math.min(threshold * 1.35, deltaY);
      setPullDistance(pullDistanceRef.current);
      if (event.cancelable && deltaY > 4) event.preventDefault();
    };
    const handleTouchEnd = () => {
      const shouldRefresh = pullTrackingRef.current && pullDistanceRef.current >= threshold;
      resetPull();
      if (!shouldRefresh || pullRefreshingRef.current) return;
      pullRefreshingRef.current = true;
      setPullRefreshing(true);
      void refreshAll().finally(() => {
        pullRefreshingRef.current = false;
        setPullRefreshing(false);
      });
    };
    const handleTouchCancel = () => resetPull();

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", handleTouchCancel, { passive: true });
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchCancel);
    };
  }, [refreshAll]);
  const scheduleSocialRefresh = useDebouncedRefresh(loadSocial, 800);
  const sendSocial = useCallback(async (payload: Record<string, unknown>, feedbackKey = String(payload.action ?? "social")) => {
    beginSaveFeedback(feedbackKey);
    setSaving(true);
    try {
      const response = await fetch("/api/friends", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(payload) });
      const result = await readJson<{ error?: string } & Record<string, unknown>>(response);
      if (!response.ok) throw new Error(result.error || "No se pudo completar la acción.");
      void scheduleSocialRefresh();
      finishSaveFeedback(feedbackKey, true);
      return result;
    } catch (caught) {
      setFriendsNotice(caught instanceof Error ? caught.message : "No se pudo completar la acción.");
      finishSaveFeedback(feedbackKey, false);
      return null;
    } finally {
      setSaving(false);
    }
  }, [beginSaveFeedback, finishSaveFeedback, scheduleSocialRefresh]);

  // Sólo saca duplicados reales (misma fila repetida): antes agrupaba por
  // proyecto+fecha y se comía sesiones legítimas cuando estudiabas la misma
  // materia dos veces el mismo día.
  const uniqueFocusSessions = useMemo(
    () => data.focusSessions.filter((item, index, rows) => rows.findIndex((candidate) => candidate.id === item.id) === index),
    [data.focusSessions],
  );

  // Series por fecha. Alimentan las tendencias de Progreso y también el
  // Daily Score, para que el puntaje de hoy y el del histórico salgan del
  // mismo lugar y nunca se contradigan entre pantallas.
  // Un bloque de foco agendado queda contabilizado en su fecha cuando se
  // completa la tarea. Como el origen es `completedAt`, desmarcarla lo quita
  // automáticamente y nunca se duplican sesiones en la base.
  const completedPlanTasks = useMemo(
    () => data.tasks.filter((task) => Boolean(task.completedAt && task.dueDate && task.durationMinutes > 0)),
    [data.tasks],
  );
  const completedPlanEvents = useMemo(
    () => data.events.filter((event) => Boolean(event.completedAt && event.eventDate && event.durationMinutes > 0)),
    [data.events],
  );
  // Une sesiones cargadas en Físico con bloques completados en Plan. La clave
  // fecha+disciplina evita contar dos veces si ambos registros existen.
  const effectiveTrainingLogs = useMemo<TrainingLog[]>(() => {
    const byDisciplineAndDate = new Map<string, TrainingLog>();
    for (const log of data.trainingLogs) {
      byDisciplineAndDate.set(log.trainingDate + ":" + log.disciplineId, log);
    }
    for (const event of completedPlanEvents) {
      const disciplineId = planDisciplineIdFor(event, data.disciplines);
      if (!disciplineId) continue;
      const key = event.eventDate + ":" + disciplineId;
      if (!byDisciplineAndDate.has(key)) {
        byDisciplineAndDate.set(key, {
          id: -event.id,
          disciplineId,
          trainingDate: event.eventDate,
          durationMinutes: event.durationMinutes,
          distanceMeters: 0,
          notes: event.title,
          quality: event.quality ?? null,
          planEventId: event.id,
        });
      }
    }
    return [...byDisciplineAndDate.values()];
  }, [data.trainingLogs, data.disciplines, completedPlanEvents]);
  // Foco puede registrarse manualmente o completarse desde Plan. Por cada
  // materia/proyecto y fecha usamos el mayor de ambos totales, para que una
  // misma hora no se convierta en dos por haberla visto en las dos pantallas.
  const effectiveFocusByProjectDate = useMemo<Record<string, number>>(() => {
    const manual = new Map<string, number>();
    const planned = new Map<string, number>();
    for (const session of uniqueFocusSessions) {
      const key = session.sessionDate + ":" + session.projectId;
      manual.set(key, (manual.get(key) ?? 0) + Math.max(0, session.minutes || 0));
    }
    for (const task of completedPlanTasks) {
      if (task.projectId === null || !task.dueDate) continue;
      const key = task.dueDate + ":" + task.projectId;
      planned.set(key, (planned.get(key) ?? 0) + Math.max(0, task.durationMinutes || 0));
    }
    return Object.fromEntries(
      [...new Set([...manual.keys(), ...planned.keys()])].map((key) => [key, Math.max(manual.get(key) ?? 0, planned.get(key) ?? 0)]),
    );
  }, [uniqueFocusSessions, completedPlanTasks]);
  const effectiveFocusMinutesFor = (projectId: number, matches: (date: string) => boolean) =>
    Object.entries(effectiveFocusByProjectDate).reduce((sum, [key, minutes]) => {
      const separator = key.lastIndexOf(":");
      const date = key.slice(0, separator);
      const keyProjectId = Number(key.slice(separator + 1));
      return keyProjectId === projectId && matches(date) ? sum + minutes : sum;
    }, 0);
  const completedEventFocusByDate = useMemo(
    () => sumByDate(
      completedPlanEvents.filter((event) => event.category === "study" || event.category === "work"),
      (event) => event.eventDate,
      (event) => Math.max(0, event.durationMinutes || 0),
    ),
    [completedPlanEvents],
  );
  const completedTrainingTasksByDate = useMemo(
    () => sumByDate(
      completedPlanTasks.filter((task) => !task.projectId && task.dueDate && inferTaskCategory(task.title) === "training"),
      (task) => task.dueDate as string,
      () => 1,
    ),
    [completedPlanTasks],
  );
  const completedTrainingEventsByDate = useMemo(
    () => sumByDate(
      completedPlanEvents.filter((event) => event.category === "training" && !planDisciplineIdFor(event, data.disciplines)),
      (event) => event.eventDate,
      () => 1,
    ),
    [completedPlanEvents, data.disciplines],
  );
  const trainingByDate = useMemo(() => {
    const totals = sumByDate(effectiveTrainingLogs, (row) => row.trainingDate, () => 1);
    for (const source of [completedTrainingTasksByDate, completedTrainingEventsByDate]) {
      for (const [date, count] of Object.entries(source)) {
        totals[date] = (totals[date] ?? 0) + count;
      }
    }
    return totals;
  }, [effectiveTrainingLogs, completedTrainingTasksByDate, completedTrainingEventsByDate]);
  // La calidad y la importancia se combinan: Malo 40%, Regular 60%,
  // Bueno 80% y Muy bueno 100%; una disciplina secundaria vale la mitad.
  const trainingScoreByDate = useMemo(() => {
    const weighted: Record<string, number> = {};
    const seen = new Set<string>();
    for (const log of effectiveTrainingLogs) {
      const key = log.trainingDate + ":" + log.disciplineId;
      if (seen.has(key)) continue;
      seen.add(key);
      const discipline = data.disciplines.find((item) => item.id === log.disciplineId);
      const contribution = trainingContribution(discipline?.priority, log.quality);
      weighted[log.trainingDate] = Math.min(1, (weighted[log.trainingDate] ?? 0) + contribution);
    }
    // Compatibilidad con bloques antiguos que todavía no pueden asociarse a
    // una disciplina: cuentan como actividad sin valorar, nunca como 100.
    for (const source of [completedTrainingTasksByDate, completedTrainingEventsByDate]) {
      for (const [date, count] of Object.entries(source)) {
        weighted[date] = Math.min(1, (weighted[date] ?? 0) + count * 0.5);
      }
    }
    return weighted;
  }, [effectiveTrainingLogs, data.disciplines, completedTrainingTasksByDate, completedTrainingEventsByDate]);
  const focusByDate = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const [key, minutes] of Object.entries(effectiveFocusByProjectDate)) {
      const date = key.slice(0, key.lastIndexOf(":"));
      totals[date] = (totals[date] ?? 0) + minutes;
    }
    for (const [date, minutes] of Object.entries(completedEventFocusByDate)) {
      totals[date] = (totals[date] ?? 0) + minutes;
    }
    return totals;
  }, [effectiveFocusByProjectDate, completedEventFocusByDate]);
  const readingByDate = sumByDate(data.readingHistory, (row) => row.logDate, (row) => row.pages);
  const caloriesByDay = sumByDate(data.mealHistory, (row) => row.mealDate, (row) => row.calories);
  const mealCountByDate = sumByDate(data.mealHistory, (row) => row.mealDate, () => 1);
  const sleepMinutesByDate = sumByDate(data.dailyCheckins.filter((row) => row.sleepMinutes > 0), (row) => row.entryDate, (row) => row.sleepMinutes);
  const sleepQualityByDate = Object.fromEntries(
    data.dailyCheckins.map((row) => [row.entryDate, row.sleepQuality === "good" || row.sleepQuality === "bad" ? row.sleepQuality : null]),
  ) as Record<string, "good" | "bad" | null>;

  // Fechas en las que cerraste algo. Se arma una vez porque el histórico del
  // Daily Score pregunta por cientos de días seguidos.
  const completionDates = useMemo(() => new Set([
    ...data.goals.filter((goal) => goal.completedAt).map((goal) => (goal.completedAt as string).slice(0, 10)),
    ...data.tasks.filter((task) => task.completedAt && task.dueDate).map((task) => task.dueDate as string),
    ...data.events.filter((event) => event.completedAt).map((event) => event.eventDate),
  ]), [data.goals, data.tasks, data.events]);

  /** Lo que registraste un día cualquiera, tal cual, sin interpretar. */
  const nutritionTargetCalories = data.dietPlan?.targetCalories ?? 0;
  const dayRecordFor = useCallback((date: string): DayRecord => ({
    trainingSessions: trainingByDate[date] ?? 0,
    trainingScore: (trainingScoreByDate[date] ?? 0) * 100,
    meals: mealCountByDate[date] ?? 0,
    calories: caloriesByDay[date] ?? 0,
    targetCalories: nutritionTargetCalories,
    sleepMinutes: sleepMinutesByDate[date] ?? 0,
    sleepQuality: sleepQualityByDate[date] ?? null,
    focusMinutes: focusByDate[date] ?? 0,
    focusTargetMinutes: data.profile.focusDailyTargetMinutes || 120,
    pages: readingByDate[date] ?? 0,
    completedSomething: completionDates.has(date),
    // Un objetivo cuenta como abierto ese día si ya existía y todavía no
    // estaba cerrado: así el histórico no se contamina con objetivos que
    // creaste después.
    hasOpenGoals: data.goals.some((goal) => goal.createdAt.slice(0, 10) <= date && (!goal.completedAt || goal.completedAt.slice(0, 10) >= date)),
  }), [trainingByDate, trainingScoreByDate, mealCountByDate, caloriesByDay, nutritionTargetCalories, sleepMinutesByDate, sleepQualityByDate, focusByDate, data.profile.focusDailyTargetMinutes, readingByDate, completionDates, data.goals]);

  const trainedToday = (trainingByDate[today] ?? 0) > 0;
  const calories = data.meals.reduce((sum, meal) => sum + meal.calories, 0);
  const pagesToday = data.readingLogs.reduce((sum, log) => sum + log.pages, 0);
  const sleepToday = data.dailyCheckins.find((item) => item.entryDate === today)?.sleepMinutes ?? 0;
  const focusToday = focusByDate[today] ?? 0;
  const scoreWeights: ScoreWeights = priorityDraft;
  const factors = dayFactors(dayRecordFor(today));
  const score = scoreFrom(factors, scoreWeights);
  /** Cada fecha se reconstruye con sus propios datos y las prioridades de su mes. */
  const scoreForDate = useCallback((date: string) => scoreFrom(
    dayFactors(dayRecordFor(date)),
    scoreWeightsForDate(date, data.priorityHistory ?? [], scoreWeights),
  ), [dayRecordFor, data.priorityHistory, scoreWeights]);
  const scoreActivityDates = useMemo(() => new Set([
    ...Object.keys(trainingByDate),
    ...data.mealHistory.map((item) => item.mealDate),
    ...data.dailyCheckins.map((item) => item.entryDate),
    ...Object.keys(focusByDate),
    ...data.readingHistory.filter((item) => item.pages > 0).map((item) => item.logDate),
    ...completionDates,
  ]), [trainingByDate, data.mealHistory, data.dailyCheckins, focusByDate, data.readingHistory, completionDates]);
  const scoreBadgeCounts = useMemo(() => {
    let scoreAbove90Days = 0;
    let perfectScoreDays = 0;
    for (const date of scoreActivityDates) {
      const value = scoreForDate(date);
      if (value > 90) scoreAbove90Days += 1;
      if (value === 100) perfectScoreDays += 1;
    }
    return { scoreAbove90Days, perfectScoreDays };
  }, [scoreActivityDates, scoreForDate]);
  const badgeStats = useMemo<BadgeStats>(() => ({
    bestStreak: engagement?.bestStreak ?? 0,
    totalUseDays: engagement?.totalUseDays ?? 0,
    scoreAbove90Days: scoreBadgeCounts.scoreAbove90Days,
    perfectScoreDays: scoreBadgeCounts.perfectScoreDays,
  }), [engagement?.bestStreak, engagement?.totalUseDays, scoreBadgeCounts]);
  const earnedBadgeIds = useMemo(
    () => BADGE_DEFINITIONS.filter((badge) => badgeStats[badge.metric] >= badge.target).map((badge) => badge.id),
    [badgeStats],
  );
  const earnedBadgeSignature = earnedBadgeIds.join(",");
  const entryDayLabel = (date: string) => date === today ? "HOY" : date === dateMinus(today, 1) ? "AYER" : formatDate(date).toUpperCase();
  const historicalScore = (date: string) => date === today ? null : <div className="historical-score" role="status" aria-live="polite">
    <div>
      <span>{date === dateMinus(today, 1) ? "DAILY SCORE DE AYER" : `DAILY SCORE · ${formatDate(date)}`}</span>
      <small>Se recalcula al guardar cambios de esta fecha.</small>
    </div>
    <strong>{scoreForDate(date)}<small>/100</small></strong>
  </div>;
  const priorityPairs: Array<[string, number]> = [["Entrenamiento", priorityDraft.gymWeight], ["Alimentación", priorityDraft.nutritionWeight], ["Sueño", priorityDraft.sleepWeight], ["Estudio / Trabajo", priorityDraft.focusWeight], ["Lectura", priorityDraft.readingWeight], ["Objetivos", priorityDraft.goalsWeight]];
  const highestPriority = Math.max(...priorityPairs.map((item) => item[1]));
  const topPriorities = priorityPairs.filter((item) => item[1] === highestPriority);
  // Elegir dos o tres áreas en el onboarding es lo normal, así que un empate no
  // significa "equilibrio": significa que esas áreas son las prioritarias.
  // Sólo hay equilibrio real cuando las seis pesan lo mismo.
  const priorityNames = topPriorities.map((item) => item[0]);
  // Sólo hay equilibrio cuando las seis áreas pesan exactamente lo mismo.
  // Cuatro o cinco prioridades siguen siendo una selección válida y deben
  // mostrarse completas en Inicio.
  const balanced = topPriorities.length === priorityPairs.length;
  const priorityCaption = balanced
    ? "Las seis áreas pesan lo mismo en tu Daily Score."
    : priorityNames.length === 1
      ? `${priorityNames[0]} pesa más que el resto en tu Daily Score.`
      : `${listPhrase(priorityNames)} pesan más que el resto en tu Daily Score.`;
  const displayName = data.profile.displayName.split(" ")[0] || "Usuario";
  const activeGoals = data.goals.filter((goal) => !goal.completedAt);
  const savedDietPlan = useMemo(() => parseDietPlan(data.dietPlan?.planJson), [data.dietPlan?.planJson]);
  const displayedDietPlan = generatedDietPlan ?? savedDietPlan;
  // El objetivo guardado: un plan generado y todavía sin guardar no cambia el puntaje ni los avisos.
  const dietTargetCalories = data.dietPlan?.targetCalories ?? 0;

  // ---------------------------------------------------------------------------
  // Plan del día: la agenda con horarios, los huecos libres y los avisos que
  // cruzan datos entre secciones. Todo derivado de `data`, sin pedidos extra.
  // ---------------------------------------------------------------------------
  const projectNames = useMemo(
    () => Object.fromEntries(data.focusProjects.map((project) => [project.id, project.name])) as Record<number, string>,
    [data.focusProjects],
  );
  const projectKinds = useMemo(
    () => Object.fromEntries(data.focusProjects.map((project) => [project.id, project.kind])) as Record<number, "study" | "work">,
    [data.focusProjects],
  );
  const disciplineNames = useMemo(
    () => Object.fromEntries(data.disciplines.map((discipline) => [discipline.id, discipline.name])) as Record<number, string>,
    [data.disciplines],
  );
  const scheduledEvents = useMemo(
    () => data.events.map((event) => ({ ...event, disciplineId: planDisciplineIdFor(event, data.disciplines) })),
    [data.events, data.disciplines],
  );
  const scheduleInput = useMemo(
    () => ({ tasks: data.tasks, events: scheduledEvents, projectNames, projectKinds, disciplineNames }),
    [data.tasks, scheduledEvents, projectNames, projectKinds, disciplineNames],
  );
  const todayBlocks = useMemo(() => dayBlocks(scheduleInput, today), [scheduleInput, today]);
  const todayUnscheduled = useMemo(() => unscheduledTasks(scheduleInput, today), [scheduleInput, today]);
  const lastCheckin = data.dailyCheckins.find((item) => item.sleepMinutes > 0);
  const todayWindow = useMemo(
    () => dayWindow(lastCheckin?.wakeTime ?? "", lastCheckin?.bedtime ?? ""),
    [lastCheckin?.wakeTime, lastCheckin?.bedtime],
  );
  const todaySlots = useMemo(
    () => freeSlots(todayBlocks, todayWindow.start, todayWindow.end),
    [todayBlocks, todayWindow.start, todayWindow.end],
  );

  // Rachas: días consecutivos con actividad en cada área. Entrenamiento es la
  // excepción: nadie entrena todos los días, así que su racha es semanal
  // (semanas seguidas cumpliendo la meta de entrenamientos por semana).
  const readingDates = useMemo(() => new Set(data.readingHistory.filter((item) => item.pages > 0).map((item) => item.logDate)), [data.readingHistory]);
  const focusDates = useMemo(
    () => new Set(Object.entries(focusByDate).filter(([, minutes]) => minutes > 0).map(([date]) => date)),
    [focusByDate],
  );
  const goodSleepDates = useMemo(() => new Set(data.dailyCheckins.filter((item) => item.sleepMinutes >= 420).map((item) => item.entryDate)), [data.dailyCheckins]);
  const loggingDates = useMemo(() => new Set([...data.mealHistory.map((item) => item.mealDate), ...data.dailyCheckins.map((item) => item.entryDate)]), [data.mealHistory, data.dailyCheckins]);
  const streaks = useMemo(() => ({
    training: weeklyStreakFor(trainingByDate, trainingWeeklyTarget, today),
    reading: streakFor(readingDates, today),
    focus: streakFor(focusDates, today),
    sleep: streakFor(goodSleepDates, today),
    logging: streakFor(loggingDates, today),
  }), [trainingByDate, trainingWeeklyTarget, readingDates, focusDates, goodSleepDates, loggingDates, today]);

  // El círculo se carga una vez que la cuenta ya pasó el onboarding: antes no
  // hay nada que mostrar y el pedido sólo agregaría ruido.
  useEffect(() => {
    if (!initialUser.onboardingCompleted) return;
    void loadSocial();
  }, [loadSocial, initialUser.onboardingCompleted]);

  // Un link de invitación abierto sin sesión dejó el código esperando: se
  // canjea solo, una sola vez, apenas la persona entra.
  useEffect(() => {
    if (!pendingInviteCode || pendingInviteRef.current) return;
    pendingInviteRef.current = true;
    void (async () => {
      const result = await sendSocial({ action: "accept_invite", code: pendingInviteCode });
      if (result) {
        const name = String(result.friendName ?? "");
        setFriendsNotice(name ? `Ya son amigos con ${name}.` : "¡Listo! Ya son amigos.");
        setSection("friends");
      }
    })();
  }, [pendingInviteCode, sendSocial]);

  // La foto del día que ven los amigos: sólo el número y la racha, nunca los
  // registros que lo componen. Se publica cuando cambia, no en cada render.
  useEffect(() => {
    if (!initialUser.onboardingCompleted || loading || !engagement) return;
    const signature = `${today}:${score}:${engagement.currentStreak}:${engagement.bestStreak}:${earnedBadgeSignature}`;
    if (publishedShareRef.current === signature) return;
    publishedShareRef.current = signature;
    void fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ action: "publish_share", shareDate: today, score, streak: engagement.currentStreak, bestStreak: engagement.bestStreak, badges: earnedBadgeIds }),
    }).catch(() => { publishedShareRef.current = ""; });
  }, [initialUser.onboardingCompleted, loading, today, score, engagement, earnedBadgeSignature, earnedBadgeIds]);

  // ---------------------------------------------------------------------------
  // Objetivos de grupo que se cuentan solos. Un objetivo puede declarar de qué
  // se alimenta: si dice "entrenamientos", tu marca sale de lo que ya cargaste
  // en Físico y no hay que anotarla dos veces. Lo que viaja al grupo sigue
  // siendo un número, nunca el registro que lo produjo.
  // ---------------------------------------------------------------------------
  const autoSeries = useMemo(() => ({
    training: trainingByDate,
    focus: focusByDate,
    reading: sumByDate(data.readingHistory, (row) => row.logDate, (row) => row.pages),
    sleep: sumByDate(data.dailyCheckins.filter((row) => row.sleepMinutes >= 420), (row) => row.entryDate, () => 1),
  }), [trainingByDate, focusByDate, data.readingHistory, data.dailyCheckins]);

  const autoGoalValue = useCallback((goal: GroupGoal) => {
    if (goal.source === "manual") return 0;
    const window = goalWindow(goal, today);
    let total = 0;
    for (const [date, value] of Object.entries(autoSeries[goal.source])) {
      if (date >= window.start && date <= window.end) total += value;
    }
    return total;
  }, [autoSeries, today]);

  useEffect(() => {
    if (!initialUser.onboardingCompleted || loading) return;
    const me = social.me || data.profile.email.toLowerCase();
    const stale = social.groups
      .flatMap((group) => group.goals)
      .filter((goal) => goal.source !== "manual")
      .map((goal) => ({ goalId: goal.id, value: autoGoalValue(goal), saved: goal.contributions.find((item) => item.userEmail === me)?.value ?? 0 }))
      // El `ref` corta el ciclo: sin él, la recarga que sigue al envío vuelve a
      // disparar el efecto antes de que la fila nueva llegue al cliente.
      .filter((row) => row.value !== row.saved && autoGoalRef.current[row.goalId] !== row.value);
    if (!stale.length) return;
    for (const row of stale) autoGoalRef.current[row.goalId] = row.value;
    void (async () => {
      for (const row of stale) {
        await fetch("/api/friends", {
          method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
          body: JSON.stringify({ action: "log_goal_progress", goalId: row.goalId, value: row.value }),
        }).catch(() => { delete autoGoalRef.current[row.goalId]; });
      }
      await loadSocial();
    })();
  }, [social.groups, social.me, autoGoalValue, data.profile.email, initialUser.onboardingCompleted, loading, loadSocial]);

  // Sueño reciente contra la semana anterior, para detectar la caída.
  const sleepByDate = useMemo(
    () => Object.fromEntries(data.dailyCheckins.filter((item) => item.sleepMinutes > 0).map((item) => [item.entryDate, item.sleepMinutes])) as Record<string, number>,
    [data.dailyCheckins],
  );
  const recentSleepNights = useMemo(
    () => Array.from({ length: 3 }, (_, index) => sleepByDate[dateMinus(today, index)]).filter((value): value is number => Boolean(value)),
    [sleepByDate, today],
  );
  const earlierSleepNights = useMemo(
    () => Array.from({ length: 7 }, (_, index) => sleepByDate[dateMinus(today, index + 3)]).filter((value): value is number => Boolean(value)),
    [sleepByDate, today],
  );

  // Áreas con actividad reciente, para saber qué objetivo está realmente parado.
  const activeCategories = useMemo(() => {
    const since = dateMinus(today, 5);
    const categories = new Set<string>();
    if (Object.keys(trainingByDate).some((date) => date >= since && date <= today)) { categories.add("training"); categories.add("gym"); }
    if (data.mealHistory.some((item) => item.mealDate >= since)) categories.add("nutrition");
    if (data.readingHistory.some((item) => item.logDate >= since && item.pages > 0)) categories.add("reading");
    if (Object.keys(focusByDate).some((date) => date >= since && date <= today)) { categories.add("study"); categories.add("work"); }
    if (data.dailyCheckins.some((item) => item.entryDate >= since && item.sleepMinutes > 0)) categories.add("sleep");
    return categories;
  }, [trainingByDate, data.mealHistory, data.readingHistory, data.dailyCheckins, focusByDate, today]);

  // Los tres días siguientes con sus huecos: es lo que permite que un aviso
  // diga "pasalo al miércoles" en vez de "mirá si algo puede pasar a mañana".
  const comingDays = useMemo<ComingDay[]>(() => Array.from({ length: 3 }, (_, index) => {
    const date = datePlus(today, index + 1);
    const blocks = dayBlocks(scheduleInput, date);
    return { date, label: weekdayLabel(date), slots: freeSlots(blocks, todayWindow.start, todayWindow.end) };
  }), [today, scheduleInput, todayWindow.start, todayWindow.end]);

  const insights = useMemo(() => buildInsights({
    today,
    nowMinutes,
    blocks: todayBlocks,
    slots: todaySlots,
    dayWindow: todayWindow,
    unscheduled: todayUnscheduled.map((task) => ({ id: task.id, title: task.title, durationMinutes: task.durationMinutes })),
    sleepLastNight: sleepByDate[today] ?? sleepByDate[dateMinus(today, 1)] ?? 0,
    sleepRecent: recentSleepNights,
    sleepEarlier: earlierSleepNights,
    caloriesToday: calories,
    targetCalories: dietTargetCalories,
    pagesLast3Days: data.readingHistory.filter((item) => item.logDate >= dateMinus(today, 2)).reduce((sum, item) => sum + item.pages, 0),
    booksInProgress: data.books.filter((book) => book.status === "reading").length,
    goalsDueSoon: data.goals
      .filter((goal) => !goal.completedAt && dayDistance(today, goal.targetDate) >= 0 && dayDistance(today, goal.targetDate) <= 7)
      .map((goal) => ({ title: goal.title, days: dayDistance(today, goal.targetDate), category: goal.category })),
    activeCategories,
    overlaps: overlappingBlocks(todayBlocks),
    comingDays,
  }), [today, nowMinutes, todayBlocks, todaySlots, todayWindow, todayUnscheduled, sleepByDate, recentSleepNights, earlierSleepNights, calories, dietTargetCalories, data.readingHistory, data.books, data.goals, activeCategories, comingDays]);
  // Patrones del historial: cruzan áreas, siguen metas y rachas. Se suman a
  // los avisos de la agenda y el panel muestra los más relevantes sin repetir área.
  const patternInsights = useMemo(() => {
    const scores: Record<string, number> = {};
    for (let index = 0; index <= 60; index += 1) {
      const date = dateMinus(today, index);
      scores[date] = scoreForDate(date);
    }
    const sleepRows = data.dailyCheckins.filter((row) => row.sleepMinutes > 0);
    const priorityAreas: Array<{ area: AreaKey; label: string; weight: number }> = [
      { area: "training", label: "Entrenamiento", weight: priorityDraft.gymWeight },
      { area: "nutrition", label: "Alimentación", weight: priorityDraft.nutritionWeight },
      { area: "sleep", label: "Sueño", weight: priorityDraft.sleepWeight },
      { area: "focus", label: "Estudio / Trabajo", weight: priorityDraft.focusWeight },
      { area: "reading", label: "Lectura", weight: priorityDraft.readingWeight },
    ];
    return buildPatternInsights({
      today,
      nowMinutes,
      training: trainingByDate,
      focus: focusByDate,
      sleep: sleepByDate,
      bedtimes: Object.fromEntries(sleepRows.map((row) => [row.entryDate, row.bedtime])),
      wakeTimes: Object.fromEntries(sleepRows.map((row) => [row.entryDate, row.wakeTime])),
      reading: sumByDate(data.readingHistory, (row) => row.logDate, (row) => row.pages),
      calories: sumByDate(data.mealHistory, (row) => row.mealDate, (row) => row.calories),
      meals: sumByDate(data.mealHistory, (row) => row.mealDate, () => 1),
      scores,
      targetCalories: dietTargetCalories,
      focusTargetMinutes: data.profile.focusDailyTargetMinutes || 120,
      trainingWeeklyTarget,
      priorities: priorityAreas,
      books: data.books.filter((book) => book.status === "reading"),
    });
  }, [today, nowMinutes, scoreForDate, data.dailyCheckins, data.readingHistory, data.mealHistory, data.books, data.profile.focusDailyTargetMinutes, priorityDraft, trainingByDate, focusByDate, sleepByDate, dietTargetCalories, trainingWeeklyTarget]);
  const planNotices = useMemo(() => rankInsights([...insights, ...patternInsights]), [insights, patternInsights]);
  const closeNotices = useMemo(() => closeInsights(insights).filter((notice) => !planNotices.some((shown) => shown.id === notice.id)), [insights, planNotices]);

  // ---------------------------------------------------------------------------
  // Notificaciones de la cuenta: el resumen de cada semana cerrada y las
  // invitaciones de amistad y de grupos. Lo leído se guarda en el perfil, así
  // que un resumen visto en el celular ya figura leído en la compu.
  // ---------------------------------------------------------------------------
  const seenIds = useMemo(() => new Set(data.profile.seenAnnouncements ?? []), [data.profile.seenAnnouncements]);
  const latestSummaryWeek = lastClosedWeekStart(today, nowMinutes);
  const summaryWeeks = useMemo(() => {
    const weeks: Array<{ weekStart: string; weekEnd: string; average: number; activeDays: number }> = [];
    for (let index = 0; index < 8; index += 1) {
      const weekStart = dateMinus(latestSummaryWeek, index * 7);
      const dates = Array.from({ length: 7 }, (_, day) => datePlus(weekStart, day));
      const activeDays = dates.filter((date) => scoreActivityDates.has(date)).length;
      if (!activeDays) continue;
      weeks.push({ weekStart, weekEnd: dates[6], average: Math.round(dates.reduce((sum, date) => sum + scoreForDate(date), 0) / 7), activeDays });
    }
    return weeks;
  }, [latestSummaryWeek, scoreActivityDates, scoreForDate]);
  const inboxItems = useMemo<InboxItem[]>(() => {
    const dayMonth = (date: string) => new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" }).format(new Date(date + "T12:00:00")).replace(".", "");
    const items: InboxItem[] = [
      ...social.incoming.map((invite) => ({ id: `friend_invite:${invite.code}`, kind: "friend_invite" as const, date: invite.createdAt, title: invite.fromName || invite.fromEmail, body: "Quiere sumarte a su círculo para compartir el Daily Score y las rachas.", unread: true as const, code: invite.code })),
      ...social.groupInvites.map((invite) => ({ id: `group_invite:${invite.id}`, kind: "group_invite" as const, date: invite.createdAt, title: invite.groupName || "Un grupo", body: `Te invitó ${invite.fromName || invite.fromEmail}.`, unread: true as const, inviteId: invite.id })),
      ...summaryWeeks.map((week) => ({ id: `weekly_summary:${week.weekStart}`, kind: "weekly_summary" as const, date: week.weekEnd, title: `Tu semana del ${dayMonth(week.weekStart)} al ${dayMonth(week.weekEnd)}`, body: `Daily Score promedio ${week.average}/100 · ${week.activeDays}/7 días con registros.`, unread: week.weekStart === latestSummaryWeek && !seenIds.has(`weekly_summary:${week.weekStart}`), weekStart: week.weekStart })),
    ];
    return items.sort((left, right) => right.date.localeCompare(left.date));
  }, [social.incoming, social.groupInvites, summaryWeeks, seenIds, latestSummaryWeek]);
  const unreadCount = inboxItems.filter((item) => item.unread).length;
  const markSummariesSeen = useCallback((ids: string[]) => {
    const fresh = ids.filter((id) => !(data.profile.seenAnnouncements ?? []).includes(id));
    if (!fresh.length) return;
    setData((current) => ({ ...current, profile: { ...current.profile, seenAnnouncements: [...new Set([...(current.profile.seenAnnouncements ?? []), ...fresh])] } }));
    void fetch("/api/announcements/seen", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ ids: fresh }) }).catch(() => undefined);
  }, [data.profile.seenAnnouncements]);
  const showSummary = useCallback((weekStart: string, fresh: boolean) => {
    const monday = weekFor(weekStart)[0].iso;
    autoSummaryRef.current = `weekly_summary:${monday}`;
    setOpenSummary({ weekStart: monday, fresh });
    markSummariesSeen([`weekly_summary:${monday}`]);
  }, [markSummariesSeen]);
  const weeklySummary = useMemo(() => {
    if (!openSummary) return null;
    const weekStart = openSummary.weekStart;
    const dates = Array.from({ length: 14 }, (_, index) => datePlus(weekStart, index - 7));
    const weekEnd = datePlus(weekStart, 6);
    return buildWeeklySummary({
      weekStart,
      scores: Object.fromEntries(dates.map((date) => [date, scoreForDate(date)])),
      training: trainingByDate,
      trainingWeeklyTarget,
      disciplines: data.disciplines,
      trainingLogs: effectiveTrainingLogs,
      exerciseLogs: data.exerciseLogs,
      meals: data.mealHistory,
      targetCalories: dietTargetCalories,
      sleep: data.dailyCheckins,
      focus: focusByDate,
      focusTargetMinutes: data.profile.focusDailyTargetMinutes || 120,
      focusSessions: uniqueFocusSessions,
      focusProjects: data.focusProjects,
      readingLogs: data.readingHistory,
      books: data.books,
      notesCreated: [...data.notes.map((note) => note.createdAt), ...(data.resourceNotes ?? []).map((note) => note.createdAt)],
      resourcesDone: (data.resources ?? []).filter((item) => item.status === "done").map((item) => ({ title: item.title, updatedAt: item.updatedAt ?? item.createdAt })),
      goalsCompleted: data.goals.filter((goal) => goal.completedAt).map((goal) => ({ title: goal.title, completedAt: goal.completedAt as string })),
      tasksCompleted: data.tasks.filter((task) => task.completedAt && task.dueDate && task.dueDate >= weekStart && task.dueDate <= weekEnd).length,
    });
  }, [openSummary, scoreForDate, trainingByDate, trainingWeeklyTarget, data, effectiveTrainingLogs, dietTargetCalories, focusByDate, uniqueFocusSessions]);

  // Links de las notificaciones push: ?summary=<lunes>, ?notifications=1 o ?section=<sección>.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const summary = params.get("summary") ?? "";
    const section = params.get("section") ?? "";
    if (!summary && !params.has("notifications") && !section) return;
    urlIntentRef.current = { summary: /^\d{4}-\d{2}-\d{2}$/.test(summary) ? summary : "", notifications: params.has("notifications"), section };
    window.history.replaceState(null, "", window.location.pathname);
  }, []);
  useEffect(() => {
    const intent = urlIntentRef.current;
    if (!intent || loading) return;
    urlIntentRef.current = null;
    if (["summary", "score", "physical", "focus", "sleep", "plan", "stats", "friends", "pro"].includes(intent.section)) openSection(intent.section as Section);
    if (intent.summary) showSummary(intent.summary, false);
    else if (intent.notifications) setInboxOpen(true);
  }, [loading, showSummary]);
  // El resumen de la semana que acaba de cerrar se abre solo, una vez.
  useEffect(() => {
    if (loading || !initialUser.onboardingCompleted || announcementOpen || openSummary || inboxOpen || urlIntentRef.current) return;
    if (engagement?.pendingRestore || engagement?.lossNoticePending) return;
    const latest = summaryWeeks[0];
    if (!latest || latest.weekStart !== latestSummaryWeek) return;
    const id = `weekly_summary:${latest.weekStart}`;
    if (seenIds.has(id) || autoSummaryRef.current === id) return;
    showSummary(latest.weekStart, true);
  }, [loading, initialUser.onboardingCompleted, announcementOpen, openSummary, inboxOpen, engagement, summaryWeeks, latestSummaryWeek, seenIds, showSummary]);

  const quote = useMemo(() => quoteForDate(today), [today]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function openSection(next: Section) {
    setSection(next);
    // Los pasos del tour sólo existen en Inicio: si navegás a otra sección
    // mientras está abierto, se corta en vez de quedar "esperando".
    if (next !== "summary") setTourActive(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function submitForm(event: FormEvent<HTMLFormElement>, payload: Record<string, unknown>) {
    const form = event.currentTarget;
    event.preventDefault();
    const ok = await save(payload);
    if (ok) form.reset();
  }
  function openSettings() {
    setSettingsName(data.profile.displayName);
    setSettingsUsername(data.profile.username);
    setSettingsView("home");
    setError("");
    setSettingsOpen(true);
    setProfileMenuOpen(false);
  }
  function openPersonalSettings() {
    setSettingsName(data.profile.displayName);
    setSettingsUsername(data.profile.username);
    setError("");
    setSettingsView("personal");
  }
  function openFeedback() {
    setFeedbackSent(false);
    setError("");
    setFeedbackOpen(true);
    setProfileMenuOpen(false);
  }
  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = settingsName.trim();
    if (trimmedName.length < 2) { setError("Ingresá tu nombre."); return; }
    if (trimmedName !== data.profile.displayName && !await save({ action: "update_profile", displayName: trimmedName }, "personal_settings")) return;
    const trimmedUsername = settingsUsername.trim().toLowerCase();
    if (trimmedUsername !== data.profile.username && !await save({ action: "set_username", username: trimmedUsername }, "personal_settings")) return;
    setSettingsOpen(false);
  }
  async function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (feedbackMessage.trim().length < 3) return;
    const feedbackKey = "submit_feedback";
    beginSaveFeedback(feedbackKey);
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          type: feedbackType,
          section: feedbackSection,
          message: feedbackMessage.trim(),
          pagePath: window.location.pathname,
          userAgent: navigator.userAgent,
          appVersion: "beta",
        }),
      });
      const result = await readJson<{ error?: string }>(response);
      if (!response.ok) throw new Error(result.error || "No pudimos enviar el comentario.");
      finishSaveFeedback(feedbackKey, true);
      window.setTimeout(() => {
        setFeedbackMessage("");
        setFeedbackSent(true);
      }, 1000);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos enviar el comentario.");
      finishSaveFeedback(feedbackKey, false);
    } finally {
      setSaving(false);
    }
  }
  async function uploadAvatar(file: File | null | undefined) {
    if (!file) return;
    setAvatarUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/avatar", { method: "POST", body: form, credentials: "same-origin" });
      const result = await readJson<{ error?: string }>(response);
      if (!response.ok) throw new Error(result.error || "No pudimos subir la foto.");
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos subir la foto.");
    } finally {
      setAvatarUploading(false);
    }
  }


  async function selectMealPhoto(file: File | undefined) {
    if (!file) return;
    setEstimating(true);
    const prepared = await preparePhoto(file);
    setMealPhoto(prepared);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(URL.createObjectURL(prepared));
    setEstimate(null);
    setEstimating(false);
  }
  async function estimateMeal() {
    if (!aiDescription.trim() && !mealPhoto) return setError("Escribí qué comiste o agregá una foto.");
    setEstimating(true);
    setEstimate(null);
    try {
      const form = new FormData();
      form.append("description", aiDescription.trim());
      if (mealPhoto) form.append("image", mealPhoto);
      const response = await fetch("/api/estimate-calories", { method: "POST", body: form });
      const result = await readJson<{ estimate?: MealEstimate; error?: string }>(response);
      if (!response.ok || !result.estimate) throw new Error(result.error || "No se pudo estimar la comida.");
      setEstimate(result.estimate);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo estimar la comida.");
    } finally {
      setEstimating(false);
    }
  }
  async function saveEstimate() {
    if (!estimate) return;
    const ok = await save({ action: "add_meal", date: mealEntryDate, name: estimate.mealName, detail: estimate.detail, calories: estimate.estimatedCalories, protein: estimate.protein, carbs: estimate.carbs, fat: estimate.fat });
    if (ok) {
      setEstimate(null);
      setAiDescription("");
      setMealPhoto(null);
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      setPhotoPreview("");
    }
  }

  async function generateDietPlan() {
    if (dietForm.age < 18 || !dietForm.heightCm || !dietForm.currentWeightKg || !dietForm.targetWeightKg) {
      setError("Completá edad, altura, peso actual y peso objetivo.");
      return;
    }
    setDietGenerating(true);
    setGeneratedDietPlan(null);
    setError("");
    try {
      const response = await fetch("/api/diet-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dietForm) });
      const result = await readJson<{ plan?: DietPlanContent; error?: string }>(response);
      if (!response.ok || !result.plan) throw new Error(result.error || "No pudimos crear el plan.");
      setGeneratedDietPlan(result.plan);
      setDietForm((current) => ({ ...current, details: "" }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos crear el plan.");
    } finally {
      setDietGenerating(false);
    }
  }

  async function saveDietPlan() {
    if (!generatedDietPlan) return;
    const ok = await save({ action: "save_diet_plan", ...dietForm, targetCalories: generatedDietPlan.targetCalories, plan: generatedDietPlan });
    if (ok) setGeneratedDietPlan(null);
  }

  async function saveDietTarget(targetCalories: number) {
    await save({ action: "set_diet_target", age: dietForm.age, sex: dietForm.sex, heightCm: dietForm.heightCm, currentWeightKg: dietForm.currentWeightKg, targetWeightKg: dietForm.targetWeightKg, activityLevel: dietForm.activityLevel, goalPace: dietForm.goalPace, targetCalories });
  }

  function addDietDetail(detail: string) {
    setDietForm((current) => ({ ...current, details: current.details.includes(detail) ? current.details : [current.details, detail].filter(Boolean).join(current.details ? ". " : "") }));
  }

  async function transcribeDietAudio(blob: Blob, mimeType: string) {
    setDietVoiceLoading(true);
    try {
      const extension = mimeType.includes("mp4") ? "m4a" : mimeType.includes("ogg") ? "ogg" : "webm";
      const form = new FormData();
      form.append("audio", new File([blob], "preferencias." + extension, { type: mimeType || "audio/webm" }));
      const response = await fetch("/api/diet-intake", { method: "POST", body: form });
      const result = await readJson<{ transcript?: string; error?: string }>(response);
      if (!response.ok || !result.transcript) throw new Error(result.error || "No pudimos interpretar el audio.");
      setDietForm((current) => ({ ...current, details: [current.details, result.transcript].filter(Boolean).join(current.details ? ". " : "") }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos interpretar el audio.");
    } finally {
      setDietVoiceLoading(false);
    }
  }

  async function startDietRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return setError("Este navegador no permite grabar audio.");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      dietStreamRef.current = stream;
      dietChunksRef.current = [];
      dietRecordingBytesRef.current = 0;
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) => { try { return MediaRecorder.isTypeSupported(type); } catch { return false; } }) || "";
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 32000 });
      } catch {
        recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      }
      dietRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (!event.data.size) return;
        dietChunksRef.current.push(event.data);
        dietRecordingBytesRef.current += event.data.size;
        if (dietRecordingBytesRef.current >= VOICE_AUTO_STOP_BYTES && recorder.state === "recording") recorder.stop();
      };
      recorder.onstop = () => {
        setDietRecording(false);
        dietStreamRef.current?.getTracks().forEach((track) => track.stop());
        if (dietStopTimerRef.current) window.clearTimeout(dietStopTimerRef.current);
        const blob = new Blob(dietChunksRef.current, { type: recorder.mimeType || mimeType || "audio/webm" });
        if (blob.size > MAX_VOICE_UPLOAD_BYTES) setError("La grabación quedó demasiado pesada. Probá hablando durante menos tiempo.");
        else if (blob.size) void transcribeDietAudio(blob, blob.type);
      };
      recorder.start(1000);
      setDietRecording(true);
      dietStopTimerRef.current = window.setTimeout(() => { if (recorder.state === "recording") recorder.stop(); }, 60000);
    } catch {
      setError("No pudimos acceder al micrófono. Revisá el permiso del navegador.");
    }
  }

  function stopDietRecording() {
    if (dietRecorderRef.current?.state === "recording") dietRecorderRef.current.stop();
  }

  const isPro = data.profile.isPro;
  /** Manda al comparador de planes desde cualquier candado. */
  const openPro = () => openSection("pro");



  /** Abre la sección —y la sub-pestaña— donde vive un área. */
  function openArea(area: string) {
    const target = insightTargets[area] ?? { section: "summary" as Section };
    if (target.physicalTab) setPhysicalTab(target.physicalTab);
    if (target.focusTab) setFocusTab(target.focusTab);
    openSection(target.section);
  }

  /** Ejecuta la acción sugerida por un aviso del plan del día. */
  async function applyInsightAction(action: InsightAction) {
    if (action.kind === "open") return openArea(action.section);
    await save({ action: "schedule_task", id: action.taskId, startTime: action.startTime, durationMinutes: action.durationMinutes, dueDate: action.date ?? today });
  }

  /**
   * Tilda una tarea sin esperar al servidor. Mientras la petición viaja, la fila
   * ya muestra el estado nuevo; si falla, `loadData` la devuelve a su lugar.
   */
  async function toggleTask(id: number, completed: boolean) {
    setPendingTasks((current) => ({ ...current, [id]: completed }));
    const ok = await save({ action: "toggle_task", id, completed });
    setPendingTasks((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    return ok;
  }

  /** Estado visible de una tarea: el optimista si lo hay, si no el guardado. */
  const taskDone = (id: number, savedDone: boolean) => pendingTasks[id] ?? savedDone;

  async function toggleEvent(id: number, completed: boolean) {
    setPendingEvents((current) => ({ ...current, [id]: completed }));
    const ok = await save({ action: "toggle_event", id, completed });
    setPendingEvents((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    return ok;
  }

  const eventDone = (id: number, savedDone: boolean) => pendingEvents[id] ?? savedDone;

  return {
    today,
    setToday,
    monthKey,
    week,
    data,
    setData,
    section,
    setSection,
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
    autoSummaryRef,
    urlIntentRef,
    announcementOpen,
    setAnnouncementOpen,
    announcementSaving,
    setAnnouncementSaving,
    announcementError,
    setAnnouncementError,
    announcementAcknowledgedRef,
    engagement,
    setEngagement,
    streakActionBusy,
    setStreakActionBusy,
    streakActionError,
    setStreakActionError,
    engagementVisitRef,
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
    setAvatarUploading,
    loading,
    setLoading,
    refreshVersion,
    setRefreshVersion,
    saving,
    setSaving,
    pullDistance,
    setPullDistance,
    pullRefreshing,
    setPullRefreshing,
    pullStartYRef,
    pullStartXRef,
    pullDistanceRef,
    pullTrackingRef,
    pullRefreshingRef,
    saveFeedback,
    setSaveFeedback,
    saveFeedbackTimerRef,
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
    usernameValue,
    usernameFormatValid,
    usernameCheck,
    setUsernameCheck,
    usernameStatus,
    priorityDraft,
    setPriorityDraft,
    trainingWeeklyTarget,
    setTrainingWeeklyTarget,
    physicalTab,
    setPhysicalTab,
    focusTab,
    setFocusTab,
    voiceOpen,
    setVoiceOpen,
    friendsNotice,
    setFriendsNotice,
    social,
    setSocial,
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
    autoGoalRef,
    publishedShareRef,
    pendingInviteRef,
    pendingTasks,
    setPendingTasks,
    pendingEvents,
    setPendingEvents,
    agendaView,
    setAgendaView,
    nowMinutes,
    setNowMinutes,
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
    setEstimating,
    estimate,
    setEstimate,
    initialDietForm,
    dietForm,
    setDietForm,
    dietNumberDrafts,
    setDietNumberDrafts,
    dietNumberFocusRef,
    dietQuickCalories,
    setDietQuickCalories,
    dietQuickCaloriesDraft,
    setDietQuickCaloriesDraft,
    dietQuickCaloriesFocusRef,
    setDietQuickField,
    beginDietNumberInput,
    updateDietNumberInput,
    finishDietNumberInput,
    beginDietQuickCaloriesInput,
    updateDietQuickCaloriesInput,
    finishDietQuickCaloriesInput,
    dietGenerating,
    setDietGenerating,
    generatedDietPlan,
    setGeneratedDietPlan,
    dietRecording,
    setDietRecording,
    dietVoiceLoading,
    setDietVoiceLoading,
    dietRecorderRef,
    dietStreamRef,
    dietChunksRef,
    dietRecordingBytesRef,
    dietStopTimerRef,
    loadSeqRef,
    silentFailuresRef,
    loadData,
    silentReload,
    scheduleRefresh,
    runStreakAction,
    acknowledgeAnnouncement,
    beginSaveFeedback,
    finishSaveFeedback,
    savePhase,
    saveLabel,
    save,
    loadSocial,
    refreshAll,
    scheduleSocialRefresh,
    sendSocial,
    uniqueFocusSessions,
    completedPlanTasks,
    completedPlanEvents,
    effectiveTrainingLogs,
    effectiveFocusByProjectDate,
    effectiveFocusMinutesFor,
    completedEventFocusByDate,
    completedTrainingTasksByDate,
    completedTrainingEventsByDate,
    trainingByDate,
    trainingScoreByDate,
    focusByDate,
    readingByDate,
    caloriesByDay,
    mealCountByDate,
    sleepMinutesByDate,
    sleepQualityByDate,
    completionDates,
    nutritionTargetCalories,
    dayRecordFor,
    trainedToday,
    calories,
    pagesToday,
    sleepToday,
    focusToday,
    scoreWeights,
    factors,
    score,
    scoreForDate,
    scoreActivityDates,
    scoreBadgeCounts,
    badgeStats,
    earnedBadgeIds,
    earnedBadgeSignature,
    entryDayLabel,
    historicalScore,
    priorityPairs,
    highestPriority,
    topPriorities,
    priorityNames,
    balanced,
    priorityCaption,
    displayName,
    activeGoals,
    savedDietPlan,
    displayedDietPlan,
    dietTargetCalories,
    projectNames,
    projectKinds,
    disciplineNames,
    scheduledEvents,
    scheduleInput,
    todayBlocks,
    todayUnscheduled,
    lastCheckin,
    todayWindow,
    todaySlots,
    readingDates,
    focusDates,
    goodSleepDates,
    loggingDates,
    streaks,
    autoSeries,
    autoGoalValue,
    sleepByDate,
    recentSleepNights,
    earlierSleepNights,
    activeCategories,
    comingDays,
    insights,
    patternInsights,
    planNotices,
    closeNotices,
    seenIds,
    latestSummaryWeek,
    summaryWeeks,
    inboxItems,
    unreadCount,
    markSummariesSeen,
    showSummary,
    weeklySummary,
    quote,
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
    transcribeDietAudio,
    startDietRecording,
    stopDietRecording,
    isPro,
    openPro,
    openArea,
    applyInsightAction,
    toggleTask,
    taskDone,
    toggleEvent,
    eventDone,
  };
}
