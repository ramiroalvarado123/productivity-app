import type { CalendarEvent, Discipline } from "@/shared/data/types";
export function normalizedPlanText(value: string) {
  return value.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

/**
 * Los bloques nuevos guardan la disciplina explícita. Para los bloques viejos,
 * intenta recuperar la relación por nombre (por ejemplo "gim" → "Gimnasio")
 * para que también se sincronicen sin obligar al usuario a recrearlos.
 */
export function planDisciplineIdFor(event: CalendarEvent, disciplines: Discipline[]) {
  if (event.disciplineId && disciplines.some((item) => item.id === event.disciplineId)) return event.disciplineId;
  if (event.category !== "training") return null;
  const title = normalizedPlanText(event.title);
  if (title.length < 3) return null;
  const named = disciplines.find((discipline) => {
    const name = normalizedPlanText(discipline.name);
    return name.includes(title) || title.includes(name) || name.startsWith(title) || title.startsWith(name);
  });
  if (named) return named.id;
  const inferredKind = /gim|gym|pesas|fuerza/.test(title) ? "strength"
    : /correr|running/.test(title) ? "running"
    : /bici|ciclismo/.test(title) ? "cycling"
    : /nadar|natacion/.test(title) ? "swimming"
    : null;
  const candidates = inferredKind ? disciplines.filter((item) => item.kind === inferredKind) : [];
  return candidates.length === 1 ? candidates[0].id : null;
}
