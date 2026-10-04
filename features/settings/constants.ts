import type { FeedbackType } from "@/shared/data/types";
export const FEEDBACK_TYPES: Array<[FeedbackType, string, string, string]> = [
  ["positive", "♡", "Me gustó algo", "Algo que querés que mantengamos."],
  ["idea", "✦", "Tengo una sugerencia", "Una idea, función o cambio que sumarías."],
  ["bug", "!", "Encontré un problema", "Algo no funciona como debería."],
  ["dislike", "−", "Hay algo que no me gusta", "Funciona, pero lo cambiarías."],
];
export const FEEDBACK_SECTIONS = ["Inicio", "Daily Score", "Físico", "Foco", "Sueño", "Plan", "Progreso", "Amigos", "Cuenta / configuración", "Otra"];
