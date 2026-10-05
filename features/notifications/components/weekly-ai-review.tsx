"use client";

import { useEffect, useState } from "react";
import type { WeeklyAiMetrics, WeeklyAiReviewOutput } from "@/features/notifications/logic/weekly-ai-context";

type ReviewPayload = {
  status?: string;
  code?: string;
  review?: { result: WeeklyAiReviewOutput; metrics: WeeklyAiMetrics; weekStart: string; weekEnd: string; contextUsed?: boolean } | null;
  error?: string;
};

function formatDay(date: string) {
  return new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "numeric", month: "short" })
    .format(new Date(date + "T12:00:00"))
    .replace(".", "");
}

export function WeeklyAiReview({ weekStart }: { weekStart: string }) {
  const [review, setReview] = useState<ReviewPayload["review"]>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [setupPending, setSetupPending] = useState(false);
  const [retry, setRetry] = useState(0);
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [contextUsed, setContextUsed] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [replyBusy, setReplyBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const pause = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

    async function requestReview() {
      try {
        const url = "/api/weekly-ai?weekStart=" + encodeURIComponent(weekStart);
        const current = await fetch(url, { credentials: "same-origin", cache: "no-store" });
        const currentBody = await current.json() as ReviewPayload;
        if (!current.ok) {
          if (currentBody.code === "weekly_ai_migration_required") {
            if (active) { setSetupPending(true); setError(currentBody.error || "La revisión con IA todavía no está disponible."); }
            return;
          }
          throw new Error(currentBody.error || "No pudimos cargar la revisión.");
        }
        if (currentBody.review) {
          if (active) setReview(currentBody.review);
          if (active) setContextUsed(Boolean(currentBody.review.contextUsed));
          return;
        }
        if (currentBody.status !== "ready") {
          const generated = await fetch("/api/weekly-ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ action: "generate", weekStart }),
          });
          const generatedBody = await generated.json() as ReviewPayload;
          if (generatedBody.code === "weekly_ai_migration_required") {
            if (active) { setSetupPending(true); setError(generatedBody.error || "La revisión con IA todavía no está disponible."); }
            return;
          }
          if (!generated.ok && generated.status !== 202) throw new Error(generatedBody.error || "No pudimos generar la revisión.");
          if (generatedBody.review) {
            if (active) setReview(generatedBody.review);
            if (active) setContextUsed(Boolean(generatedBody.review.contextUsed));
            return;
          }
        }

        for (let attempt = 0; attempt < 24 && active; attempt += 1) {
          await pause(2000);
          const response = await fetch(url, { credentials: "same-origin", cache: "no-store" });
          const body = await response.json() as ReviewPayload;
          if (!response.ok) throw new Error(body.error || "No pudimos cargar la revisión.");
          if (body.review) {
            if (active) setReview(body.review);
            if (active) setContextUsed(Boolean(body.review.contextUsed));
            return;
          }
          if (body.status === "failed") throw new Error("No pudimos generar la revisión. Probá de nuevo.");
        }
        if (active) setError("La revisión está tardando más de lo esperado.");
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "No pudimos generar la revisión.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void requestReview();
    return () => { active = false; };
  }, [weekStart, retry]);

  async function sendContext() {
    const value = message.trim();
    if (!value || replyBusy) return;
    setReplyBusy(true);
    setReplyError("");
    setReply("");
    try {
      const response = await fetch("/api/weekly-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action: "respond", weekStart, message: value }),
      });
      const body = await response.json() as { reply?: string; error?: string };
      if (!response.ok) throw new Error(body.error || "AVORA no pudo responder ahora.");
      setReply(body.reply || "");
      setMessage("");
      setContextUsed(true);
    } catch (caught) {
      setReplyError(caught instanceof Error ? caught.message : "AVORA no pudo responder ahora.");
    } finally {
      setReplyBusy(false);
    }
  }

  const result = review?.result;
  const metrics = review?.metrics;
  return <article className="panel weekly-ai-review">
    <div className="weekly-ai-review-heading">
      <div>
        <p>AVORA · REVISIÓN CON IA</p>
        <h2>Tu semana</h2>
        <small>{metrics ? metrics.label : "Resumen de tu progreso"}</small>
      </div>
      {metrics && <div className="weekly-ai-score">
        <b>{metrics.averageScore}<small>/100</small></b>
        <span>Daily Score promedio</span>
      </div>}
    </div>

    {loading && <div className="weekly-ai-loading" role="status" aria-live="polite">
      <span className="weekly-ai-loader" aria-hidden="true" />
      <p>Preparando la revisión de tu semana…</p>
    </div>}
    {!loading && error && <div className={"weekly-ai-error" + (setupPending ? " weekly-ai-unavailable" : "")} role="alert">
      <p>{error}</p>
      {!setupPending && <button type="button" onClick={() => { setLoading(true); setError(""); setRetry((value) => value + 1); }}>Intentar de nuevo</button>}
    </div>}

    {!loading && result && metrics && <div className="weekly-ai-content">
      <section className="weekly-ai-lead">
        <p>{result.summary}</p>
        <div className="weekly-ai-week-facts">
          <span>{metrics.activeDays}/7 días con actividad</span>
          <span>{metrics.usageStreak.currentStreak} días de racha</span>
          {metrics.bestDay && <span>Mejor día: {formatDay(metrics.bestDay.date)}</span>}
        </div>
      </section>

      <div className="weekly-ai-card-grid">
        <section className="weekly-ai-card wins">
          <p>LO MEJOR</p>
          {result.wins.length ? <ul>{result.wins.map((item, index) => <li key={index}>{item}</li>)}</ul> : <span>Esta semana quedó registrada. Todavía no hay un logro destacado para señalar.</span>}
        </section>
        <section className="weekly-ai-card improve">
          <p>PARA MEJORAR</p>
          {result.improvements.length ? <ul>{result.improvements.map((item, index) => <li key={index}>{item}</li>)}</ul> : <span>AVORA no encontró una mejora concreta respaldada por estos datos.</span>}
        </section>
        <section className="weekly-ai-card comparison">
          <p>COMPARACIÓN</p>
          <span>{result.comparison}</span>
          {metrics.scoreChange !== null && <b className={metrics.scoreChange > 0 ? "positive" : metrics.scoreChange < 0 ? "negative" : ""}>
            {metrics.scoreChange > 0 ? "+" : ""}{metrics.scoreChange} puntos de Daily Score
          </b>}
        </section>
        <section className="weekly-ai-card priorities">
          <p>TUS PRIORIDADES</p>
          {result.priorityInsights.length
            ? <ul>{result.priorityInsights.map((item, index) => <li key={index}>{item}</li>)}</ul>
            : <span>Esta semana no hay señales suficientes para comparar tus prioridades con la actividad.</span>}
        </section>
      </div>

      <section className="weekly-ai-upcoming">
        <div><p>PRÓXIMAMENTE</p><small>Lo que ya anotaste en tu plan</small></div>
        {metrics.upcoming.length
          ? <ul>{metrics.upcoming.map((item, index) => <li key={item.kind + item.date + item.title + index}>
            <span className="weekly-ai-upcoming-date">{formatDay(item.date)}{item.time ? " · " + item.time : ""}</span>
            <b>{item.title}</b>
            <small>{item.kind} · {item.category}</small>
          </li>)}</ul>
          : <span className="weekly-ai-empty">No tenés tareas o eventos próximos anotados.</span>}
      </section>

      {metrics.evidenceWeeks >= 4 && result.detections.length > 0 && <section className="weekly-ai-detections">
        <p>AVORA DETECTÓ</p>
        <ul>{result.detections.map((item, index) => <li key={index}>{item}</li>)}</ul>
      </section>}

      <section className="weekly-ai-context">
        <div><p>Escribile algo a AVORA…</p><small>{contextUsed ? "Ya usaste la consulta de esta semana. La próxima revisión abre un nuevo contexto." : "Te responde una vez usando esta semana y lo que ya le contaste."}</small></div>
        <textarea value={message} maxLength={400} disabled={contextUsed} onChange={(event) => setMessage(event.target.value)} placeholder={contextUsed ? "Consulta semanal utilizada" : "Por ejemplo: el martes tuve menos tiempo por un examen."} />
        <div className="weekly-ai-context-actions">
          <small>{message.length}/400</small>
          <button type="button" disabled={contextUsed || replyBusy || message.trim().length < 2} onClick={() => void sendContext()}>{replyBusy ? "Pensando…" : contextUsed ? "Listo" : "Enviar"}</button>
        </div>
        {replyError && <p className="weekly-ai-context-error" role="alert">{replyError}</p>}
        {reply && <p className="weekly-ai-reply"><b>AVORA</b>{reply}</p>}
      </section>

      <details className="weekly-ai-data">
        <summary>Ver datos de esta semana</summary>
        <div className="weekly-ai-area-grid">{metrics.areas.map((area) => <article key={area.key}>
          <b>{area.title}</b>
          <span>{area.headline}</span>
          {area.stats.slice(0, 3).map((stat) => <small key={stat.label}>{stat.label}: {stat.value}</small>)}
        </article>)}</div>
      </details>
    </div>}
  </article>;
}
