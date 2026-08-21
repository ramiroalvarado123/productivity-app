"use client";

import { CSSProperties, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type User = { displayName: string; email: string };
type Meal = { id: number; name: string; detail: string; calories: number; protein: number; carbs: number; fat: number; mealDate: string };
type BookStatus = "reading" | "read" | "wishlist";
type Book = { id: number; title: string; author: string; status: BookStatus; totalPages: number; currentPage: number };
type ReadingLog = { id: number; bookId: number; logDate: string; pages: number; minutes: number };
type Note = { id: number; bookId: number; content: string; createdAt: string };
type GoalPeriod = "weekly" | "monthly" | "annual" | "custom";
type GoalCategory = "general" | "gym" | "training" | "nutrition" | "reading" | "study" | "work" | "sleep";
type Goal = { id: number; title: string; period: GoalPeriod; category: GoalCategory; targetDate: string; completedAt: string | null; createdAt: string };
type Priorities = { monthKey: string; gymWeight: number; nutritionWeight: number; readingWeight: number };
type DailyCheckin = { id: number; entryDate: string; habitsJson: string; workoutDetail: string; studyMinutes: number; studyDetail: string; sleepMinutes: number; bedtime: string; wakeTime: string; waterMl: number; journal: string; transcript: string; voiceSummary: string };
type Discipline = { id: number; name: string; kind: "strength" | "running" | "cycling" | "swimming" | "sport" | "other" };
type TrainingLog = { id: number; disciplineId: number; trainingDate: string; durationMinutes: number; distanceMeters: number; notes: string };
type ExerciseLog = { id: number; trainingLogId: number; exercise: string; weightDeciKg: number; sets: number; reps: number; isRecord: boolean };
type FocusProject = { id: number; name: string; kind: "study" | "work" };
type FocusSession = { id: number; projectId: number; sessionDate: string; minutes: number; note: string };
type Task = { id: number; projectId: number | null; title: string; dueDate: string | null; completedAt: string | null };
type CalendarEvent = { id: number; title: string; eventDate: string; eventTime: string; category: "personal" | "study" | "work" | "training" | "health" | "other"; notes: string };
type VoiceCheckin = { transcript: string; summary: string; gym: { attended: boolean | null; detail: string }; meals: Array<{ name: string; detail: string; calories: number; protein: number; carbs: number; fat: number }>; reading: { bookTitle: string; pages: number; minutes: number; note: string }; habits: string[]; study: { minutes: number; detail: string; tasks: string[] }; sleep: { minutes: number; bedtime: string; wakeTime: string }; waterMl: number; journal: string; goals: Array<{ title: string; period: GoalPeriod; category: GoalCategory; targetDate: string }>; confidence: "low" | "medium" | "high" };
type MealEstimate = { mealName: string; detail: string; estimatedCalories: number; minimumCalories: number; maximumCalories: number; protein: number; carbs: number; fat: number; confidence: "low" | "medium" | "high"; items: Array<{ name: string; portion: string; calories: number }>; caveat: string };
type ProgressData = {
  profile: User; gymDates: string[]; disciplines: Discipline[]; trainingLogs: TrainingLog[]; exerciseLogs: ExerciseLog[];
  meals: Meal[]; mealHistory: Meal[]; books: Book[]; readingLogs: ReadingLog[]; readingHistory: ReadingLog[]; notes: Note[];
  goals: Goal[]; priorities: Priorities; dailyCheckin: DailyCheckin | null; dailyCheckins: DailyCheckin[];
  focusProjects: FocusProject[]; focusSessions: FocusSession[]; tasks: Task[]; events: CalendarEvent[];
};
type Section = "summary" | "score" | "training" | "meals" | "sleep" | "focus" | "calendar" | "stats" | "books" | "goals";
type StatsPeriod = "weekly" | "monthly" | "annual";

const navItems: Array<{ id: Section; icon: string; label: string; mobile: string }> = [
  { id: "summary", icon: "⌂", label: "Inicio", mobile: "Inicio" },
  { id: "score", icon: "◉", label: "Daily score", mobile: "Score" },
  { id: "training", icon: "↗", label: "Entrenamiento", mobile: "Entreno" },
  { id: "meals", icon: "◇", label: "Comidas", mobile: "Comidas" },
  { id: "sleep", icon: "☾", label: "Sueño", mobile: "Sueño" },
  { id: "focus", icon: "⌁", label: "Estudio / Trabajo", mobile: "Foco" },
  { id: "calendar", icon: "□", label: "Calendario", mobile: "Agenda" },
  { id: "stats", icon: "▥", label: "Estadísticas", mobile: "Datos" },
  { id: "books", icon: "▱", label: "Biblioteca", mobile: "Libros" },
  { id: "goals", icon: "◎", label: "Objetivos", mobile: "Metas" },
];
const priorityLabels = ["", "Secundario", "Importante", "Prioridad"];
const categoryLabels: Record<GoalCategory, string> = { general: "Personal", gym: "Gimnasio", training: "Entrenamiento", nutrition: "Alimentación", reading: "Lectura", study: "Estudio", work: "Trabajo", sleep: "Sueño" };
const periodLabels: Record<GoalPeriod, string> = { weekly: "Esta semana", monthly: "Este mes", annual: "Este año", custom: "Plazo personal" };
const kindLabels: Record<Discipline["kind"], string> = { strength: "Fuerza / gimnasio", running: "Running", cycling: "Ciclismo", swimming: "Natación", sport: "Deporte", other: "Otra" };

function argentinaDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function weekFor(date: string) {
  const center = new Date(date + "T12:00:00");
  const mondayOffset = (center.getDay() + 6) % 7;
  const monday = new Date(center);
  monday.setDate(center.getDate() - mondayOffset);
  return Array.from({ length: 7 }, (_, index) => {
    const current = new Date(monday);
    current.setDate(monday.getDate() + index);
    return { iso: current.toISOString().slice(0, 10), short: ["L", "M", "M", "J", "V", "S", "D"][index], number: current.getDate() };
  });
}
function goalDeadline(today: string, period: GoalPeriod, amount: number, unit: "months" | "years") {
  const date = new Date(today + "T12:00:00");
  if (period === "weekly") date.setDate(date.getDate() + ((7 - date.getDay()) % 7));
  if (period === "monthly") date.setMonth(date.getMonth() + 1, 0);
  if (period === "annual") date.setMonth(11, 31);
  if (period === "custom") {
    if (unit === "months") date.setMonth(date.getMonth() + amount);
    else date.setFullYear(date.getFullYear() + amount);
  }
  return date.toISOString().slice(0, 10);
}
function formatDate(date: string) {
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date + "T12:00:00"));
}
function dayDistance(from: string, to: string) {
  return Math.ceil((new Date(to + "T12:00:00").getTime() - new Date(from + "T12:00:00").getTime()) / 86400000);
}
function dateMinus(date: string, days: number) {
  const value = new Date(date + "T12:00:00");
  value.setDate(value.getDate() - days);
  return value.toISOString().slice(0, 10);
}
async function preparePhoto(file: File) {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", .82));
    return blob ? new File([blob], "comida.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

const emptyData = (user: User, monthKey: string): ProgressData => ({
  profile: user, gymDates: [], disciplines: [], trainingLogs: [], exerciseLogs: [], meals: [], mealHistory: [], books: [],
  readingLogs: [], readingHistory: [], notes: [], goals: [], priorities: { monthKey, gymWeight: 2, nutritionWeight: 2, readingWeight: 2 },
  dailyCheckin: null, dailyCheckins: [], focusProjects: [], focusSessions: [], tasks: [], events: [],
});

export default function ProgressClient({ initialUser }: { initialUser: User }) {
  const [today] = useState(argentinaDate);
  const monthKey = today.slice(0, 7);
  const week = useMemo(() => weekFor(today), [today]);
  const [data, setData] = useState<ProgressData>(() => emptyData(initialUser, monthKey));
  const [section, setSection] = useState<Section>("summary");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [priorityDraft, setPriorityDraft] = useState<Priorities>({ monthKey, gymWeight: 2, nutritionWeight: 2, readingWeight: 2 });
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<number | null>(null);
  const [trainingDate, setTrainingDate] = useState(today);
  const [statsPeriod, setStatsPeriod] = useState<StatsPeriod>("weekly");
  const [calendarCursor, setCalendarCursor] = useState(today.slice(0, 7));
  const [bookTab, setBookTab] = useState<BookStatus>("reading");
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [pagesInput, setPagesInput] = useState(0);
  const [note, setNote] = useState("");
  const [bookForm, setBookForm] = useState(false);
  const [mealForm, setMealForm] = useState(false);
  const [aiDescription, setAiDescription] = useState("");
  const [mealPhoto, setMealPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState<MealEstimate | null>(null);
  const [goalPeriod, setGoalPeriod] = useState<GoalPeriod>("weekly");
  const [customLength, setCustomLength] = useState(4);
  const [customUnit, setCustomUnit] = useState<"months" | "years">("months");
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceResult, setVoiceResult] = useState<VoiceCheckin | null>(null);
  const [voiceSaved, setVoiceSaved] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const loadData = useCallback(async () => {
    try {
      const response = await fetch("/api/progress?date=" + today + "&weekStart=" + week[0].iso + "&weekEnd=" + week[6].iso + "&month=" + monthKey, { cache: "no-store" });
      if (!response.ok) throw new Error("No pudimos cargar tus datos.");
      const next = await response.json() as ProgressData;
      setData(next);
      setPriorityDraft(next.priorities);
      setSelectedDisciplineId((current) => current ?? next.disciplines[0]?.id ?? null);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ocurrió un error.");
    } finally {
      setLoading(false);
    }
  }, [today, week, monthKey]);
  // Initial synchronization with the signed-in user's persisted workspace.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadData(); }, [loadData]);
  // Keep the page counter aligned when the visible book changes.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setRecordingSeconds((seconds) => {
      if (seconds >= 59) {
        if (recorderRef.current?.state === "recording") recorderRef.current.stop();
        return 60;
      }
      return seconds + 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [recording]);

  async function save(payload: Record<string, unknown>) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "No se pudo guardar.");
      await loadData();
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo guardar.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  const trainingToday = data.trainingLogs.filter((log) => log.trainingDate === today);
  const trainedToday = trainingToday.length > 0;
  const calories = data.meals.reduce((sum, meal) => sum + meal.calories, 0);
  const pagesToday = data.readingLogs.reduce((sum, log) => sum + log.pages, 0);
  const sleepToday = data.dailyCheckins.find((item) => item.entryDate === today)?.sleepMinutes ?? 0;
  const focusToday = data.focusSessions.filter((item) => item.sessionDate === today).reduce((sum, item) => sum + item.minutes, 0);
  const factors = { training: trainedToday ? 100 : 0, nutrition: Math.min(100, Math.round(data.meals.length / 3 * 100)), reading: Math.min(100, pagesToday * 10) };
  const totalWeight = priorityDraft.gymWeight + priorityDraft.nutritionWeight + priorityDraft.readingWeight;
  const score = Math.round((factors.training * priorityDraft.gymWeight + factors.nutrition * priorityDraft.nutritionWeight + factors.reading * priorityDraft.readingWeight) / totalWeight);
  const priorityPairs: Array<[string, number]> = [["Entrenamiento", priorityDraft.gymWeight], ["Alimentación", priorityDraft.nutritionWeight], ["Lectura", priorityDraft.readingWeight]];
  const highestPriority = Math.max(...priorityPairs.map((item) => item[1]));
  const topPriorities = priorityPairs.filter((item) => item[1] === highestPriority);
  const mainPriority = topPriorities.length === 1 ? topPriorities[0][0] : "Equilibrio";
  const displayName = data.profile.displayName.split(" ")[0] || "Usuario";
  const activeGoals = data.goals.filter((goal) => !goal.completedAt);
  const selectedDiscipline = data.disciplines.find((item) => item.id === selectedDisciplineId) ?? data.disciplines[0] ?? null;
  const selectedTrainingLog = selectedDiscipline ? data.trainingLogs.find((item) => item.disciplineId === selectedDiscipline.id && item.trainingDate === trainingDate) : undefined;
  const selectedExercises = selectedTrainingLog ? data.exerciseLogs.filter((item) => item.trainingLogId === selectedTrainingLog.id) : [];
  const booksInTab = data.books.filter((book) => book.status === bookTab);
  const selectedBook = booksInTab.find((book) => book.id === selectedBookId) ?? booksInTab[0] ?? null;
  const selectedReadingLog = selectedBook ? data.readingLogs.find((log) => log.bookId === selectedBook.id) : undefined;
  useEffect(() => {
    if (selectedBook) {
      setSelectedBookId(selectedBook.id);
      setPagesInput(selectedReadingLog?.pages ?? 0);
    } else {
      setSelectedBookId(null);
      setPagesInput(0);
    }
  }, [selectedBook, selectedReadingLog?.pages]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function openSection(next: Section) {
    setSection(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function submitForm(event: FormEvent<HTMLFormElement>, payload: Record<string, unknown>) {
    event.preventDefault();
    const ok = await save(payload);
    if (ok) event.currentTarget.reset();
  }

  async function analyzeVoiceBlob(blob: Blob, mimeType: string) {
    setVoiceLoading(true);
    setVoiceResult(null);
    setVoiceSaved(false);
    try {
      const form = new FormData();
      const extension = mimeType.includes("mp4") ? "m4a" : mimeType.includes("ogg") ? "ogg" : "webm";
      form.append("audio", new File([blob], "cierre-del-dia." + extension, { type: mimeType || "audio/webm" }));
      form.append("date", today);
      const response = await fetch("/api/voice-checkin", { method: "POST", body: form });
      const result = await response.json() as { checkin?: VoiceCheckin; error?: string };
      if (!response.ok || !result.checkin) throw new Error(result.error || "No pudimos interpretar la grabación.");
      setVoiceResult(result.checkin);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos interpretar la grabación.");
    } finally {
      setVoiceLoading(false);
    }
  }
  async function startVoiceRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Este navegador no permite grabar audio.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"].find((type) => MediaRecorder.isTypeSupported(type)) || "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        setRecording(false);
        streamRef.current?.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || "audio/webm" });
        if (blob.size) void analyzeVoiceBlob(blob, blob.type);
      };
      recorder.start();
      setRecordingSeconds(0);
      setRecording(true);
      setVoiceResult(null);
      setVoiceSaved(false);
    } catch {
      setError("No pudimos acceder al micrófono. Revisá el permiso del navegador.");
    }
  }
  function stopVoiceRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }
  async function applyVoiceCheckin() {
    if (!voiceResult) return;
    const ok = await save({ action: "apply_voice_checkin", date: today, checkin: voiceResult });
    if (ok) {
      setVoiceResult(null);
      setVoiceSaved(true);
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
      const result = await response.json() as { estimate?: MealEstimate; error?: string };
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
    const ok = await save({ action: "add_meal", date: today, name: estimate.mealName, detail: estimate.detail, calories: estimate.estimatedCalories, protein: estimate.protein, carbs: estimate.carbs, fat: estimate.fat });
    if (ok) {
      setEstimate(null);
      setAiDescription("");
      setMealPhoto(null);
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      setPhotoPreview("");
    }
  }

  const scoreCard = <article className="score-card">
    <div><p>DAILY SCORE</p><h2>{score >= 75 ? <>Tu día va<br /><em>muy bien.</em></> : <>Cada acción<br /><em>suma.</em></>}</h2><span>{mainPriority === "Equilibrio" ? "Tus áreas principales tienen el mismo peso." : mainPriority + " tiene un peso especial este mes."}</span></div>
    <div className="score-ring" style={{ "--score": String(score * 3.6) + "deg" } as CSSProperties}><div><b>{score}</b><small>/100</small></div></div>
  </article>;

  const voiceRecorder = <article className="panel voice-capture-panel">
    <div className="voice-copy"><p className="voice-eyebrow">CIERRE RÁPIDO CON IA</p><h2>Contá tu día en un minuto.</h2><span>Decí qué entrenaste, qué comiste, cuánto trabajaste o estudiaste, cuánto leíste y dormiste. Revisás el resultado antes de guardarlo.</span><div className="voice-hints"><small>“Corrí 5 km…”</small><small>“Hice sentadilla…”</small><small>“Trabajé 2 horas…”</small><small>“Dormí 7 horas…”</small></div></div>
    <div className="voice-action">
      {!recording && !voiceLoading && <button className="record-button" onClick={() => void startVoiceRecording()}><span>●</span><b>{voiceResult ? "Grabar de nuevo" : "Empezar cierre del día"}</b><small>Máximo 60 segundos</small></button>}
      {recording && <button className="record-button recording" onClick={stopVoiceRecording}><span>■</span><b>Grabando… {String(Math.floor(recordingSeconds / 60)).padStart(2, "0")}:{String(recordingSeconds % 60).padStart(2, "0")}</b><small>Tocá para terminar</small></button>}
      {voiceLoading && <div className="voice-processing"><div className="voice-spinner" /><b>Organizando tu día…</b><small>La grabación no se conserva.</small></div>}
      {voiceSaved && <div className="voice-saved"><span>✓</span><div><b>Cierre guardado</b><small>Los datos ya aparecen en sus secciones.</small></div></div>}
    </div>
    {voiceResult && <div className="voice-review"><div className="voice-review-head"><div><p>REVISÁ ANTES DE GUARDAR</p><h3>{voiceResult.summary || "Esto fue lo que entendimos"}</h3></div><span className={"confidence " + voiceResult.confidence}>Confianza {voiceResult.confidence === "high" ? "alta" : voiceResult.confidence === "medium" ? "media" : "baja"}</span></div><div className="voice-review-grid">
      <div><span>↗</span><p><b>Entrenamiento</b><small>{voiceResult.gym.attended ? "Entrenamiento registrado" : "Sin asistencia"} {voiceResult.gym.detail}</small></p></div>
      <div><span>◇</span><p><b>Comidas</b><small>{voiceResult.meals.length ? voiceResult.meals.map((meal) => meal.name + " ≈" + meal.calories + " kcal").join(" · ") : "Sin comidas"}</small></p></div>
      <div><span>⌁</span><p><b>Estudio / trabajo</b><small>{voiceResult.study.minutes ? voiceResult.study.minutes + " min · " : ""}{voiceResult.study.detail || "Sin dato"}</small></p></div>
      <div><span>☾</span><p><b>Sueño</b><small>{voiceResult.sleep.minutes ? Math.round(voiceResult.sleep.minutes / 6) / 10 + " horas" : "Sin dato"}</small></p></div>
      <div><span>▱</span><p><b>Lectura</b><small>{voiceResult.reading.bookTitle || "Libro actual"} · {voiceResult.reading.pages} páginas</small></p></div>
      <div><span>✎</span><p><b>Reflexión</b><small>{voiceResult.journal || "Sin reflexión"}</small></p></div>
    </div><details><summary>Ver transcripción</summary><p>{voiceResult.transcript}</p></details><div className="voice-review-actions"><button className="discard-voice" onClick={() => setVoiceResult(null)}>Descartar</button><button className="confirm-voice" disabled={saving} onClick={() => void applyVoiceCheckin()}>Confirmar y guardar</button></div></div>}
  </article>;

  const trainingPanel = <section className="module-stack">
    <article className="panel section-panel">
      <div className="panel-heading"><div><p>TUS DISCIPLINAS</p><h2>Un calendario para cada actividad</h2></div><span className="week-pill">{data.trainingLogs.filter((log) => log.trainingDate >= week[0].iso).length} sesiones esta semana</span></div>
      <form className="compact-form" onSubmit={(event) => { const form = new FormData(event.currentTarget); void submitForm(event, { action: "add_discipline", name: form.get("name"), kind: form.get("kind") }); }}>
        <input name="name" required placeholder="Nueva disciplina: pádel, fútbol…" />
        <select name="kind" defaultValue="other"><option value="strength">Fuerza / gimnasio</option><option value="running">Running</option><option value="cycling">Ciclismo</option><option value="swimming">Natación</option><option value="sport">Deporte</option><option value="other">Otra</option></select>
        <button disabled={saving}>＋ Agregar</button>
      </form>
      <div className="discipline-list">{data.disciplines.map((discipline) => {
        const dates = data.trainingLogs.filter((log) => log.disciplineId === discipline.id && log.trainingDate >= week[0].iso && log.trainingDate <= week[6].iso).map((log) => log.trainingDate);
        return <div className={"discipline-card " + (selectedDiscipline?.id === discipline.id ? "selected" : "")} key={discipline.id}>
          <button className="discipline-title" onClick={() => setSelectedDisciplineId(discipline.id)}><span>{discipline.kind === "strength" ? "🏋" : discipline.kind === "running" ? "🏃" : discipline.kind === "cycling" ? "🚴" : discipline.kind === "swimming" ? "🏊" : "●"}</span><p><b>{discipline.name}</b><small>{kindLabels[discipline.kind]}</small></p><strong>{dates.length}/7</strong></button>
          <div className="week-row">{week.map((day) => {
            const done = dates.includes(day.iso);
            return <button key={day.iso} className={(done ? "done " : "") + (day.iso === today ? "today" : "")} disabled={saving} onClick={() => void save({ action: "toggle_training", disciplineId: discipline.id, date: day.iso })}><small>{day.short}</small><b>{done ? "✓" : day.number}</b>{day.iso === today && <i />}</button>;
          })}</div>
        </div>;
      })}</div>
    </article>
    {selectedDiscipline && <div className="training-detail-grid">
      <article className="panel">
        <div className="panel-heading"><div><p>DETALLE DE SESIÓN</p><h2>{selectedDiscipline.name}</h2></div><input className="date-control" type="date" value={trainingDate} onChange={(event) => setTrainingDate(event.target.value)} /></div>
        <form className="data-form" onSubmit={(event) => { const form = new FormData(event.currentTarget); void submitForm(event, { action: "save_training", disciplineId: selectedDiscipline.id, date: trainingDate, durationMinutes: form.get("durationMinutes"), distanceKm: form.get("distanceKm"), notes: form.get("notes") }); }}>
          <div className="two-fields"><label>Duración (min)<input name="durationMinutes" type="number" min="0" defaultValue={selectedTrainingLog?.durationMinutes || ""} /></label><label>Distancia (km)<input name="distanceKm" type="number" min="0" step=".01" defaultValue={selectedTrainingLog?.distanceMeters ? selectedTrainingLog.distanceMeters / 1000 : ""} /></label></div>
          <label>Notas<textarea name="notes" defaultValue={selectedTrainingLog?.notes || ""} placeholder="Ritmo, sensaciones, rutina…" /></label>
          <button className="primary-action" disabled={saving}>Guardar sesión</button>
        </form>
      </article>
      <article className="panel">
        <div className="panel-heading"><div><p>PESOS Y REPETICIONES</p><h2>Ejercicios</h2></div><span className="week-pill">{selectedExercises.length} cargados</span></div>
        <form className="exercise-form" onSubmit={(event) => { const form = new FormData(event.currentTarget); void submitForm(event, { action: "add_exercise", disciplineId: selectedDiscipline.id, date: trainingDate, exercise: form.get("exercise"), weightKg: form.get("weightKg"), sets: form.get("sets"), reps: form.get("reps"), isRecord: form.get("isRecord") === "on" }); }}>
          <input name="exercise" required placeholder="Ejercicio (ej. sentadilla)" />
          <div className="three-fields"><label>Kg<input name="weightKg" type="number" min="0" step=".1" /></label><label>Series<input name="sets" type="number" min="0" /></label><label>Reps<input name="reps" type="number" min="0" /></label></div>
          <label className="check-label"><input name="isRecord" type="checkbox" /> Es un récord personal</label>
          <button className="primary-action" disabled={saving}>Agregar ejercicio</button>
        </form>
        <div className="record-list">{selectedExercises.map((item) => <div key={item.id}><span>{item.isRecord ? "🏆" : "↗"}</span><p><b>{item.exercise}</b><small>{item.weightDeciKg / 10} kg · {item.sets} × {item.reps}</small></p><button onClick={() => void save({ action: "delete_exercise", id: item.id })}>×</button></div>)}</div>
      </article>
    </div>}
  </section>;

  const sleepPanel = <section className="module-stack">
    <div className="split-grid">
      <article className="panel"><div className="panel-heading"><div><p>DESCANSO DE HOY</p><h2>Registrar sueño</h2></div><span className="sleep-icon">☾</span></div>
        <form className="data-form" onSubmit={(event) => { const form = new FormData(event.currentTarget); void submitForm(event, { action: "save_sleep", date: today, sleepMinutes: Math.round(Number(form.get("hours")) * 60), bedtime: form.get("bedtime"), wakeTime: form.get("wakeTime") }); }}>
          <label>Horas dormidas<input name="hours" type="number" min="0" max="24" step=".25" defaultValue={sleepToday ? sleepToday / 60 : ""} required /></label>
          <div className="two-fields"><label>Me acosté<input name="bedtime" type="time" defaultValue={data.dailyCheckin?.bedtime || ""} /></label><label>Me desperté<input name="wakeTime" type="time" defaultValue={data.dailyCheckin?.wakeTime || ""} /></label></div>
          <button className="primary-action" disabled={saving}>Guardar descanso</button>
        </form>
      </article>
      <article className="panel sleep-summary"><div className="panel-heading"><div><p>ÚLTIMOS 7 DÍAS</p><h2>Regularidad</h2></div></div>
        <div className="sleep-bars">{week.map((day) => { const minutes = data.dailyCheckins.find((item) => item.entryDate === day.iso)?.sleepMinutes ?? 0; return <div key={day.iso}><span><i style={{ height: String(Math.min(100, minutes / 600 * 100)) + "%" }} /></span><b>{minutes ? Math.round(minutes / 6) / 10 : "—"}</b><small>{day.short}</small></div>; })}</div>
        <p className="soft-note">Objetivo visual de referencia: 8 horas. Cada persona puede necesitar un rango diferente.</p>
      </article>
    </div>
  </section>;

  const focusPanel = <section className="module-stack">
    <div className="split-grid">
      <article className="panel"><div className="panel-heading"><div><p>ÁREAS DE FOCO</p><h2>Materias y proyectos</h2></div></div>
        <form className="compact-form" onSubmit={(event) => { const form = new FormData(event.currentTarget); void submitForm(event, { action: "add_focus_project", name: form.get("name"), kind: form.get("kind") }); }}><input name="name" required placeholder="Ej. Física o Proyecto web" /><select name="kind"><option value="study">Estudio</option><option value="work">Trabajo</option></select><button>＋ Agregar</button></form>
        <div className="project-chips">{data.focusProjects.map((project) => <span key={project.id}>{project.kind === "study" ? "📘" : "💼"} {project.name}</span>)}</div>
        {data.focusProjects.length > 0 && <form className="data-form focus-session-form" onSubmit={(event) => { const form = new FormData(event.currentTarget); void submitForm(event, { action: "add_focus_session", projectId: form.get("projectId"), date: today, minutes: form.get("minutes"), note: form.get("note") }); }}>
          <label>Materia / proyecto<select name="projectId">{data.focusProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
          <label>Trabajo profundo (minutos)<input name="minutes" type="number" min="1" required /></label>
          <label>Qué avanzaste<input name="note" placeholder="Tema, entrega o avance…" /></label>
          <button className="primary-action">Guardar bloque de foco</button>
        </form>}
      </article>
      <article className="panel"><div className="panel-heading"><div><p>TAREAS</p><h2>Próximos pasos</h2></div><span className="week-pill">{data.tasks.filter((item) => item.completedAt).length}/{data.tasks.length} hechas</span></div>
        <form className="task-form" onSubmit={(event) => { const form = new FormData(event.currentTarget); void submitForm(event, { action: "add_task", title: form.get("title"), projectId: form.get("projectId"), dueDate: form.get("dueDate") }); }}><input name="title" required placeholder="Nueva tarea…" /><select name="projectId"><option value="">Sin proyecto</option>{data.focusProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><input name="dueDate" type="date" /><button>＋</button></form>
        <div className="task-list">{data.tasks.map((task) => <div className={task.completedAt ? "completed" : ""} key={task.id}><button className="task-check" onClick={() => void save({ action: "toggle_task", id: task.id, completed: !task.completedAt })}>{task.completedAt ? "✓" : ""}</button><p><b>{task.title}</b><small>{task.dueDate ? "Fecha: " + formatDate(task.dueDate) : "Sin fecha"}{task.projectId ? " · " + (data.focusProjects.find((item) => item.id === task.projectId)?.name || "") : ""}</small></p><button className="row-delete" onClick={() => void save({ action: "delete_task", id: task.id })}>×</button></div>)}</div>
      </article>
    </div>
    <article className="panel weekly-focus"><div><p>FOCO DE HOY</p><b>{Math.round(focusToday / 6) / 10} h</b><small>de trabajo profundo</small></div><div><p>ESTA SEMANA</p><b>{Math.round(data.focusSessions.filter((item) => item.sessionDate >= week[0].iso).reduce((sum, item) => sum + item.minutes, 0) / 6) / 10} h</b><small>registradas</small></div><button onClick={() => openSection("goals")}>Crear objetivo semanal →</button></article>
  </section>;

  const calendarStart = new Date(calendarCursor + "-01T12:00:00");
  const calendarMonthName = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(calendarStart);
  const calendarOffset = (calendarStart.getDay() + 6) % 7;
  const calendarDays = new Date(calendarStart.getFullYear(), calendarStart.getMonth() + 1, 0).getDate();
  const shiftCalendar = (amount: number) => {
    const next = new Date(calendarStart);
    next.setMonth(next.getMonth() + amount);
    setCalendarCursor(next.toISOString().slice(0, 7));
  };
  const calendarItems = [
    ...data.events.map((item) => ({ key: "e" + item.id, date: item.eventDate, title: item.title, type: item.category, id: item.id, source: "event" })),
    ...data.tasks.filter((item) => item.dueDate).map((item) => ({ key: "t" + item.id, date: item.dueDate as string, title: item.title, type: "task", id: item.id, source: "task" })),
    ...activeGoals.map((item) => ({ key: "g" + item.id, date: item.targetDate, title: item.title, type: "goal", id: item.id, source: "goal" })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = calendarItems.filter((item) => item.date >= today).slice(0, 8);
  const calendarPanel = <section className="module-stack">
    <div className="calendar-layout">
      <article className="panel calendar-panel"><div className="calendar-head"><button onClick={() => shiftCalendar(-1)}>‹</button><h2>{calendarMonthName}</h2><button onClick={() => shiftCalendar(1)}>›</button></div><div className="calendar-grid"><div className="calendar-weekdays">{["L", "M", "M", "J", "V", "S", "D"].map((item, index) => <b key={item + index}>{item}</b>)}</div><div className="calendar-cells">{Array.from({ length: calendarOffset }, (_, index) => <span className="blank" key={"blank" + index} />)}{Array.from({ length: calendarDays }, (_, index) => {
        const date = calendarCursor + "-" + String(index + 1).padStart(2, "0");
        const items = calendarItems.filter((item) => item.date === date);
        return <button className={date === today ? "today" : ""} key={date}><b>{index + 1}</b><div>{items.slice(0, 3).map((item) => <i className={item.type} key={item.key} title={item.title} />)}</div></button>;
      })}</div></div></article>
      <article className="panel"><div className="panel-heading"><div><p>NUEVO RECORDATORIO</p><h2>Evento importante</h2></div></div><form className="data-form" onSubmit={(event) => { const form = new FormData(event.currentTarget); void submitForm(event, { action: "add_event", title: form.get("title"), eventDate: form.get("eventDate"), eventTime: form.get("eventTime"), category: form.get("category"), notes: form.get("notes") }); }}>
        <label>Evento<input name="title" required placeholder="Examen, turno, carrera…" /></label><div className="two-fields"><label>Fecha<input name="eventDate" type="date" required /></label><label>Hora<input name="eventTime" type="time" /></label></div><label>Categoría<select name="category"><option value="personal">Personal</option><option value="study">Estudio</option><option value="work">Trabajo</option><option value="training">Entrenamiento</option><option value="health">Salud</option><option value="other">Otro</option></select></label><label>Notas<textarea name="notes" placeholder="Dirección, preparación, información útil…" /></label><button className="primary-action">Guardar evento</button>
      </form></article>
    </div>
    <article className="panel"><div className="panel-heading"><div><p>LO PRÓXIMO</p><h2>Recordatorios y cuenta regresiva</h2></div><span className="week-pill">{upcoming.length} próximos</span></div><div className="upcoming-list">{upcoming.length ? upcoming.map((item) => <div key={item.key}><span className={"event-dot " + item.type} /><p><b>{item.title}</b><small>{formatDate(item.date)} · {item.source === "goal" ? "Objetivo" : item.source === "task" ? "Tarea" : "Evento"}</small></p><strong>{dayDistance(today, item.date) === 0 ? "Hoy" : "Faltan " + dayDistance(today, item.date) + " días"}</strong>{item.source === "event" && <button onClick={() => void save({ action: "delete_event", id: item.id })}>×</button>}</div>) : <div className="inline-empty"><span>□</span><p><b>No hay fechas próximas</b><small>Agregá un evento, tarea u objetivo.</small></p></div>}</div></article>
  </section>;

  const periodDays = statsPeriod === "weekly" ? 7 : statsPeriod === "monthly" ? 30 : 365;
  const statsStart = dateMinus(today, periodDays - 1);
  const periodTraining = data.trainingLogs.filter((item) => item.trainingDate >= statsStart);
  const periodFocus = data.focusSessions.filter((item) => item.sessionDate >= statsStart);
  const periodSleep = data.dailyCheckins.filter((item) => item.entryDate >= statsStart && item.sleepMinutes > 0);
  const periodReading = data.readingHistory.filter((item) => item.logDate >= statsStart);
  const periodMeals = data.mealHistory.filter((item) => item.mealDate >= statsStart);
  const buckets = statsPeriod === "weekly"
    ? Array.from({ length: 7 }, (_, index) => ({ start: dateMinus(today, 6 - index), end: dateMinus(today, 6 - index), label: ["D-6", "D-5", "D-4", "D-3", "D-2", "Ayer", "Hoy"][index] }))
    : statsPeriod === "monthly"
      ? Array.from({ length: 4 }, (_, index) => ({ start: dateMinus(today, 27 - index * 7), end: dateMinus(today, 21 - index * 7), label: "Sem " + (index + 1) }))
      : Array.from({ length: 12 }, (_, index) => {
        const value = new Date(today + "T12:00:00");
        value.setMonth(value.getMonth() - (11 - index));
        const prefix = value.toISOString().slice(0, 7);
        return { start: prefix + "-01", end: prefix + "-31", label: new Intl.DateTimeFormat("es-AR", { month: "short" }).format(value) };
      });
  const trendValues = buckets.map((bucket) => ({
    label: bucket.label,
    training: periodTraining.filter((item) => item.trainingDate >= bucket.start && item.trainingDate <= bucket.end).length,
    focus: periodFocus.filter((item) => item.sessionDate >= bucket.start && item.sessionDate <= bucket.end).reduce((sum, item) => sum + item.minutes, 0) / 60,
  }));
  const maxTrend = Math.max(1, ...trendValues.flatMap((item) => [item.training, item.focus]));
  const statsPanel = <section className="module-stack">
    <div className="period-switch">{(["weekly", "monthly", "annual"] as StatsPeriod[]).map((period) => <button className={statsPeriod === period ? "active" : ""} key={period} onClick={() => setStatsPeriod(period)}>{period === "weekly" ? "Semanal" : period === "monthly" ? "Mensual" : "Anual"}</button>)}</div>
    <div className="metrics-grid">
      <article><span>↗</span><p>ENTRENAMIENTOS<b>{periodTraining.length}</b><small>{(periodTraining.reduce((sum, item) => sum + item.distanceMeters, 0) / 1000).toFixed(1)} km recorridos</small></p></article>
      <article><span>☾</span><p>SUEÑO PROMEDIO<b>{periodSleep.length ? (periodSleep.reduce((sum, item) => sum + item.sleepMinutes, 0) / periodSleep.length / 60).toFixed(1) : "0"} h</b><small>{periodSleep.length} noches registradas</small></p></article>
      <article><span>⌁</span><p>TRABAJO PROFUNDO<b>{(periodFocus.reduce((sum, item) => sum + item.minutes, 0) / 60).toFixed(1)} h</b><small>{periodFocus.length} bloques de foco</small></p></article>
      <article><span>▱</span><p>PÁGINAS LEÍDAS<b>{periodReading.reduce((sum, item) => sum + item.pages, 0)}</b><small>{periodReading.reduce((sum, item) => sum + item.minutes, 0)} min de lectura</small></p></article>
      <article><span>◇</span><p>CALORÍAS REGISTRADAS<b>{periodMeals.reduce((sum, item) => sum + item.calories, 0).toLocaleString("es-AR")}</b><small>estimación del período</small></p></article>
    </div>
    <article className="panel trend-panel"><div className="panel-heading"><div><p>TENDENCIA</p><h2>Constancia y foco</h2></div><div className="chart-legend"><span><i className="training" />Entrenamientos</span><span><i className="focus" />Horas de foco</span></div></div><div className="trend-chart">{trendValues.map((item) => <div key={item.label}><div className="bar-pair"><i className="training" style={{ height: String(item.training / maxTrend * 100) + "%" }} title={item.training + " entrenamientos"} /><i className="focus" style={{ height: String(item.focus / maxTrend * 100) + "%" }} title={item.focus.toFixed(1) + " h de foco"} /></div><small>{item.label}</small></div>)}</div></article>
  </section>;

  const mealsPanel = <article className="panel section-panel"><div className="panel-heading"><div><p>ENERGÍA DE HOY</p><h2>Comidas</h2></div><button className="add-button light" onClick={() => setMealForm(!mealForm)}>＋ Carga manual</button></div>
    <div className="ai-meal-box"><div className="ai-meal-title"><span>✦</span><div><b>Estimar con IA</b><small>Escribí qué comiste o mostralo con una foto.</small></div></div><textarea value={aiDescription} onChange={(event) => setAiDescription(event.target.value)} placeholder="Ej. milanesa con puré, porción mediana…" /><div className="ai-photo-row"><label className="photo-button">📷 {mealPhoto ? "Cambiar foto" : "Sacar o subir foto"}<input type="file" accept="image/*" capture="environment" onChange={(event) => void selectMealPhoto(event.target.files?.[0])} /></label>{photoPreview && <div className="photo-preview"><img src={photoPreview} alt="Comida a analizar" /><button onClick={() => { URL.revokeObjectURL(photoPreview); setPhotoPreview(""); setMealPhoto(null); }}>×</button></div>}<button className="analyze-button" disabled={estimating || (!mealPhoto && !aiDescription.trim())} onClick={() => void estimateMeal()}>{estimating ? "Analizando…" : "Analizar comida"}</button></div>
      {estimate && <div className="estimate-result"><div className="estimate-head"><div><span>ESTIMACIÓN PARA REVISAR</span><input value={estimate.mealName} onChange={(event) => setEstimate({ ...estimate, mealName: event.target.value })} /></div><label><input type="number" value={estimate.estimatedCalories} onChange={(event) => setEstimate({ ...estimate, estimatedCalories: Number(event.target.value) || 0 })} /><small>kcal</small></label></div><input className="estimate-detail" value={estimate.detail} onChange={(event) => setEstimate({ ...estimate, detail: event.target.value })} /><p>Rango probable: {estimate.minimumCalories}–{estimate.maximumCalories} kcal. {estimate.caveat}</p><button className="confirm-estimate" onClick={() => void saveEstimate()}>Confirmar y guardar</button></div>}
    </div>
    {mealForm && <form className="meal-form" onSubmit={(event) => { const form = new FormData(event.currentTarget); void submitForm(event, { action: "add_meal", date: today, name: form.get("name"), detail: form.get("detail"), calories: form.get("calories"), protein: form.get("protein"), carbs: form.get("carbs"), fat: form.get("fat") }); }}><input name="name" required placeholder="Comida" /><input name="detail" required placeholder="Detalle" /><input name="calories" type="number" min="0" placeholder="kcal" /><button>Guardar</button></form>}
    <div className="meal-list">{data.meals.map((meal) => <div className="meal-row" key={meal.id}><span>🍽️</span><div><b>{meal.name}</b><small>{meal.detail} · P {meal.protein} / C {meal.carbs} / G {meal.fat}</small></div><strong>≈ {meal.calories} kcal</strong><button className="row-delete" onClick={() => void save({ action: "delete_meal", id: meal.id })}>×</button></div>)}{!data.meals.length && <div className="inline-empty"><span>🥗</span><p><b>Todavía no cargaste comidas</b><small>Usá texto, foto o carga manual.</small></p></div>}</div><div className="calorie-total"><span>Total estimado</span><b>{calories.toLocaleString("es-AR")} kcal</b></div>
  </article>;

  const booksPanel = <section className="books-layout"><article className="panel section-panel"><div className="panel-heading"><div><p>TU BIBLIOTECA</p><h2>Libros</h2></div><button className="add-button light" onClick={() => setBookForm(!bookForm)}>＋ Nuevo libro</button></div>
    {bookForm && <form className="book-form" onSubmit={(event) => { const form = new FormData(event.currentTarget); const status = String(form.get("status")) as BookStatus; void submitForm(event, { action: "add_book", title: form.get("title"), author: form.get("author"), totalPages: form.get("totalPages"), status }); setBookTab(status); }}><input name="title" required placeholder="Título" /><input name="author" placeholder="Autor" /><input name="totalPages" type="number" min="0" placeholder="Páginas" /><select name="status"><option value="reading">Leyendo</option><option value="read">Leído</option><option value="wishlist">Quiero leer</option></select><button>Guardar</button></form>}
    <div className="book-tabs">{(["reading", "read", "wishlist"] as BookStatus[]).map((tab) => <button className={bookTab === tab ? "active" : ""} key={tab} onClick={() => setBookTab(tab)}>{tab === "reading" ? "Leyendo" : tab === "read" ? "Leídos" : "Quiero leer"} <i>{data.books.filter((book) => book.status === tab).length}</i></button>)}</div>
    {selectedBook ? <><select className="book-select" value={selectedBook.id} onChange={(event) => setSelectedBookId(Number(event.target.value))}>{booksInTab.map((book) => <option key={book.id} value={book.id}>{book.title}</option>)}</select><div className="current-book"><div className="book-cover"><small>{selectedBook.author || "MI LIBRO"}</small><b>{selectedBook.title}</b></div><div className="book-info"><span>{bookTab === "reading" ? "LEYENDO AHORA" : bookTab === "read" ? "TERMINADO" : "PRÓXIMA LECTURA"}</span><h3>{selectedBook.title}</h3><p>{selectedBook.author}</p><div className="progress-line"><i style={{ width: String(selectedBook.totalPages ? Math.min(100, selectedBook.currentPage / selectedBook.totalPages * 100) : 0) + "%" }} /></div><small>{selectedBook.currentPage} de {selectedBook.totalPages || "?"} páginas</small></div>{bookTab === "reading" && <div className="page-counter"><label>Páginas hoy</label><div><input type="number" min="0" value={pagesInput} onChange={(event) => setPagesInput(Number(event.target.value) || 0)} /><button className="save-pages" onClick={() => void save({ action: "set_pages", bookId: selectedBook.id, date: today, pages: pagesInput })}>Guardar</button></div></div>}</div></> : <div className="empty-shelf"><span>＋</span><b>No hay libros en esta lista</b><p>Agregá el primero.</p></div>}
  </article><article className="panel notes-panel section-panel"><div className="panel-heading"><div><p>IDEAS QUE QUEDAN</p><h2>Notas del libro</h2></div></div>{selectedBook ? <><form onSubmit={(event) => { event.preventDefault(); void save({ action: "add_note", bookId: selectedBook.id, content: note }).then((ok) => { if (ok) setNote(""); }); }}><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder={"Idea u observación de " + selectedBook.title + "…"} /><button>Guardar nota</button></form><div className="notes-list">{data.notes.filter((item) => item.bookId === selectedBook.id).map((item) => <div key={item.id}><span>“</span><p>{item.content}</p></div>)}</div></> : <div className="inline-empty"><span>✎</span><p><b>Elegí un libro</b><small>Sus notas aparecerán acá.</small></p></div>}</article></section>;

  const priorityEditor = <article className="panel priority-panel"><div className="panel-heading"><div><p>PRIORIDAD DEL MES</p><h2>¿Qué te importa más cumplir?</h2></div></div><p className="panel-intro">Estas prioridades definen el peso de cada área en el Daily Score.</p><div className="priority-list">{([
    ["gymWeight", "Entrenamiento", "↗", "Constancia en todas tus disciplinas"],
    ["nutritionWeight", "Alimentación", "◇", "Registrar comidas y cuidar tu energía"],
    ["readingWeight", "Lectura", "▱", "Leer y avanzar en tus libros"],
  ] as Array<["gymWeight" | "nutritionWeight" | "readingWeight", string, string, string]>).map(([key, label, icon, copy]) => <div className="priority-row" key={key}><span className="priority-icon">{icon}</span><div className="priority-copy"><b>{label}</b><small>{copy}</small></div><div className="priority-options">{[1, 2, 3].map((value) => <button key={value} className={priorityDraft[key] === value ? "active" : ""} onClick={() => setPriorityDraft({ ...priorityDraft, [key]: value })}>{priorityLabels[value]}</button>)}</div></div>)}</div><button className="save-priorities" onClick={() => void save({ action: "set_priorities", ...priorityDraft, monthKey })}>Guardar prioridades</button></article>;
  const goalsPanel = <section className="goals-page">{priorityEditor}<div className="goals-columns"><article className="panel goal-creator"><div className="panel-heading"><div><p>NUEVO OBJETIVO</p><h2>¿Qué querés conseguir?</h2></div></div><form onSubmit={(event) => { const form = new FormData(event.currentTarget); void submitForm(event, { action: "add_goal", title: form.get("title"), category: form.get("category"), period: goalPeriod, targetDate: goalDeadline(today, goalPeriod, customLength, customUnit) }); }}><label>Objetivo<input name="title" required placeholder="Ej. Correr mis primeros 10 km" /></label><label>Área<select name="category"><option value="general">Personal</option><option value="training">Entrenamiento</option><option value="nutrition">Alimentación</option><option value="reading">Lectura</option><option value="study">Estudio</option><option value="work">Trabajo</option><option value="sleep">Sueño</option></select></label><label>Plazo<select value={goalPeriod} onChange={(event) => setGoalPeriod(event.target.value as GoalPeriod)}><option value="weekly">Esta semana</option><option value="monthly">Este mes</option><option value="annual">Este año</option><option value="custom">Personalizado</option></select></label>{goalPeriod === "custom" && <div className="custom-duration"><label>Dentro de<input type="number" min="1" value={customLength} onChange={(event) => setCustomLength(Number(event.target.value) || 1)} /></label><label>Unidad<select value={customUnit} onChange={(event) => setCustomUnit(event.target.value as "months" | "years")}><option value="months">meses</option><option value="years">años</option></select></label></div>}<div className="deadline-preview"><span>◎</span><p><small>FECHA OBJETIVO</small><b>{formatDate(goalDeadline(today, goalPeriod, customLength, customUnit))}</b></p></div><button className="primary-action">Crear objetivo</button></form></article>
    <article className="panel goal-list-panel"><div className="panel-heading"><div><p>TU CAMINO</p><h2>Objetivos guardados</h2></div><span className="week-pill">{activeGoals.length} activos</span></div><div className="goal-list">{data.goals.map((goal) => <div className={"goal-row " + (goal.completedAt ? "completed" : "")} key={goal.id}><button className="goal-check" onClick={() => void save({ action: "toggle_goal", id: goal.id, completed: !goal.completedAt })}>{goal.completedAt ? "✓" : ""}</button><div><div className="goal-meta"><span className={"category-chip " + goal.category}>{categoryLabels[goal.category]}</span><span>{periodLabels[goal.period]}</span></div><b>{goal.title}</b><small>{goal.completedAt ? "Objetivo cumplido" : formatDate(goal.targetDate) + " · faltan " + Math.max(0, dayDistance(today, goal.targetDate)) + " días"}</small></div><button className="goal-delete" onClick={() => void save({ action: "delete_goal", id: goal.id })}>×</button></div>)}{!data.goals.length && <div className="inline-empty tall"><span>◎</span><p><b>Todavía no hay objetivos</b><small>Empezá con uno concreto.</small></p></div>}</div></article></div></section>;

  const sectionTitles: Record<Section, [string, string]> = {
    summary: ["Buen día, " + displayName, "Tu información principal de hoy"], score: ["Daily Score", "Un puntaje alineado con tus prioridades"],
    training: ["Entrenamiento", "Disciplinas, kilómetros, pesos y evolución"], meals: ["Comidas", "Registrá y entendé tu energía"],
    sleep: ["Sueño", "Horas de descanso y regularidad"], focus: ["Estudio / Trabajo", "Foco profundo, proyectos y tareas"],
    calendar: ["Calendario", "Eventos, fechas importantes y objetivos"], stats: ["Estadísticas", "Tendencias semanales, mensuales y anuales"],
    books: ["Biblioteca", "Lecturas, páginas e ideas"], goals: ["Objetivos", "Elegí qué importa y hacia dónde vas"],
  };
  const dateHeading = new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Buenos_Aires", weekday: "long", day: "numeric", month: "long" }).format(new Date(today + "T12:00:00")).toUpperCase();

  return <main className="app-shell">
    <aside className="sidebar"><div className="side-brand"><span className="brand-mark small">M</span><b>Mi Progreso</b></div><nav>{navItems.map((item) => <button key={item.id} className={"nav-item " + (section === item.id ? "active" : "")} onClick={() => openSection(item.id)}><span>{item.icon}</span>{item.label}</button>)}</nav><div className="profile-chip"><span>{displayName.charAt(0)}</span><div><b>{displayName}</b><small>Datos guardados</small></div><a href="/signout-with-chatgpt?return_to=/" title="Cerrar sesión">↗</a></div></aside>
    <section className="dashboard"><header className="topbar"><div><p>{dateHeading}</p><h1>{sectionTitles[section][0]} {section === "summary" && <span>👋</span>}</h1><small className="page-subtitle">{sectionTitles[section][1]}</small></div><div className={"save-status " + (saving ? "saving" : "")}><i />{saving ? "Guardando…" : "Todo guardado"}</div></header>
      {error && <div className="error-banner">{error}<button onClick={() => setError("")}>Cerrar</button></div>}
      {section === "summary" && <><section className={"hero-grid " + (loading ? "is-loading" : "")}>{scoreCard}<article className="stat-card"><span className="stat-icon violet">↗</span><div><p>ENTRENAMIENTOS</p><b>{data.trainingLogs.filter((item) => item.trainingDate >= week[0].iso).length}<small> esta semana</small></b><span>{data.disciplines.length} disciplinas</span></div></article><article className="stat-card"><span className="stat-icon coral">⌁</span><div><p>FOCO HOY</p><b>{Math.round(focusToday / 6) / 10}<small> h</small></b><span>Trabajo profundo</span></div></article><article className="stat-card"><span className="stat-icon mint">☾</span><div><p>SUEÑO</p><b>{sleepToday ? Math.round(sleepToday / 6) / 10 : "—"}<small> h</small></b><span>Último registro</span></div></article></section>
        <section className="summary-grid"><article className="panel summary-focus"><div className="panel-heading"><div><p>FOCO ACTUAL</p><h2>Este mes importa más</h2></div><button className="text-link" onClick={() => openSection("goals")}>Configurar →</button></div><div className="focus-name"><span>◎</span><div><b>{mainPriority}</b><small>Influye directamente en tu Daily Score.</small></div></div></article><article className="panel summary-goals"><div className="panel-heading"><div><p>AGENDA</p><h2>Lo próximo</h2></div><button className="text-link" onClick={() => openSection("calendar")}>Ver calendario →</button></div><div className="mini-goal-list">{upcoming.slice(0, 3).map((item) => <div key={item.key}><span className={"goal-dot " + item.type} /><p><b>{item.title}</b><small>{formatDate(item.date)} · {dayDistance(today, item.date) === 0 ? "hoy" : "faltan " + dayDistance(today, item.date) + " días"}</small></p></div>)}{!upcoming.length && <div className="inline-empty"><span>□</span><p><b>Agenda libre</b><small>Agregá una fecha importante.</small></p></div>}</div></article></section>{voiceRecorder}</>}
      {section === "score" && <section className="score-page"><div className="score-main">{scoreCard}<article className="panel score-explanation"><div className="panel-heading"><div><p>CÓMO SE FORMA</p><h2>Tus factores de hoy</h2></div><button className="text-link" onClick={() => openSection("goals")}>Cambiar prioridades →</button></div>{([
        ["Entrenamiento", factors.training, priorityDraft.gymWeight, "gym"],
        ["Alimentación", factors.nutrition, priorityDraft.nutritionWeight, "nutrition"],
        ["Lectura", factors.reading, priorityDraft.readingWeight, "reading"],
      ] as Array<[string, number, number, string]>).map(([label, value, weight, key]) => <div className="factor-row" key={key}><div><b>{label}</b><small>{priorityLabels[weight]}</small></div><div className="factor-track"><i className={key} style={{ width: String(value) + "%" }} /></div><strong>{value}</strong></div>)}<p className="formula-note">La primera fórmula combina cualquier entrenamiento registrado, hasta tres comidas y una referencia de diez páginas. La ajustaremos según el uso real.</p></article></div></section>}
      {section === "training" && trainingPanel}
      {section === "meals" && <section className="single-section">{mealsPanel}</section>}
      {section === "sleep" && sleepPanel}
      {section === "focus" && focusPanel}
      {section === "calendar" && calendarPanel}
      {section === "stats" && statsPanel}
      {section === "books" && booksPanel}
      {section === "goals" && goalsPanel}
    </section>
    <nav className="mobile-nav">{navItems.map((item) => <button key={item.id} className={section === item.id ? "active" : ""} onClick={() => openSection(item.id)}><span>{item.icon}</span>{item.mobile}</button>)}</nav>
  </main>;
}
