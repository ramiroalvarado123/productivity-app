/**
 * Patrones en tus datos. Las reglas de `insights.ts` miran sobre todo la
 * agenda de hoy; éstas miran el historial: cruzan áreas entre sí (cómo dormís
 * contra cuánto rendís), siguen tus metas de la semana y avisan cuando una
 * racha o una prioridad está por caerse.
 *
 * Todo es determinista y explicable: cada aviso dice en "because" con qué
 * números se armó, y ninguna regla habla si no tiene muestra suficiente.
 */

import { clockFromMinutes, formatMinutes, listPhrase, minutesFromClock, pluralize } from "@/shared/lib/format";
import type { Insight, InsightTone } from "@/features/insights/logic/insights";

export type AreaKey = "training" | "nutrition" | "sleep" | "focus" | "reading" | "goals";
type Series = Record<string, number>;

export type PatternInput = {
  today: string;
  nowMinutes: number;
  /** Sesiones de entrenamiento por fecha. */
  training: Series;
  /** Minutos de estudio/trabajo por fecha. */
  focus: Series;
  /** Minutos de sueño por fecha del registro (la mañana en que te despertaste). */
  sleep: Series;
  bedtimes: Record<string, string>;
  wakeTimes: Record<string, string>;
  /** Páginas leídas por fecha. */
  reading: Series;
  calories: Series;
  meals: Series;
  /** Daily Score de cada día de las últimas semanas. */
  scores: Series;
  targetCalories: number;
  focusTargetMinutes: number;
  trainingWeeklyTarget: number;
  /** Peso de cada área este mes (3 = prioridad). */
  priorities: Array<{ area: AreaKey; label: string; weight: number }>;
  books: Array<{ title: string; currentPage: number; totalPages: number }>;
};

export type PatternInsight = Insight & { area: AreaKey | "general" };

const DAY_NAMES = ["domingos", "lunes", "martes", "miércoles", "jueves", "viernes", "sábados"];
const SECTION_FOR: Record<AreaKey, string> = { training: "training", nutrition: "meals", sleep: "sleep", focus: "focus", reading: "books", goals: "goals" };
const GOOD_SLEEP = 7 * 60;
/** Con menos casos de cada lado un "patrón" es casualidad. */
const MIN_SAMPLE = 3;

function shift(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
function lastDays(today: string, count: number, offset = 0) {
  return Array.from({ length: count }, (_, index) => shift(today, -(index + offset)));
}
function weekday(date: string) {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}
/** Lunes de la semana de `date`. */
export function mondayOf(date: string) {
  return shift(date, -((weekday(date) + 6) % 7));
}
const average = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);
const sumOver = (series: Series, dates: string[]) => dates.reduce((sum, date) => sum + (series[date] ?? 0), 0);
const activeIn = (series: Series, dates: string[]) => dates.filter((date) => (series[date] ?? 0) > 0).length;
function shortDate(date: string) {
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long" }).format(new Date(`${date}T12:00:00`));
}
/** Hora de acostarse en minutos "desde el mediodía", para que la 1:00 quede después de las 23:00. */
function nightMinutes(clock: string) {
  const minutes = minutesFromClock(clock);
  if (minutes === null) return null;
  return (minutes - 12 * 60 + 1440) % 1440;
}

/** Racha de días seguidos con actividad que termina ayer. */
function streakUntilYesterday(series: Series, today: string) {
  let count = 0;
  for (let day = shift(today, -1); (series[day] ?? 0) > 0; day = shift(day, -1)) count += 1;
  return count;
}

/** Compara el promedio de `outcome` entre los días que cumplen y los que no `condition`. */
function split(dates: string[], condition: (date: string) => boolean | null, outcome: (date: string) => number) {
  const yes: number[] = [];
  const no: number[] = [];
  for (const date of dates) {
    const verdict = condition(date);
    if (verdict === null) continue;
    (verdict ? yes : no).push(outcome(date));
  }
  return { yes, no, enough: yes.length >= MIN_SAMPLE && no.length >= MIN_SAMPLE, diff: average(yes) - average(no) };
}

export function buildPatternInsights(input: PatternInput): PatternInsight[] {
  const out: PatternInsight[] = [];
  const add = (area: PatternInsight["area"], tone: InsightTone, rule: Omit<Insight, "tone" | "surface">) =>
    out.push({ ...rule, tone, area, surface: "plan" });
  const history = lastDays(input.today, 60, 1);
  const hasAny = (date: string) => [input.training, input.focus, input.reading, input.meals].some((series) => (series[date] ?? 0) > 0) || (input.sleep[date] ?? 0) > 0;
  const loggedDays = history.filter(hasAny);

  // 1. Sueño → foco del mismo día.
  const sleepFocus = split(loggedDays, (date) => input.sleep[date] ? input.sleep[date] >= GOOD_SLEEP : null, (date) => input.focus[date] ?? 0);
  if (sleepFocus.enough && sleepFocus.diff >= 30 && average(sleepFocus.yes) >= average(sleepFocus.no) * 1.25) {
    add("sleep", "suggestion", {
      id: "pattern-sleep-focus",
      icon: "☾",
      title: `Los días que dormís 7 h o más hacés ${formatMinutes(sleepFocus.diff)} más de foco.`,
      body: `Con 7 h o más promediaste ${formatMinutes(average(sleepFocus.yes))} de estudio/trabajo; con menos, ${formatMinutes(average(sleepFocus.no))}. Dormir bien es la forma más barata de rendir más.`,
      because: `${pluralize(sleepFocus.yes.length, "día", "días")} con 7 h o más contra ${pluralize(sleepFocus.no.length, "día", "días")} con menos, en los últimos 60 días.`,
      action: { kind: "open", label: "Ver Sueño", section: "sleep" },
    });
  }

  // 2. Entrenar → la noche siguiente.
  const trainingSleep = split(
    loggedDays.filter((date) => input.sleep[shift(date, 1)]),
    (date) => (input.training[date] ?? 0) > 0,
    (date) => input.sleep[shift(date, 1)] ?? 0,
  );
  if (trainingSleep.enough && trainingSleep.diff >= 20) {
    add("training", "win", {
      id: "pattern-training-sleep",
      icon: "↗",
      title: `Las noches después de entrenar dormís ${formatMinutes(trainingSleep.diff)} más.`,
      body: `Después de entrenar promediás ${formatMinutes(average(trainingSleep.yes))} de sueño; los días que no, ${formatMinutes(average(trainingSleep.no))}.`,
      because: `Sueño de la noche siguiente en ${pluralize(trainingSleep.yes.length, "día con entrenamiento", "días con entrenamiento")} y ${pluralize(trainingSleep.no.length, "día sin", "días sin")}.`,
    });
  }

  // 3. Entrenar → foco del mismo día.
  const trainingFocus = split(loggedDays, (date) => (input.training[date] ?? 0) > 0, (date) => input.focus[date] ?? 0);
  if (trainingFocus.enough && trainingFocus.diff >= 30 && average(trainingFocus.yes) >= average(trainingFocus.no) * 1.25) {
    add("training", "win", {
      id: "pattern-training-focus",
      icon: "↗",
      title: `Los días que entrenás estudiás o trabajás ${formatMinutes(trainingFocus.diff)} más.`,
      body: `Entrenando promediás ${formatMinutes(average(trainingFocus.yes))} de foco; sin entrenar, ${formatMinutes(average(trainingFocus.no))}. Moverte no te saca tiempo: te ordena el día.`,
      because: `${pluralize(trainingFocus.yes.length, "día con entrenamiento", "días con entrenamiento")} contra ${pluralize(trainingFocus.no.length, "día sin", "días sin")}, últimos 60 días.`,
    });
  }

  // 4. Sueño → Daily Score.
  const sleepScore = split(loggedDays, (date) => input.sleep[date] ? input.sleep[date] >= GOOD_SLEEP : null, (date) => input.scores[date] ?? 0);
  if (sleepScore.enough && sleepScore.diff >= 10 && !out.some((item) => item.id === "pattern-sleep-focus")) {
    add("sleep", "suggestion", {
      id: "pattern-sleep-score",
      icon: "☾",
      title: `Tu Daily Score es ${Math.round(sleepScore.diff)} puntos más alto cuando dormís 7 h o más.`,
      body: `Promedio ${Math.round(average(sleepScore.yes))}/100 después de una noche completa contra ${Math.round(average(sleepScore.no))}/100 después de una corta.`,
      because: `${pluralize(sleepScore.yes.length, "noche", "noches")} de 7 h o más y ${pluralize(sleepScore.no.length, "noche", "noches")} más cortas.`,
      action: { kind: "open", label: "Ver Sueño", section: "sleep" },
    });
  }

  // 5. Meta semanal de entrenamiento.
  if (input.trainingWeeklyTarget > 0) {
    const monday = mondayOf(input.today);
    const weekSoFar = Array.from({ length: (weekday(input.today) + 6) % 7 + 1 }, (_, index) => shift(monday, index));
    const done = activeIn(input.training, weekSoFar);
    const trainedToday = (input.training[input.today] ?? 0) > 0;
    const daysLeft = 7 - weekSoFar.length + (trainedToday ? 0 : 1);
    const missing = input.trainingWeeklyTarget - done;
    if (missing <= 0) {
      add("training", "win", {
        id: "training-target-met",
        icon: "✓",
        title: `Meta semanal cumplida: ${done} de ${input.trainingWeeklyTarget} entrenamientos.`,
        body: done > input.trainingWeeklyTarget ? "Ya la superaste. Lo que sumes ahora es extra: cuidá también el descanso." : "Lo que entrenes de acá al domingo es extra.",
        because: "Días con entrenamiento desde el lunes contra tu meta semanal.",
      });
    } else if (missing >= daysLeft && daysLeft > 0) {
      add("training", "alert", {
        id: "training-target-tight",
        icon: "↗",
        title: missing > daysLeft ? `Esta semana ya no llegás a tus ${input.trainingWeeklyTarget} entrenamientos.` : `Para cumplir tu meta tenés que entrenar ${daysLeft === 1 ? "hoy" : `los ${daysLeft} días que quedan`}.`,
        body: missing > daysLeft ? `Vas ${done} de ${input.trainingWeeklyTarget} y quedan ${pluralize(daysLeft, "día", "días")}. Sumá los que puedas: cada sesión cuenta para tu racha.` : `Vas ${done} de ${input.trainingWeeklyTarget}. No hay margen para saltear ninguno.`,
        because: "Entrenamientos que faltan contra días que quedan en la semana.",
        action: { kind: "open", label: "Ir a Físico", section: "training" },
      });
    } else if (weekSoFar.length >= 3 && !trainedToday) {
      add("training", "suggestion", {
        id: "training-target-pending",
        icon: "↗",
        title: `Te ${missing === 1 ? "falta 1 entrenamiento" : `faltan ${missing} entrenamientos`} para tu meta semanal.`,
        body: `Vas ${done} de ${input.trainingWeeklyTarget} y quedan ${pluralize(daysLeft, "día", "días")} contando hoy.`,
        because: "Días con entrenamiento desde el lunes contra tu meta semanal.",
        action: { kind: "open", label: "Ir a Físico", section: "training" },
      });
    }
  }

  // 6. Una prioridad del mes sin registros.
  const neglected = input.priorities
    .filter((item) => item.weight === 3 && item.area !== "goals")
    .map((item) => {
      const series = { training: input.training, nutrition: input.meals, sleep: input.sleep, focus: input.focus, reading: input.reading }[item.area as Exclude<AreaKey, "goals">];
      let gap = 0;
      while (gap < 30 && !(series[shift(input.today, -gap)] > 0)) gap += 1;
      return { ...item, gap };
    })
    .filter((item) => item.gap >= 3)
    .sort((left, right) => right.gap - left.gap)[0];
  if (neglected) {
    add(neglected.area, "alert", {
      id: `priority-neglected-${neglected.area}`,
      icon: "◎",
      title: neglected.gap >= 30 ? `${neglected.label} es prioridad este mes y no tiene registros.` : `${neglected.label} es prioridad este mes y hace ${neglected.gap} días que no registrás nada.`,
      body: "Es el área que más pesa en tu Daily Score. Un registro chico hoy vale más que uno perfecto la semana que viene.",
      because: "Áreas marcadas como “Prioridad” sin actividad en los últimos días.",
      action: { kind: "open", label: `Ir a ${neglected.label}`, section: SECTION_FOR[neglected.area] },
    });
  }

  // 7. Racha en riesgo: venís varios días seguidos y hoy todavía no.
  if (input.nowMinutes >= 17 * 60) {
    const streaks = ([
      ["reading", input.reading, "leyendo", "Diez páginas alcanzan para no cortarla."],
      ["focus", input.focus, "con foco", "Un bloque corto de 25 minutos ya la sostiene."],
      ["training", input.training, "entrenando", "Una sesión corta también cuenta."],
    ] as Array<[AreaKey, Series, string, string]>)
      .map(([area, series, verb, tip]) => ({ area, verb, tip, streak: streakUntilYesterday(series, input.today), today: series[input.today] ?? 0 }))
      .filter((item) => item.streak >= 3 && item.today === 0)
      .sort((left, right) => right.streak - left.streak)[0];
    if (streaks) {
      add(streaks.area, "suggestion", {
        id: `streak-risk-${streaks.area}`,
        icon: "🔥",
        title: `Llevás ${streaks.streak} días seguidos ${streaks.verb}. Hoy todavía no.`,
        body: streaks.tip,
        because: "Racha de días consecutivos hasta ayer y ningún registro hoy después de las 17:00.",
        action: { kind: "open", label: "Registrar ahora", section: SECTION_FOR[streaks.area] },
      });
    }
  }

  // 8. Deuda de sueño con una hora concreta para acostarse.
  const lastWeek = lastDays(input.today, 7);
  const nights = lastWeek.map((date) => input.sleep[date]).filter((value): value is number => Boolean(value));
  if (nights.length >= 4 && average(nights) < GOOD_SLEEP) {
    const wakes = lastWeek.filter((date) => input.sleep[date]).map((date) => minutesFromClock(input.wakeTimes[date] ?? "")).filter((value): value is number => value !== null);
    const wake = wakes.length ? Math.round(average(wakes) / 5) * 5 : null;
    add("sleep", "suggestion", {
      id: "sleep-debt",
      icon: "☾",
      title: `Esta semana dormiste ${formatMinutes(average(nights))} por noche.`,
      body: wake !== null
        ? `Te estás despertando cerca de las ${clockFromMinutes(wake)}. Acostarte a las ${clockFromMinutes(wake - 7.5 * 60)} te da 7 h 30 min sin cambiar tu mañana.`
        : "Estás por debajo de las 7 h. Adelantar media hora la hora de acostarte es el cambio más fácil de sostener.",
      because: `Promedio de ${pluralize(nights.length, "noche registrada", "noches registradas")} en los últimos 7 días.`,
      action: { kind: "open", label: "Ver Sueño", section: "sleep" },
    });
  }

  // 9. Horarios de sueño desordenados.
  const beds = lastWeek.map((date) => input.sleep[date] ? nightMinutes(input.bedtimes[date] ?? "") : null).filter((value): value is number => value !== null);
  if (beds.length >= 4 && Math.max(...beds) - Math.min(...beds) >= 120) {
    add("sleep", "suggestion", {
      id: "sleep-irregular",
      icon: "◷",
      title: `Te acostaste entre las ${clockFromMinutes(Math.min(...beds) + 720)} y las ${clockFromMinutes(Math.max(...beds) + 720)} esta semana.`,
      body: "Más de dos horas de diferencia desordenan el reloj interno tanto como dormir poco. Una hora fija, incluso el fin de semana, ayuda más que recuperar horas.",
      because: `Horas de acostarte de ${pluralize(beds.length, "noche", "noches")} de los últimos 7 días.`,
      action: { kind: "open", label: "Ver Sueño", section: "sleep" },
    });
  }

  // 10. Objetivo diario de foco.
  if (input.focusTargetMinutes > 0) {
    const pastWeek = lastDays(input.today, 7, 1);
    const logged = activeIn(input.focus, pastWeek);
    const met = pastWeek.filter((date) => (input.focus[date] ?? 0) >= input.focusTargetMinutes).length;
    const avg = sumOver(input.focus, pastWeek) / 7;
    if (met >= 5) {
      add("focus", "win", {
        id: "focus-target-streak",
        icon: "⌁",
        title: `Cumpliste tu objetivo de foco ${met} de los últimos 7 días.`,
        body: `Promediaste ${formatMinutes(avg)} por día contra un objetivo de ${formatMinutes(input.focusTargetMinutes)}. Si se te hace fácil, quizás sea momento de subirlo.`,
        because: "Días de la última semana con al menos tu objetivo diario de estudio/trabajo.",
      });
    } else if (logged >= 3 && avg < input.focusTargetMinutes * 0.6) {
      add("focus", "suggestion", {
        id: "focus-target-low",
        icon: "⌁",
        title: `Promediás ${formatMinutes(avg)} de foco por día; tu objetivo es ${formatMinutes(input.focusTargetMinutes)}.`,
        body: met ? `Lo cumpliste ${pluralize(met, "día", "días")} de 7. Agendar el bloque a una hora fija suele ser lo que más mueve este número.` : "No lo cumpliste ningún día de la última semana. Si el objetivo es irreal, bajalo: uno alcanzable te da más racha.",
        because: "Minutos de estudio/trabajo de los últimos 7 días contra tu objetivo diario.",
        action: { kind: "open", label: "Ir a Foco", section: "focus" },
      });
    }
  }

  // 11. Calorías de la semana contra el objetivo.
  if (input.targetCalories > 0) {
    const pastWeek = lastDays(input.today, 7, 1).filter((date) => (input.calories[date] ?? 0) > 0);
    if (pastWeek.length >= 3) {
      const avg = Math.round(sumOver(input.calories, pastWeek) / pastWeek.length);
      const ratio = avg / input.targetCalories;
      if (Math.abs(ratio - 1) <= 0.1) {
        add("nutrition", "win", {
          id: "calories-on-target",
          icon: "◇",
          title: `Comiste en tu objetivo esta semana: ${avg.toLocaleString("es-AR")} kcal por día.`,
          body: `Tu objetivo es ${input.targetCalories.toLocaleString("es-AR")} kcal y te mantuviste dentro del ±10 %.`,
          because: `Promedio de ${pluralize(pastWeek.length, "día con comidas", "días con comidas")} de la última semana.`,
        });
      } else if (ratio > 1.15 || ratio < 0.8) {
        add("nutrition", "suggestion", {
          id: ratio > 1 ? "calories-over-week" : "calories-under-week",
          icon: "◇",
          title: `Esta semana promediaste ${avg.toLocaleString("es-AR")} kcal; tu objetivo es ${input.targetCalories.toLocaleString("es-AR")}.`,
          body: ratio > 1
            ? `Es un ${Math.round((ratio - 1) * 100)} % más. Mirá qué comida se repite en los días más altos: suele haber una sola que explica la diferencia.`
            : `Es un ${Math.round((1 - ratio) * 100)} % menos. O hay comidas sin cargar, o estás comiendo poco para tu objetivo.`,
          because: `Promedio de ${pluralize(pastWeek.length, "día con comidas", "días con comidas")} de la última semana.`,
          action: { kind: "open", label: "Ir a Comidas", section: "meals" },
        });
      }
    }
  }

  // 12. A este ritmo terminás el libro el…
  const pace = sumOver(input.reading, lastDays(input.today, 14)) / 14;
  const book = input.books.filter((item) => item.totalPages > item.currentPage && item.currentPage > 0).sort((left, right) => (right.currentPage / right.totalPages) - (left.currentPage / left.totalPages))[0];
  if (book && pace >= 1) {
    const days = Math.ceil((book.totalPages - book.currentPage) / pace);
    if (days <= 90) {
      add("reading", "win", {
        id: "reading-finish-date",
        icon: "▱",
        title: `A tu ritmo terminás “${book.title}” el ${shortDate(shift(input.today, days))}.`,
        body: `Venís leyendo ${Math.round(pace)} páginas por día y te quedan ${book.totalPages - book.currentPage}.`,
        because: "Páginas de los últimos 14 días y las que le faltan al libro más avanzado.",
      });
    }
  }

  // 13. Tu Daily Score esta semana contra la anterior.
  const thisWeek = lastDays(input.today, 7, 1).filter(hasAny);
  const previousWeek = lastDays(input.today, 7, 8).filter(hasAny);
  if (thisWeek.length >= 4 && previousWeek.length >= 4) {
    const now = average(thisWeek.map((date) => input.scores[date] ?? 0));
    const before = average(previousWeek.map((date) => input.scores[date] ?? 0));
    if (now - before >= 8) {
      add("general", "win", {
        id: "score-up",
        icon: "▲",
        title: `Tu Daily Score subió ${Math.round(now - before)} puntos esta semana.`,
        body: `Promedio ${Math.round(now)}/100 en los últimos 7 días contra ${Math.round(before)}/100 la semana anterior.`,
        because: "Promedio de los días con registros de las dos últimas semanas.",
      });
    } else if (before - now >= 8) {
      add("general", "suggestion", {
        id: "score-down",
        icon: "▽",
        title: `Tu Daily Score bajó ${Math.round(before - now)} puntos esta semana.`,
        body: `Promedio ${Math.round(now)}/100 contra ${Math.round(before)}/100 la semana anterior. Mirá qué área dejó de aparecer: casi siempre es una sola.`,
        because: "Promedio de los días con registros de las dos últimas semanas.",
        action: { kind: "open", label: "Ver Progreso", section: "stats" },
      });
    }
  }

  // 14. El día de la semana más flojo.
  const fourWeeks = lastDays(input.today, 28, 1).filter(hasAny);
  if (fourWeeks.length >= 14) {
    const byWeekday = new Map<number, number[]>();
    for (const date of fourWeeks) byWeekday.set(weekday(date), [...(byWeekday.get(weekday(date)) ?? []), input.scores[date] ?? 0]);
    const overall = average(fourWeeks.map((date) => input.scores[date] ?? 0));
    const weakest = [...byWeekday.entries()].filter(([, values]) => values.length >= 3).map(([day, values]) => ({ day, avg: average(values) })).sort((left, right) => left.avg - right.avg)[0];
    if (weakest && overall - weakest.avg >= 15) {
      add("general", "suggestion", {
        id: "weekday-weak",
        icon: "▤",
        title: `Los ${DAY_NAMES[weakest.day]} son tu día más flojo.`,
        body: `Promedian ${Math.round(weakest.avg)}/100 contra ${Math.round(overall)}/100 del resto. Dejar algo chico ya agendado para ese día suele alcanzar para levantarlo.`,
        because: "Daily Score por día de la semana en las últimas 4 semanas.",
        action: { kind: "open", label: "Ir al Plan", section: "calendar" },
      });
    }
  }

  // 15. Récord: la mejor semana de las últimas seis.
  const weekTotals = (series: Series) => Array.from({ length: 6 }, (_, week) => sumOver(series, lastDays(input.today, 7, week * 7)));
  const records = ([
    ["focus", input.focus, (total: number) => `${formatMinutes(total)} de foco`],
    ["training", input.training, (total: number) => pluralize(total, "entrenamiento", "entrenamientos")],
    ["reading", input.reading, (total: number) => pluralize(total, "página", "páginas")],
  ] as Array<[AreaKey, Series, (total: number) => string]>).filter(([, series]) => {
    const totals = weekTotals(series);
    return totals[0] > 0 && totals.slice(1).filter((total) => total > 0).length >= 2 && totals[0] > Math.max(...totals.slice(1));
  });
  if (records.length) {
    const [area, series, label] = records[0];
    const total = weekTotals(series)[0];
    add(area, "win", {
      id: `week-record-${area}`,
      icon: "★",
      title: `Tu mejor semana de ${area === "focus" ? "foco" : area === "training" ? "entrenamiento" : "lectura"} en un mes y medio.`,
      body: `${label(total).charAt(0).toUpperCase() + label(total).slice(1)} en los últimos 7 días${records.length > 1 ? `, y también vas arriba en ${listPhrase(records.slice(1).map(([key]) => key === "focus" ? "foco" : key === "training" ? "entrenamiento" : "lectura"))}` : ""}.`,
      because: "Total de los últimos 7 días contra cada una de las 5 semanas anteriores.",
    });
  }

  // 16. Todavía no hay datos para cruzar: decir cuánto falta en vez de callarse.
  const sleepNights = history.filter((date) => input.sleep[date]).length;
  if (!out.length && sleepNights < 6) {
    add("general", "suggestion", {
      id: "patterns-warming-up",
      icon: "✦",
      title: sleepNights ? `Con ${pluralize(6 - sleepNights, "noche más", "noches más")} de sueño empiezo a cruzar tus datos.` : "Registrá tu sueño unos días y empiezo a cruzar tus datos.",
      body: "Cuando tenga algunas noches junto con tus horas de foco y tus entrenamientos, te voy a mostrar qué te hace rendir más y qué te frena.",
      because: `${pluralize(sleepNights, "noche registrada", "noches registradas")} en los últimos 60 días.`,
      action: { kind: "open", label: "Registrar sueño", section: "sleep" },
    });
  }

  return out;
}

const AREA_BY_ID: Array<[RegExp, PatternInsight["area"]]> = [
  [/^sleep/, "sleep"], [/^calories/, "nutrition"], [/^reading/, "reading"], [/^goal/, "goals"],
  [/^(overlap|overloaded|unscheduled)/, "focus"],
];

/**
 * Lo que entra en el panel: primero lo urgente, sin repetir área, y siempre
 * con algún logro si lo hay, para que el panel no sea sólo una lista de quejas.
 */
export function rankInsights(insights: Array<Insight & { area?: PatternInsight["area"] }>, limit = 4) {
  const order: Record<InsightTone, number> = { alert: 0, suggestion: 1, win: 2 };
  const areaOf = (insight: Insight & { area?: PatternInsight["area"] }) => insight.area ?? AREA_BY_ID.find(([pattern]) => pattern.test(insight.id))?.[1] ?? "general";
  const sorted = [...insights].sort((left, right) => order[left.tone] - order[right.tone]);
  const picked: Insight[] = [];
  const usedAreas = new Set<string>();
  for (const insight of sorted) {
    if (picked.length >= limit) break;
    const area = areaOf(insight);
    if (area !== "general" && usedAreas.has(area)) continue;
    usedAreas.add(area);
    picked.push(insight);
  }
  const win = sorted.find((insight) => insight.tone === "win" && !picked.includes(insight));
  if (win && picked.length >= limit && !picked.some((insight) => insight.tone === "win")) picked[picked.length - 1] = win;
  return picked;
}
