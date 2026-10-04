"use client";

import type { WeeklySummary } from "./lib/weekly-summary";

export type InboxItem =
  | { id: string; kind: "weekly_summary"; date: string; title: string; body: string; unread: boolean; weekStart: string }
  | { id: string; kind: "friend_invite"; date: string; title: string; body: string; unread: true; code: string }
  | { id: string; kind: "group_invite"; date: string; title: string; body: string; unread: true; inviteId: number };

function relativeDate(date: string, today: string) {
  const days = Math.round((new Date(`${today}T12:00:00Z`).getTime() - new Date(`${date.slice(0, 10)}T12:00:00Z`).getTime()) / 86_400_000);
  if (days <= 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 7) return `Hace ${days} días`;
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" }).format(new Date(`${date.slice(0, 10)}T12:00:00`)).replace(".", "");
}

/** Bandeja de la cuenta: resúmenes semanales e invitaciones, todo en un lugar. */
export function NotificationsDialog({ items, today, busy, onClose, onOpenSummary, onFriendInvite, onGroupInvite, onMarkAllRead }: {
  items: InboxItem[];
  today: string;
  busy: boolean;
  onClose: () => void;
  onOpenSummary: (weekStart: string) => void;
  onFriendInvite: (code: string, accept: boolean) => void;
  onGroupInvite: (inviteId: number, accept: boolean) => void;
  onMarkAllRead: () => void;
}) {
  const unread = items.filter((item) => item.unread).length;
  const hasUnreadSummaries = items.some((item) => item.kind === "weekly_summary" && item.unread);
  return <div className="insignias-overlay inbox-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="insignias-dialog inbox-dialog" role="dialog" aria-modal="true" aria-labelledby="inbox-title">
      <button type="button" className="insignias-close" onClick={onClose} aria-label="Cerrar notificaciones">×</button>
      <p className="insignias-eyebrow">TU CUENTA</p>
      <h2 id="inbox-title">Notificaciones</h2>
      <div className="inbox-toolbar">
        <p className="insignias-intro">{unread ? `${unread} sin leer` : "Estás al día."}</p>
        {hasUnreadSummaries && <button type="button" onClick={onMarkAllRead} disabled={busy}>Marcar todo como leído</button>}
      </div>
      {items.length ? <ul className="inbox-list">{items.map((item) => <li key={item.id} className={"inbox-item " + item.kind + (item.unread ? " unread" : "")}>
        <span className="inbox-icon" aria-hidden="true">{item.kind === "weekly_summary" ? "▤" : item.kind === "friend_invite" ? "＋" : "◎"}</span>
        <div className="inbox-copy">
          <small>{item.kind === "weekly_summary" ? "RESUMEN SEMANAL" : item.kind === "friend_invite" ? "SOLICITUD DE AMISTAD" : "INVITACIÓN A UN GRUPO"} · {relativeDate(item.date, today)}</small>
          <b>{item.title}</b>
          <p>{item.body}</p>
          {item.kind === "weekly_summary" && <div className="inbox-actions"><button type="button" className="primary" onClick={() => onOpenSummary(item.weekStart)}>Ver resumen</button></div>}
          {item.kind === "friend_invite" && <div className="inbox-actions">
            <button type="button" className="primary" disabled={busy} onClick={() => onFriendInvite(item.code, true)}>Aceptar</button>
            <button type="button" disabled={busy} onClick={() => onFriendInvite(item.code, false)}>Rechazar</button>
          </div>}
          {item.kind === "group_invite" && <div className="inbox-actions">
            <button type="button" className="primary" disabled={busy} onClick={() => onGroupInvite(item.inviteId, true)}>Entrar</button>
            <button type="button" disabled={busy} onClick={() => onGroupInvite(item.inviteId, false)}>Rechazar</button>
          </div>}
        </div>
        {item.unread && <i className="inbox-dot" aria-label="Sin leer" />}
      </li>)}</ul> : <div className="inbox-empty"><span aria-hidden="true">◌</span><b>No tenés notificaciones</b><p>Acá van a aparecer tus resúmenes semanales y las solicitudes de amistad y de grupos.</p></div>}
    </section>
  </div>;
}

/** El resumen de la semana, área por área. */
export function WeeklySummaryDialog({ summary, fresh, onClose, onOpenArea }: {
  summary: WeeklySummary;
  /** Recién terminado: se muestra como aviso al abrir la app. */
  fresh: boolean;
  onClose: () => void;
  onOpenArea: (area: WeeklySummary["areas"][number]["key"]) => void;
}) {
  const delta = summary.previousAverageScore ? summary.averageScore - summary.previousAverageScore : 0;
  const active = summary.areas.filter((area) => !area.empty);
  const quiet = summary.areas.filter((area) => area.empty);
  return <div className="insignias-overlay summary-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="insignias-dialog summary-dialog" role="dialog" aria-modal="true" aria-labelledby="summary-title">
      <button type="button" className="insignias-close" onClick={onClose} aria-label="Cerrar resumen">×</button>
      <p className="insignias-eyebrow">{fresh ? "TU RESUMEN SEMANAL ESTÁ LISTO" : "RESUMEN SEMANAL"} · {summary.label.toUpperCase()}</p>
      <h2 id="summary-title">{summary.headline}</h2>
      <div className="summary-hero">
        <div className="summary-score">
          <span>DAILY SCORE PROMEDIO</span>
          <b>{summary.averageScore}<small>/100</small></b>
          {delta !== 0 && <em className={delta > 0 ? "up" : "down"}>{delta > 0 ? "▲" : "▼"} {Math.abs(delta)} vs. semana anterior</em>}
        </div>
        <div className="summary-bars" aria-label="Daily Score por día">
          {summary.days.map((day) => <div key={day.date} className={summary.bestDay?.date === day.date ? "best" : ""}>
            <span><i style={{ height: `${Math.max(4, day.score)}%` }} /></span>
            <small>{["D", "L", "M", "M", "J", "V", "S"][new Date(`${day.date}T12:00:00Z`).getUTCDay()]}</small>
          </div>)}
        </div>
        <p className="summary-active">{summary.activeDays}/7 días con registros</p>
      </div>
      {summary.highlights.length > 0 && <ul className="summary-highlights">{summary.highlights.map((item) => <li key={item}>{item}</li>)}</ul>}
      <div className="summary-areas">{active.map((area) => <article key={area.key} className={"summary-area " + area.key}>
        <header><span aria-hidden="true">{area.icon}</span><div><small>{area.title.toUpperCase()}</small><b>{area.headline}</b></div></header>
        <dl>{area.stats.map((stat) => <div key={stat.label}><dt>{stat.label}</dt><dd>{stat.value}{stat.hint && <small>{stat.hint}</small>}</dd></div>)}</dl>
        {area.details.length > 0 && <ul>{area.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>}
        <button type="button" onClick={() => onOpenArea(area.key)}>Ver {area.title.toLowerCase()} →</button>
      </article>)}</div>
      {quiet.length > 0 && <p className="summary-quiet">Sin registros esta semana: {quiet.map((area) => area.title.toLowerCase()).join(", ")}.</p>}
      <button type="button" className="summary-done" onClick={onClose}>Listo</button>
    </section>
  </div>;
}
