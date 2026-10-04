"use client";
import type { CSSProperties } from "react";
import { STAT_MONTH_NAMES, STAT_WEEKDAY_NAMES, statsWindowFor } from "@/features/stats/logic/stats-window";
import type { StatsPeriod } from "@/shared/data/types";
import type { StatsWindow } from "@/features/stats/logic/stats-window";
import type { Trend } from "@/domain/streaks";
import { averageNumbers, formatFocusHours } from "@/shared/lib/numbers";
import { countActiveDays, dateMinus, datePlus, datesBetween, dayDistance, formatDate, lastDayOfMonth, shiftMonthStart, weekFor } from "@/domain/dates";
import { countdownLabelCapitalized, formatMinutes, listPhrase } from "@/shared/lib/format";
import { dayBlocks } from "@/domain/schedule";
import { isReviewDay, weeklyReview } from "@/features/home/logic/review";
import { scoreLabel } from "@/domain/score";
import { sparklinePath, trendFor } from "@/domain/streaks";
import { useId, useState } from "react";
import { useWorkspace } from "@/features/app-shell/workspace";

/** Progreso: Daily Score por período, rachas, tendencias y totales. */
export function StatsSection() {
  const {
    today,
    data,
    saving,
    trainingWeeklyTarget,
    save,
    effectiveTrainingLogs,
    completedTrainingTasksByDate,
    trainingByDate,
    focusByDate,
    readingByDate,
    caloriesByDay,
    mealCountByDate,
    sleepMinutesByDate,
    score,
    scoreForDate,
    scheduleInput,
    streaks,
    activeCategories,
    openSection,
  } = useWorkspace();
  const [statsPeriod, setStatsPeriod] = useState<StatsPeriod>("weekly");
  const [statsOffset, setStatsOffset] = useState(0);
  const [selectedScorePointKey, setSelectedScorePointKey] = useState<string | null>(null);

  // El corte semanal sólo se arma el domingo: el resto de la semana no hay nada
  // cerrado que mirar y ocuparía lugar por nada.
  const review = isReviewDay(today) ? weeklyReview({
    days: Array.from({ length: 7 }, (_, index) => {
      const date = dateMinus(today, 6 - index);
      return { date, blocks: dayBlocks(scheduleInput, date), score: scoreForDate(date) };
    }),
    areas: [
      { label: "Entrenamiento", activeDays: countActiveDays(trainingByDate, today) },
      { label: "Foco", activeDays: countActiveDays(focusByDate, today) },
      { label: "Lectura", activeDays: countActiveDays(readingByDate, today) },
      { label: "Alimentación", activeDays: countActiveDays(mealCountByDate, today) },
      { label: "Sueño", activeDays: countActiveDays(sleepMinutesByDate, today) },
    ],
    staleGoals: data.goals
      .filter((goal) => !goal.completedAt && !activeCategories.has(goal.category))
      .map((goal) => ({ id: goal.id, title: goal.title, days: dayDistance(today, goal.targetDate) })),
  }) : null;
  const weeklyReviewPanel = review && <article className="panel weekly-review">
    <div className="panel-heading">
      <div><p>DOMINGO</p><h2>Tu semana</h2></div>
      <span className="week-pill">Promedio {review.averageScore}/100</span>
    </div>
    <div className="review-stats">
      <div><b>{review.blocksTotal ? `${review.blocksDone} de ${review.blocksTotal}` : "—"}</b><small>{review.blocksTotal ? `bloques cumplidos · ${review.completionPercent} %` : "no agendaste bloques"}</small></div>
      <div><b>{review.bestDay ? formatDate(review.bestDay.date) : "—"}</b><small>{review.bestDay ? `tu mejor día · ${review.bestDay.score}/100` : "sin registros esta semana"}</small></div>
      <div><b>{review.quietAreas.length ? listPhrase(review.quietAreas) : "Ninguna"}</b><small>{review.quietAreas.length ? "sin registros en toda la semana" : "todas las áreas tuvieron movimiento"}</small></div>
    </div>
    {review.staleGoals.length > 0 && <div className="review-goals">
      <p>OBJETIVOS SIN MOVIMIENTO</p>
      {review.staleGoals.map((goal) => <div key={goal.id}>
        <p><b>{goal.title}</b><small>{countdownLabelCapitalized(goal.days)} · sin actividad en su área</small></p>
        <button disabled={saving} onClick={() => void save({ action: "toggle_goal", id: goal.id, completed: true })}>Cerrarlo</button>
        <button className="ghost" disabled={saving} onClick={() => openSection("plan")}>Sigue en pie</button>
      </div>)}
    </div>}
  </article>;
  const statsWindow = statsWindowFor(statsPeriod, statsOffset, today);
  const statsStart = statsWindow.start;
  const statsEnd = statsWindow.end;
  const periodDays = Math.max(1, datesBetween(statsStart, statsEnd).length);
  const periodTraining = effectiveTrainingLogs.filter((item) => item.trainingDate >= statsStart && item.trainingDate <= statsEnd);
  const periodFocusEntries = Object.entries(focusByDate).filter(([date, minutes]) => date >= statsStart && date <= statsEnd && minutes > 0);
  const periodFocusMinutes = periodFocusEntries.reduce((sum, [, minutes]) => sum + minutes, 0);
  const periodTaskTrainingCount = Object.entries(completedTrainingTasksByDate)
    .filter(([date]) => date >= statsStart && date <= statsEnd)
    .reduce((sum, [, count]) => sum + count, 0);
  const periodSleep = data.dailyCheckins.filter((item) => item.entryDate >= statsStart && item.entryDate <= statsEnd && item.sleepMinutes > 0);
  const periodReading = data.readingHistory.filter((item) => item.logDate >= statsStart && item.logDate <= statsEnd);
  const periodMeals = data.mealHistory.filter((item) => item.mealDate >= statsStart && item.mealDate <= statsEnd);
  // Las tarjetas secundarias siguen mostrando tendencias diarias, pero respetan
  // el período elegido en vez de quedar clavadas en "los últimos días".
  const trendSpan = periodDays;
  const trends: Array<{ key: string; icon: string; label: string; trend: Trend; format: (value: number) => string; caption: string; useAverage?: boolean }> = [
    { key: "training", icon: "↗", label: "Entrenamientos", trend: trendFor(trendSpan, statsEnd, (date) => trainingByDate[date] ?? 0), format: (value) => String(Math.round(value)), caption: "sesiones registradas" },
    { key: "focus", icon: "⌁", label: "Foco profundo", trend: trendFor(trendSpan, statsEnd, (date) => focusByDate[date] ?? 0), format: (value) => formatFocusHours(value), caption: "tiempo de trabajo concentrado" },
    { key: "sleep", icon: "☾", label: "Sueño", trend: trendFor(trendSpan, statsEnd, (date) => sleepMinutesByDate[date] ?? 0), format: (value) => formatMinutes(value), caption: "promedio dormido por día", useAverage: true },
    { key: "reading", icon: "▱", label: "Lectura", trend: trendFor(trendSpan, statsEnd, (date) => readingByDate[date] ?? 0), format: (value) => `${Math.round(value)} pág.`, caption: "páginas leídas" },
    { key: "nutrition", icon: "◇", label: "Calorías", trend: trendFor(trendSpan, statsEnd, (date) => caloriesByDay[date] ?? 0), format: (value) => `${Math.round(value).toLocaleString("es-AR")} kcal`, caption: "promedio diario", useAverage: true },
  ];
  // El Daily Score se agrupa según la escala elegida: días en la semana,
  // semanas dentro del mes y meses dentro del año.
  const scoreBucketsFor = (window: StatsWindow) => {
    if (statsPeriod === "weekly") {
      return weekFor(window.start).map((day, index) => ({ key: day.iso, date: day.iso, label: STAT_WEEKDAY_NAMES[index], value: scoreForDate(day.iso) }));
    }
    if (statsPeriod === "monthly") {
      const totalDays = datesBetween(window.start, window.end).length;
      return Array.from({ length: Math.ceil(totalDays / 7) }, (_, index) => {
        const start = datePlus(window.start, index * 7);
        const end = datePlus(start, Math.min(6, totalDays - index * 7 - 1));
        return { key: start, date: start, label: "Semana " + (index + 1), value: Math.round(averageNumbers(datesBetween(start, end).map(scoreForDate))) };
      });
    }
    return Array.from({ length: 12 }, (_, index) => {
      const start = shiftMonthStart(window.start, index);
      const end = lastDayOfMonth(start);
      return { key: start, date: start, label: STAT_MONTH_NAMES[index], value: Math.round(averageNumbers(datesBetween(start, end).map(scoreForDate))) };
    });
  };
  const scoreTrendPoints = scoreBucketsFor(statsWindow);
  const scoreAverage = Math.round(averageNumbers(scoreTrendPoints.map((point) => point.value)));
  // Geometría del gráfico de líneas del Daily Score.
  const scoreGradientId = useId();
  const scoreChartWidth = 600;
  const scoreChartHeight = 130;
  const scoreYFor = (value: number) => scoreChartHeight - (Math.max(0, Math.min(100, value)) / 100) * scoreChartHeight;
  const scoreChartPoints = scoreTrendPoints.map((point, index) => ({
    ...point,
    x: scoreTrendPoints.length > 1 ? (index / (scoreTrendPoints.length - 1)) * scoreChartWidth : scoreChartWidth / 2,
    y: scoreYFor(point.value),
  }));
  const scoreLinePath = scoreChartPoints.map((point, index) => (index === 0 ? "M" : "L") + point.x.toFixed(1) + "," + point.y.toFixed(1)).join(" ");
  const scoreAreaPath = scoreChartPoints.length
    ? scoreLinePath + " L" + scoreChartPoints[scoreChartPoints.length - 1].x.toFixed(1) + "," + scoreChartHeight + " L" + scoreChartPoints[0].x.toFixed(1) + "," + scoreChartHeight + " Z"
    : "";
  const scoreAverageY = scoreYFor(scoreAverage);
  const streakCards: Array<{ key: string; icon: string; label: string; streak: typeof streaks.training; unitSingular: string; unitPlural: string; pendingLabel: string; warningLabel: string }> = [
    { key: "training", icon: "↗", label: "Entrenamiento", streak: streaks.training, unitSingular: "semana", unitPlural: "semanas", pendingLabel: "Esta semana todavía no", warningLabel: `Sumá ${trainingWeeklyTarget} entrenamientos esta semana para no cortarla` },
    { key: "focus", icon: "⌁", label: "Foco", streak: streaks.focus, unitSingular: "día", unitPlural: "días", pendingLabel: "Hoy todavía no", warningLabel: "Registrá un día con foco hoy para no cortarla" },
    { key: "reading", icon: "▱", label: "Lectura", streak: streaks.reading, unitSingular: "día", unitPlural: "días", pendingLabel: "Hoy todavía no", warningLabel: "Registrá un día leyendo hoy para no cortarla" },
    { key: "sleep", icon: "☾", label: "Sueño de 7 h+", streak: streaks.sleep, unitSingular: "día", unitPlural: "días", pendingLabel: "Hoy todavía no", warningLabel: "Registrá una noche completa hoy para no cortarla" },
    { key: "logging", icon: "✎", label: "Registro diario", streak: streaks.logging, unitSingular: "día", unitPlural: "días", pendingLabel: "Hoy todavía no", warningLabel: "Registrá un día hoy para no cortarla" },
  ];
  const statsPanel = <section className="module-stack">
    {weeklyReviewPanel}
    <div className="stats-controls">
      <div className="period-switch">{(["weekly", "monthly", "annual"] as StatsPeriod[]).map((period) => <button className={statsPeriod === period ? "active" : ""} key={period} onClick={() => { setStatsPeriod(period); setStatsOffset(0); setSelectedScorePointKey(null); }}>{period === "weekly" ? "Semanal" : period === "monthly" ? "Mensual" : "Anual"}</button>)}</div>
      <label className="stats-range-picker"><span>Período</span><select value={String(statsOffset)} onChange={(event) => { setStatsOffset(Number(event.target.value)); setSelectedScorePointKey(null); }}>
        {(statsPeriod === "weekly"
          ? Array.from({ length: 13 }, (_, offset) => ({ value: offset, label: offset === 0 ? "Esta semana" : offset === 1 ? "Semana pasada" : "Hace " + offset + " semanas" }))
          : statsPeriod === "monthly"
            ? Array.from({ length: 13 }, (_, offset) => { const start = shiftMonthStart(today, -offset); return { value: offset, label: new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(new Date(start + "T12:00:00")) }; })
            : Array.from({ length: 6 }, (_, offset) => ({ value: offset, label: String(Number(today.slice(0, 4)) - offset) }))
        ).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select></label>
    </div>

    <article className="panel score-history-panel">
      <div className="panel-heading">
        <div><p>DAILY SCORE</p><h2>{statsPeriod === "weekly" ? "Semana" : statsPeriod === "monthly" ? "Mes" : "Año"}</h2></div>
        <button className="text-link" onClick={() => openSection("score")}>Cómo se calcula →</button>
      </div>
      <div className="score-history">
        <div className="score-history-now">
          <div className="score-ring small" style={{ "--score": String(score * 3.6) + "deg" } as CSSProperties}><div><b>{score}</b><small>/100</small></div></div>
          <p><b>Hoy</b><small>{scoreLabel(score)}</small></p>
        </div>
        <div className="score-history-chart">
          <svg
            className="score-line-chart"
            viewBox={`0 0 ${scoreChartWidth} ${scoreChartHeight}`}
            preserveAspectRatio="none"
            role="img"
            aria-label={"Daily Score " + (statsPeriod === "weekly" ? "semanal" : statsPeriod === "monthly" ? "mensual" : "anual") + ". Promedio " + scoreAverage + " de 100."}
          >
            <defs>
              <linearGradient id={scoreGradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--green)" stopOpacity="0.28" />
                <stop offset="100%" stopColor="var(--green)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <line className="score-average-line" x1="0" y1={scoreAverageY} x2={scoreChartWidth} y2={scoreAverageY} vectorEffect="non-scaling-stroke" />
            {scoreAreaPath && <path className="score-line-area" d={scoreAreaPath} fill={`url(#${scoreGradientId})`} />}
            <path className="score-line-path" d={scoreLinePath} fill="none" vectorEffect="non-scaling-stroke" />
            {scoreChartPoints.map((point) => <g key={point.key}>
              <circle
                className="score-line-hit-area"
                cx={point.x}
                cy={point.y}
                r={12}
                role="button"
                tabIndex={0}
                aria-label={point.label + ": " + point.value + "/100" + (statsPeriod === "weekly" ? "" : " promedio")}
                onClick={() => setSelectedScorePointKey(point.key)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedScorePointKey(point.key);
                  }
                }}
              />
              <circle
                className={"score-line-dot " + (point.date === today ? "today" : "")}
                cx={point.x}
                cy={point.y}
                r={point.date === today ? 5 : 3.4}
                vectorEffect="non-scaling-stroke"
              >
                <title>{point.label + " · " + point.value + "/100"}</title>
              </circle>
              {selectedScorePointKey === point.key && <g
                className="score-point-tooltip"
                transform={"translate(" + Math.max(38, Math.min(scoreChartWidth - 38, point.x)) + "," + Math.max(24, point.y - 18) + ")"}
              >
                <rect x="-38" y="-21" width="76" height="19" rx="6" />
                <text x="0" y="-8" textAnchor="middle">{point.value + (statsPeriod === "weekly" ? "/100" : " prom.")}</text>
              </g>}
            </g>)}
          </svg>

          <div className="score-point-labels" style={{ "--score-points": scoreChartPoints.length } as CSSProperties} aria-label="Períodos del Daily Score">
            {scoreChartPoints.map((point) => <small key={point.key}>{point.label}</small>)}
          </div>

        </div>
      </div>
      <p className="formula-note">Cada barra se reconstruye con lo que registraste ese día y las prioridades de ese mes. Si corregís ayer, su puntaje sube o baja automáticamente sin cambiar el de hoy.</p>
    </article>

    <article className="panel streaks-panel">
      <div className="panel-heading"><div><p>CONSTANCIA</p><h2>Tus rachas</h2></div><span className="week-pill">{streakCards.filter((card) => card.streak.current > 0).length} activas</span></div>
      <div className="streak-grid">{streakCards.map((card) => <article key={card.key} className={"streak-card " + (card.streak.current > 0 ? "alive" : "cold")}>
        <span className="streak-icon">{card.icon}</span>
        <b className="streak-count">{card.streak.current}<small>{" " + (card.streak.current === 1 ? card.unitSingular : card.unitPlural)}</small></b>
        <p>{card.label}</p>
        <small>{card.streak.pendingToday ? card.pendingLabel : card.streak.best > card.streak.current ? `Récord: ${card.streak.best}` : card.streak.current > 0 ? "Tu mejor marca" : "Sin racha activa"}</small>
        {card.streak.pendingToday && <i className="streak-warning" title={card.warningLabel} />}
      </article>)}</div>
    </article>

    <article className="panel trend-rows-panel">
      <div className="panel-heading"><div><p>TENDENCIA</p><h2>{statsPeriod === "weekly" ? "Últimos 7 días" : statsPeriod === "monthly" ? "Últimos 30 días" : "Últimos 6 meses"}</h2></div><small className="trend-note">Comparado con el período anterior</small></div>
      <div className="trend-rows">{trends.map((row) => {
        const delta = row.trend.deltaPercent;
        const direction = delta === null ? "flat" : delta > 4 ? "up" : delta < -4 ? "down" : "flat";
        return <div className="trend-row" key={row.key}>
          <span className={"trend-icon " + row.key}>{row.icon}</span>
          <div className="trend-label"><b>{row.label}</b><small>{row.caption}</small></div>
          <svg className="sparkline" viewBox="0 0 120 32" preserveAspectRatio="none" aria-hidden="true">
            <path d={sparklinePath(row.trend.points, 120, 28)} fill="none" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="trend-values">
            <b>{row.format(row.useAverage ? row.trend.average : row.trend.total)}</b>
            <small className={"trend-delta " + direction}>{delta === null ? "sin base previa" : `${delta > 0 ? "+" : ""}${delta} %`}</small>
          </div>
        </div>;
      })}</div>
    </article>

    <div className="metrics-grid">
      <article><span>↗</span><p>ENTRENAMIENTOS<b>{periodTraining.length + periodTaskTrainingCount}</b><small>{(periodTraining.reduce((sum, item) => sum + item.distanceMeters, 0) / 1000).toFixed(1)} km recorridos</small></p></article>
      <article><span>☾</span><p>SUEÑO PROMEDIO<b>{periodSleep.length ? (periodSleep.reduce((sum, item) => sum + item.sleepMinutes, 0) / periodSleep.length / 60).toFixed(1) : "0"} h</b><small>{periodSleep.length} noches registradas</small></p></article>
      <article><span>⌁</span><p>TRABAJO PROFUNDO<b>{(periodFocusMinutes / 60).toFixed(1)} h</b><small>{periodFocusEntries.length} días con foco</small></p></article>
      <article><span>▱</span><p>PÁGINAS LEÍDAS<b>{periodReading.reduce((sum, item) => sum + item.pages, 0)}</b><small>{periodReading.reduce((sum, item) => sum + item.minutes, 0)} min de lectura</small></p></article>
      <article><span>◇</span><p>CALORÍAS REGISTRADAS<b>{periodMeals.reduce((sum, item) => sum + item.calories, 0).toLocaleString("es-AR")}</b><small>estimación del período</small></p></article>
    </div>
  </section>;

  return statsPanel;
}
