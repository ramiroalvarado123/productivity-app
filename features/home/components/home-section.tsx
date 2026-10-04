"use client";
import type { CSSProperties } from "react";
import type { InsightAction } from "@/features/insights/logic/insights";
import { LockedFeature } from "@/features/pro/components/locked-feature";
import { NotificationSettings } from "@/features/notifications/components/notification-settings";
import type { Priorities } from "@/shared/data/types";
import { StreakFlameIcon } from "@/features/engagement/components/badge-icons";
import { clockFromMinutes, formatMinutes, listPhrase, pluralize } from "@/shared/lib/format";
import { formatFocusHours } from "@/shared/lib/numbers";
import { insightHeadline } from "@/features/insights/logic/insights";
import { restoreProgressFromStreak } from "@/features/engagement/logic/app-engagement";
import { scoreLabel } from "@/domain/score";
import { useState } from "react";
import { useWorkspace } from "@/features/app-shell/workspace";

/** Inicio: racha, frase del día, Daily Score, métricas prioritarias, plan del día y avisos. */
export function HomeSection() {
  const {
    today,
    week,
    data,
    section,
    engagement,
    streakActionError,
    setStreakActionError,
    engagementVisitRef,
    loading,
    refreshVersion,
    saving,
    priorityDraft,
    setVoiceOpen,
    setAgendaView,
    nowMinutes,
    runStreakAction,
    trainingByDate,
    calories,
    pagesToday,
    sleepToday,
    focusToday,
    score,
    highestPriority,
    topPriorities,
    priorityNames,
    balanced,
    activeGoals,
    dietTargetCalories,
    todayBlocks,
    todayUnscheduled,
    todaySlots,
    streaks,
    planNotices,
    quote,
    openSection,
    isPro,
    openPro,
    openArea,
    applyInsightAction,
    toggleTask,
    taskDone,
    toggleEvent,
    eventDone,
  } = useWorkspace();
  const [streakInfoOpen, setStreakInfoOpen] = useState(false);

  // Versión compacta para la fila de Inicio: entra al lado de las métricas y
  // es el único acceso al Daily Score, que ya no está en el menú.
  const compactScoreCard = <button
    type="button"
    className="score-tile"
    data-tour="score"
    onClick={() => openSection("score")}
    aria-label={`Daily Score ${score} de 100. Abrir el detalle.`}
  >
    <div className="score-ring small" style={{ "--score": String(score * 3.6) + "deg" } as CSSProperties}><div><b>{score}</b><small>/100</small></div></div>
    <div className="score-tile-copy">
      <p>DAILY SCORE</p>
      <b>{scoreLabel(score)}</b>
      <small>{balanced ? "Ajustar prioridades" : listPhrase(priorityNames)}</small>
    </div>
    <span className="score-tile-go" aria-hidden="true">→</span>
  </button>;
  // El cierre por voz comparte la primera fila con el Daily Score: es una
  // acción principal del día, no un control secundario escondido en la agenda.
  const compactVoiceButton = <button
    type="button"
    className={"voice-hero-button" + (isPro ? "" : " is-locked")}
    data-tour="voice"
    onClick={() => isPro ? setVoiceOpen(true) : openPro()}
    aria-label={isPro ? "Grabar mi día" : "Conocer el cierre del día con AVORA Pro"}
  >
    <span className="voice-hero-record" aria-hidden="true">●</span>
    <span className="voice-hero-copy">
      <small>CIERRE DEL DÍA</small>
      <b>Grabar mi día</b>
      <em>Contalo en 60 segundos</em>
    </span>
    {isPro ? <span className="voice-hero-go" aria-hidden="true">→</span> : <span className="voice-hero-lock" aria-hidden="true"><i>🔒</i><strong>PRO</strong></span>}
  </button>;
  // Las métricas de Inicio siguen a las prioridades del mes: si te importa
  // dormir, la tarjeta que ves es la de sueño.
  const areaMetrics: Record<string, { icon: string; tone: string; label: string; value: string; unit: string; caption: string; area: string }> = {
    gymWeight: {
      icon: "↗", tone: "violet", label: "ENTRENAMIENTOS", area: "training",
      value: String(Object.entries(trainingByDate).filter(([date]) => date >= week[0].iso && date <= today).reduce((sum, [, count]) => sum + count, 0)), unit: "esta semana",
      caption: streaks.training.current ? pluralize(streaks.training.current, "semana seguida", "semanas seguidas") : `${data.disciplines.length} disciplinas`,
    },
    focusWeight: {
      icon: "⌁", tone: "coral", label: "FOCO HOY", area: "focus",
      value: (focusToday / 60).toFixed(focusToday % 60 ? 1 : 0), unit: "h",
      caption: formatFocusHours(focusToday),
    },
    sleepWeight: {
      icon: "☾", tone: "mint", label: "SUEÑO", area: "sleep",
      value: sleepToday ? String(Math.round(sleepToday / 6) / 10) : "—", unit: "h",
      caption: sleepToday ? "Último registro" : "Sin registrar",
    },
    nutritionWeight: {
      icon: "◇", tone: "sand", label: "CALORÍAS", area: "meals",
      value: calories ? calories.toLocaleString("es-AR") : "—", unit: "kcal",
      caption: dietTargetCalories ? `de ${dietTargetCalories.toLocaleString("es-AR")} objetivo` : `${data.meals.length} comidas hoy`,
    },
    readingWeight: {
      icon: "▱", tone: "sky", label: "LECTURA", area: "books",
      value: String(pagesToday), unit: "pág.",
      caption: streaks.reading.current ? pluralize(streaks.reading.current, "día leyendo", "días leyendo") : `${data.books.filter((book) => book.status === "reading").length} libros abiertos`,
    },
    goalsWeight: {
      icon: "◎", tone: "violet", label: "OBJETIVOS", area: "goals",
      value: String(activeGoals.length), unit: "activos",
      caption: data.goals.filter((goal) => goal.completedAt).length + " cumplidos",
    },
  };
  // Orden estable cuando varias áreas empatan en peso.
  const metricOrder = ["gymWeight", "focusWeight", "sleepWeight", "nutritionWeight", "readingWeight", "goalsWeight"];
  // Inicio muestra todas las áreas marcadas explícitamente como "Prioridad".
  // Si todavía no hay ninguna, conserva la selección de mayor peso existente;
  // y en el estado inicial completamente equilibrado usa tres accesos útiles.
  const priorityMetricKeys = metricOrder.filter((key) => priorityDraft[key as keyof Omit<Priorities, "monthKey">] === highestPriority);
  const explicitPriorityMetricKeys = metricOrder.filter((key) => priorityDraft[key as keyof Omit<Priorities, "monthKey">] === 3);
  const featuredMetricKeys = explicitPriorityMetricKeys.length ? explicitPriorityMetricKeys : balanced ? metricOrder.slice(0, 3) : priorityMetricKeys;
  const heroMetrics = featuredMetricKeys.map((key) => areaMetrics[key]);
  // ---------------------------------------------------------------------------
  // Plan del día
  // ---------------------------------------------------------------------------
  const blockCategoryLabel: Record<string, string> = {
    task: "Tarea", study: "Estudio", work: "Trabajo", personal: "Personal",
    training: "Entrenamiento", nutrition: "Alimentación", sleep: "Sueño", reading: "Lectura",
    health: "Salud", other: "Otro",
  };
  const currentBlock = todayBlocks.find((block) => !block.done && block.start <= nowMinutes && block.end > nowMinutes);
  const nextBlock = todayBlocks.find((block) => !block.done && block.start > nowMinutes);
  const dayPlanPanel = <article className="panel day-plan">
    <div className="panel-heading">
      <div><p>PLAN DEL DÍA</p><h2>{todayBlocks.length ? "Tu día, hora por hora" : "Todavía no armaste el día"}</h2></div>
      <div className="day-plan-actions">
        <button className="text-link" onClick={() => { setAgendaView("week"); openSection("plan"); }}>Ver la semana →</button>
      </div>
    </div>
    {todayBlocks.length ? <>
      <div className="day-now">
        {currentBlock
          ? <p><i className="live" /><b>Ahora: {currentBlock.title}</b><small>hasta las {clockFromMinutes(currentBlock.end)}</small></p>
          : nextBlock
            ? <p><i /><b>Lo próximo: {nextBlock.title}</b><small>a las {clockFromMinutes(nextBlock.start)}</small></p>
            : <p><i /><b>No queda nada agendado</b><small>el resto del día es tuyo</small></p>}
      </div>
      <ol className="day-timeline">
        {todayBlocks.map((block) => {
          const done = block.taskId
            ? taskDone(block.taskId, block.done)
            : block.eventId
              ? eventDone(block.eventId, block.done)
              : block.done;
          const past = block.end <= nowMinutes;
          const live = block.start <= nowMinutes && block.end > nowMinutes;
          const classes = ["day-block", done ? "done" : "", past ? "past" : "", live ? "live" : ""].filter(Boolean).join(" ");
          // Una tarea o evento se puede completar aunque su horario ya haya pasado:
          // el día se registra cuando la persona realmente lo termina.
          return <li key={block.key} className={classes}>
            {block.taskId ? <button
              type="button"
              className="day-block-hit"
              aria-pressed={done}
              aria-label={block.title + ", " + clockFromMinutes(block.start) + ". " + (done ? "Marcar como pendiente" : "Marcar como hecha") + "."}
              onClick={() => void toggleTask(block.taskId as number, !done)}
            >
              <span className="block-time">{clockFromMinutes(block.start)}<small>{formatMinutes(block.minutes)}</small></span>
              <span className={"block-body " + block.category}>
                <b>{block.title}</b>
                <small>{[blockCategoryLabel[block.category] ?? "Bloque", block.detail].filter(Boolean).join(" · ")}</small>
              </span>
              <span className="block-check" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M4.5 10.5l3.6 3.6L15.5 6.7" /></svg></span>
            </button> : block.eventId ? <button
              type="button"
              className="day-block-hit is-event"
              aria-pressed={done}
              aria-label={block.title + ", " + clockFromMinutes(block.start) + ". " + (done ? "Marcar como pendiente" : "Marcar como hecho") + "."}
              onClick={() => void toggleEvent(block.eventId as number, !done)}
            >
              <span className="block-time">{clockFromMinutes(block.start)}<small>{formatMinutes(block.minutes)}</small></span>
              <span className={"block-body " + block.category}>
                <b>{block.title}</b>
                <small>{[blockCategoryLabel[block.category] ?? "Evento", block.detail].filter(Boolean).join(" · ")}</small>
              </span>
              <span className={"block-check " + (done ? "" : "block-check-event")} aria-hidden="true" title="Evento del calendario">{done ? <svg viewBox="0 0 20 20"><path d="M4.5 10.5l3.6 3.6L15.5 6.7" /></svg> : "◇"}</span>
            </button> : null}
          </li>
        })}
      </ol>
    </> : <div className="inline-empty tall">
      <span>◷</span>
      <p><b>Sin bloques para hoy</b><small>Poné una hora a tus tareas y aparecen acá, ordenadas.</small></p>
    </div>}
    {todayUnscheduled.length > 0 && <div className="unscheduled-strip">
      <p>{pluralize(todayUnscheduled.length, "tarea sin horario", "tareas sin horario")}</p>
      <div>{todayUnscheduled.slice(0, 4).map((task) => <span key={task.id}>{task.title}</span>)}</div>
      <button className="text-link" onClick={() => openSection("focus")}>Organizarlas →</button>
    </div>}
    {todaySlots.length > 0 && <p className="slot-hint">
      Huecos libres: {todaySlots.slice(0, 3).map((slot) => `${clockFromMinutes(slot.start)}–${clockFromMinutes(slot.end)}`).join(" · ")}
    </p>}
  </article>;
  const insightsPanel = <article className="panel insights-panel">
    <div className="panel-heading">
      <div><p>LO QUE VEO EN TUS DATOS</p><h2>{insightHeadline(planNotices, score, balanced ? [] : priorityNames)}</h2></div>
    </div>
    {planNotices.length ? <div className="insight-list">
      {planNotices.map((insight) => <article key={insight.id} className={"insight " + insight.tone}>
        <span className="insight-icon">{insight.icon}</span>
        <div className="insight-copy">
          <b>{insight.title}</b>
          <p>{insight.body}</p>
          <details><summary>Por qué aparece esto</summary><p>{insight.because}</p></details>
        </div>
        {insight.action && <button className="insight-action" disabled={saving} onClick={() => void applyInsightAction(insight.action as InsightAction)}>{insight.action.label}</button>}
      </article>)}
    </div> : <div className="inline-empty">
      <span>✓</span>
      <p><b>Nada que corregir</b><small>Cuando el sueño, la agenda o las rachas se crucen mal, te aviso acá.</small></p>
    </div>}
  </article>;
  const streakProgress = restoreProgressFromStreak(engagement?.currentStreak ?? 0);
  const streakWidget = engagement && <div className="app-streak-wrap">
    <button type="button" className="app-streak-chip" onClick={() => setStreakInfoOpen((open) => !open)} aria-label={`Racha de ${engagement.currentStreak} ${engagement.currentStreak === 1 ? "día" : "días"}`} aria-expanded={streakInfoOpen} aria-controls="app-streak-details">
      <StreakFlameIcon className="app-streak-flame" />
      <b>{engagement.currentStreak}</b>
    </button>
    {streakActionError && <div className="streak-request-error" role="status">
      <span>{streakActionError}</span>
      <button type="button" onClick={() => { engagementVisitRef.current = today; void runStreakAction("visit").catch((caught) => setStreakActionError(caught instanceof Error ? caught.message : "No pudimos cargar tu racha.")); }}>Reintentar</button>
    </div>}
    {streakInfoOpen && <article className="app-streak-details" id="app-streak-details" aria-label="Información de racha">
      <button type="button" className="app-streak-details-close" onClick={() => setStreakInfoOpen(false)} aria-label="Cerrar información de racha">×</button>
      <p className="streak-details-eyebrow">CONSTANCIA</p>
      <h2>Racha</h2>
      <p>Llevas {pluralize(engagement.currentStreak, "día seguido", "días seguidos")} usando la app.</p>
      <div className="streak-progress-row">
        <div className="streak-progress-gaps" role="img" aria-label={`${streakProgress} de 7 días para el próximo restablecedor`}>
          {Array.from({ length: 7 }, (_, index) => <i className={index < streakProgress ? "filled" : ""} key={index} />)}
        </div>
        <span className="streak-restores" title="Restablecedores disponibles">↺ <b>{engagement.restoresAvailable}</b><small>/3</small></span>
      </div>
      <small className="streak-progress-caption">{engagement.restoresAvailable >= 3 ? "Máximo de restablecedores acumulados" : streakProgress === 7 ? "¡Completaste 7 días y ganaste un restablecedor!" : `${streakProgress} de 7 días para ganar un restablecedor`}</small>
    </article>}
  </div>;
  const quotePanel = <aside className="quote-strip">
    <span className="quote-mark" aria-hidden="true">“</span>
    <p>{quote.text}<span className="quote-mark" aria-hidden="true">”</span></p>
    <b>{quote.author}</b>
  </aside>;
  const homePage = section === "summary" && <>
        <NotificationSettings key={refreshVersion} isPro={data.profile.isPro} compact />
        {streakWidget}
        {quotePanel}
        <section className={"hero-row " + (loading ? "is-loading" : "")}>
          <div className="hero-primary-grid">{compactScoreCard}{compactVoiceButton}</div>
          <div className="hero-metrics-head"><small>{balanced ? "Tus seis áreas pesan igual" : `Según tu${topPriorities.length > 1 ? "s" : ""} prioridad${topPriorities.length > 1 ? "es" : ""} del mes: ${listPhrase(priorityNames)}`}</small><button type="button" onClick={() => openSection("score")}>Ajustar →</button></div>
          <div className="hero-metrics" data-tiles={heroMetrics.length} data-tour="metrics">
            {heroMetrics.map((metric) => <button
              type="button"
              className="stat-tile"
              key={metric.label}
              onClick={() => openArea(metric.area)}
            >
              <span className={"stat-icon " + metric.tone}>{metric.icon}</span>
              <p>{metric.label}</p>
              <b>{metric.value}<small> {metric.unit}</small></b>
              <span className="stat-caption">{metric.caption}</span>
            </button>)}
          </div>
        </section>
        <section className="plan-grid">
          {dayPlanPanel}
          {isPro ? insightsPanel : <LockedFeature
            title="Recomendaciones del día"
            note="La app cruza tu sueño, tu agenda y tus rachas para decirte qué mover y a qué hora."
            onOpen={openPro}
          >{insightsPanel}</LockedFeature>}
        </section>
      </>;

  return homePage;
}
