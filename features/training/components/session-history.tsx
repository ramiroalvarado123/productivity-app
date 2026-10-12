"use client";
import { describeExercise } from "@/features/training/logic/exercise-history";
import type { SessionHistoryItem } from "@/features/training/logic/exercise-history";
import { formatDate } from "@/domain/dates";
import { useState } from "react";

const PAGE_SIZE = 6;

/**
 * Sesiones anteriores de gimnasio con su detalle (ejercicio, kg, series×reps).
 * Cada una se abre/cierra en el lugar; "Ver en la planilla" salta a ese día.
 */
export function SessionHistory({ sessions, selectedDate, today, onOpenDate }: {
  sessions: SessionHistoryItem[];
  selectedDate: string;
  today: string;
  onOpenDate: (date: string) => void;
}) {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [openLogId, setOpenLogId] = useState<number | null>(null);
  return <article className="panel session-history">
    <div className="panel-heading small"><div><p>HISTORIAL</p><h2>Sesiones anteriores</h2></div><span className="week-pill">{sessions.length} {sessions.length === 1 ? "sesión" : "sesiones"}</span></div>
    {sessions.length === 0 ? <p className="session-history-empty">Cuando guardes una sesión con ejercicios, la vas a encontrar acá con todo su detalle.</p> : <div className="session-history-list">
      {sessions.slice(0, visible).map((session) => {
        const open = openLogId === session.logId;
        return <div className={"session-history-item" + (open ? " open" : "")} key={session.logId}>
          <button type="button" className="session-history-head" aria-expanded={open} onClick={() => setOpenLogId(open ? null : session.logId)}>
            <b>{session.date === today ? "Hoy" : formatDate(session.date)}</b>
            <small>{session.exercises.length} {session.exercises.length === 1 ? "ejercicio" : "ejercicios"}</small>
            <span aria-hidden="true">{open ? "−" : "+"}</span>
          </button>
          {open && <div className="session-history-body">
            <ul>{session.exercises.map((item) => <li key={item.id}><span>{item.exercise}{item.isRecord && <i title="Récord personal"> 🏆</i>}</span><em>{describeExercise(item)}</em></li>)}</ul>
            {session.date !== selectedDate && <button type="button" className="session-history-open" onClick={() => onOpenDate(session.date)}>Ver en la planilla</button>}
          </div>}
        </div>;
      })}
      {sessions.length > visible && <button type="button" className="session-history-more" onClick={() => setVisible((current) => current + PAGE_SIZE)}>Ver más</button>}
    </div>}
  </article>;
}
