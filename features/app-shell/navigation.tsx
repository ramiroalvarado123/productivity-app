import type { InsightTarget, Section } from "@/shared/data/types";
import type { ReactNode } from "react";
import type { TourStep } from "@/shared/ui/tour-overlay";
export type NavItem = { id: Section; icon: ReactNode; label: string; mobile: string; center?: true };

export const friendsIcon = <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="8" r="3" /><circle cx="16.5" cy="9" r="2.5" /><path d="M2.5 19c.5-4 2.4-6 5.5-6s5 2 5.5 6M13 14.5c1-.8 2.1-1.1 3.5-1.1 2.8 0 4.4 1.8 5 5.1" /></svg>;
export const physicalIcon = <svg className="physical-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12.409 13.017A5 5 0 0 1 22 15c0 3.866-4 7-9 7-4.077 0-8.153-.82-10.371-2.462-.426-.316-.631-.832-.62-1.362C2.118 12.723 2.627 2 10 2a3 3 0 0 1 3 3 2 2 0 0 1-2 2c-1.105 0-1.64-.444-2-1" /><path d="M15 14a5 5 0 0 0-7.584 2" /><path d="M9.964 6.825C8.019 7.977 9.5 13 8 15" /></svg>;
export const focusIcon = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.2 5.2a3.4 3.4 0 0 0-5.3 2.9c0 .5.1.9.3 1.3A3.7 3.7 0 0 0 5 16.5a3.5 3.5 0 0 0 4.2 2.3M14.8 5.2a3.4 3.4 0 0 1 5.3 2.9c0 .5-.1.9-.3 1.3a3.7 3.7 0 0 1-.8 7.1 3.5 3.5 0 0 1-4.2 2.3M12 4v16M8 9.2c1.1.1 2 .7 2.4 1.6M16 9.2c-1.1.1-2 .7-2.4 1.6M8.4 15.1c1-.1 1.7-.5 2.2-1.2M15.6 15.1c-1-.1-1.7-.5-2.2-1.2" /></svg>;
export const gearIcon = <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="m19.3 14.6.35.2a1.8 1.8 0 0 1-1.8 3.12l-.35-.2a1.8 1.8 0 0 0-2.7 1.56v.4a1.8 1.8 0 0 1-3.6 0v-.4a1.8 1.8 0 0 0-2.7-1.56l-.35.2a1.8 1.8 0 0 1-1.8-3.12l.35-.2a1.8 1.8 0 0 0 0-3.12l-.35-.2a1.8 1.8 0 1 1 1.8-3.12l.35.2a1.8 1.8 0 0 0 2.7-1.56v-.4a1.8 1.8 0 0 1 3.6 0v.4a1.8 1.8 0 0 0 2.7 1.56l.35-.2a1.8 1.8 0 0 1 1.8 3.12l-.35.2a1.8 1.8 0 0 0 0 3.12Z" /></svg>;
export const plusIcon = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5.5v13M5.5 12h13" /></svg>;
export const statsIcon = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 18 5-5 4 2 6-8" /><circle cx="4" cy="18" r="1.5" /><circle cx="9" cy="13" r="1.5" /><circle cx="13" cy="15" r="1.5" /><circle cx="19" cy="7" r="1.5" /></svg>;

// En escritorio Inicio queda primero. En el celular usamos el mismo conjunto,
// pero Inicio ocupa el cuarto lugar para quedar exactamente en el centro.
export const navItems: NavItem[] = [
  { id: "summary", icon: "⌂", label: "Inicio", mobile: "Inicio" },
  { id: "friends", icon: friendsIcon, label: "Amigos", mobile: "Amigos" },
  { id: "physical", icon: physicalIcon, label: "Físico", mobile: "Físico" },
  { id: "focus", icon: focusIcon, label: "Foco", mobile: "Foco" },
  { id: "sleep", icon: "☾", label: "Sueño", mobile: "Sueño" },
  { id: "plan", icon: "◎", label: "Plan", mobile: "Plan" },
  { id: "stats", icon: statsIcon, label: "Progreso", mobile: "Progreso" },
];
export const mobileNavItems: NavItem[] = [
  navItems.find((item) => item.id === "physical")!,
  navItems.find((item) => item.id === "focus")!,
  navItems.find((item) => item.id === "sleep")!,
  { ...navItems.find((item) => item.id === "summary")!, center: true },
  navItems.find((item) => item.id === "plan")!,
  navItems.find((item) => item.id === "stats")!,
  navItems.find((item) => item.id === "friends")!,
];

/** Adónde lleva cada aviso ahora que las secciones se agruparon. */
export const insightTargets: Record<string, InsightTarget> = {
  training: { section: "physical", physicalTab: "training" },
  meals: { section: "physical", physicalTab: "meals" },
  focus: { section: "focus" },
  books: { section: "focus", focusTab: "study" },
  sleep: { section: "sleep" },
  goals: { section: "plan" },
  calendar: { section: "plan" },
  score: { section: "score" },
  stats: { section: "stats" },
};

// Recorrido guiado de la primera vez: sólo elementos de Inicio, para no tener
// que navegar entre secciones mientras el tour está abierto.
export const TOUR_STEPS: TourStep[] = [
  { selector: "[data-tour='nav']", title: "Tus áreas, siempre a mano", body: "Entrenamiento, Alimentación, Sueño, Estudio o Trabajo, Plan, Progreso y Amigos. Todo vive acá." },
  { selector: "[data-tour='score']", title: "Tu Daily Score", body: "Un puntaje diario armado con lo que registraste y el peso que le diste a cada prioridad." },
  { selector: "[data-tour='metrics']", title: "Lo que más te importa", body: "Estas tarjetas cambian según tus prioridades: acá vas a ver tu avance del día." },
  { selector: "[data-tour='voice']", title: "Cerrá tu día hablando", body: "Contá qué hiciste en 60 segundos en vez de cargar cada cosa a mano." },
  { selector: "[data-tour='profile']", title: "Tu cuenta", body: "Datos personales, membresía y cerrar sesión, todo desde acá." },
];
