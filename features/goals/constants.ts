import type { GoalCategory, GoalPeriod } from "@/shared/data/types";
export const categoryLabels: Record<GoalCategory, string> = { general: "Personal", gym: "Gimnasio", training: "Entrenamiento", nutrition: "Alimentación", reading: "Lectura", study: "Estudio", work: "Trabajo", sleep: "Sueño", score: "Daily Score", calendar: "Calendario", stats: "Progreso", goals: "Objetivos" };
export const goalAreaOptions: Array<{ value: GoalCategory; label: string }> = [
  { value: "general", label: "Personal / Inicio" }, { value: "score", label: "Daily Score" }, { value: "training", label: "Entrenamiento" },
  { value: "nutrition", label: "Alimentación" }, { value: "sleep", label: "Sueño" }, { value: "study", label: "Estudio" },
  { value: "work", label: "Trabajo" }, { value: "calendar", label: "Calendario / planificación" }, { value: "stats", label: "Progreso" },
  { value: "reading", label: "Biblioteca / lectura" }, { value: "goals", label: "Objetivos" },
];
export const periodLabels: Record<GoalPeriod, string> = { weekly: "Esta semana", monthly: "Este mes", annual: "Este año", custom: "Plazo personal" };
