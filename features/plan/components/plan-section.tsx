"use client";
import type { Block } from "@/domain/schedule";
import type { CSSProperties } from "react";
import { DatePicker } from "@/shared/ui/date-picker";
import { Dropdown } from "@/shared/ui/dropdown";
import { EVENT_CATEGORY_OPTIONS, SLOT_CATEGORY_OPTIONS } from "@/features/plan/constants";
import { FULL_DAY_HOUR_OPTIONS, TimeFieldPicker } from "@/shared/ui/time-dropdown";
import { GoalsPanel } from "@/features/goals/components/goals-panel";
import { PLAN_AGENDA_HOURS, dayBlocks } from "@/domain/schedule";
import { SaveButtonContent } from "@/shared/ui/save-button";
import type { SlotCategory } from "@/shared/data/types";
import { clockFromMinutes, countdownLabelCapitalized } from "@/shared/lib/format";
import { dateMinus, dayDistance, formatDate, weekFor } from "@/domain/dates";
import { durationOptions, parseDecimalInput } from "@/shared/lib/numbers";
import { useMemo, useRef, useState } from "react";
import { useWorkspace } from "@/features/app-shell/workspace";

/** Plan: objetivos, agenda semanal por horas, calendario del mes y recordatorios. */
export function PlanSection() {
  const {
    today,
    data,
    saving,
    setError,
    agendaView,
    setAgendaView,
    nowMinutes,
    savePhase,
    save,
    scheduleInput,
    submitForm,
    toggleTask,
    toggleEvent,
    activeGoals,
  } = useWorkspace();
  const [calendarCursor, setCalendarCursor] = useState(today.slice(0, 7));
  const [weekAnchor, setWeekAnchor] = useState(today);
  const [slotDraft, setSlotDraft] = useState<{ date: string; startTime: string; editingBlock?: Block } | null>(null);
  const [blockMenu, setBlockMenu] = useState<{ block: Block; date: string } | null>(null);
  const agendaLongPressRef = useRef<number | null>(null);
  const suppressAgendaClickRef = useRef(false);
  const [slotCategory, setSlotCategory] = useState<SlotCategory>("focus");
  const [slotDuration, setSlotDuration] = useState("60");
  const [slotCustomHours, setSlotCustomHours] = useState("");

  const calendarStart = new Date(calendarCursor + "-01T12:00:00");
  const calendarMonthName = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(calendarStart);
  const calendarOffset = (calendarStart.getDay() + 6) % 7;
  const calendarDays = new Date(calendarStart.getFullYear(), calendarStart.getMonth() + 1, 0).getDate();
  const shiftCalendar = (amount: number) => {
    const next = new Date(calendarStart);
    next.setMonth(next.getMonth() + amount);
    setCalendarCursor(next.toISOString().slice(0, 7));
  };
  const calendarItems = [
    ...data.events.map((item) => ({ key: "e" + item.id, date: item.eventDate, title: item.title, type: item.category, id: item.id, source: "event" })),
    ...data.tasks.filter((item) => item.dueDate).map((item) => ({ key: "t" + item.id, date: item.dueDate as string, title: item.title, type: "task", id: item.id, source: "task" })),
    ...activeGoals.map((item) => ({ key: "g" + item.id, date: item.targetDate, title: item.title, type: "goal", id: item.id, source: "goal" })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = calendarItems.filter((item) => item.date >= today).slice(0, 8);
  // ---------------------------------------------------------------------------
  // Agenda semanal por horas
  // ---------------------------------------------------------------------------
  const agendaWeek = useMemo(() => weekFor(weekAnchor), [weekAnchor]);
  const agendaBlocksByDay = useMemo(
    () => Object.fromEntries(agendaWeek.map((day) => [day.iso, dayBlocks(scheduleInput, day.iso)])) as Record<string, Block[]>,
    [agendaWeek, scheduleInput],
  );
  const agendaStartHour = PLAN_AGENDA_HOURS[0];
  // Fin exclusivo para que el bloque de las 23:00 siga siendo seleccionable.
  const agendaEndHour = PLAN_AGENDA_HOURS[PLAN_AGENDA_HOURS.length - 1] + 1;
  const agendaHours = PLAN_AGENDA_HOURS;
  const shiftWeek = (amount: number) => setWeekAnchor((current) => dateMinus(current, -amount * 7));
  const clearAgendaLongPress = () => {
    if (agendaLongPressRef.current !== null) {
      window.clearTimeout(agendaLongPressRef.current);
      agendaLongPressRef.current = null;
    }
  };
  const beginAgendaLongPress = (block: Block, date: string) => {
    clearAgendaLongPress();
    suppressAgendaClickRef.current = false;
    agendaLongPressRef.current = window.setTimeout(() => {
      suppressAgendaClickRef.current = true;
      setBlockMenu({ block, date });
    }, 550);
  };
  const openSlotDraft = (date: string, startTime: string, editingBlock?: Block) => {
    setSlotDraft({ date, startTime, editingBlock });
    setSlotCategory(editingBlock ? editingBlock.category as SlotCategory : "focus");
    setSlotDuration(String(editingBlock?.minutes ?? 60));
    setSlotCustomHours("");
  };
  const deleteAgendaBlock = (block: Block) => save(block.taskId
    ? { action: "delete_task", id: block.taskId }
    : { action: "delete_event", id: block.eventId }
  );
  const handleAgendaBlockClick = (block: Block) => {
    clearAgendaLongPress();
    if (suppressAgendaClickRef.current) {
      suppressAgendaClickRef.current = false;
      return;
    }
    if (block.taskId) void toggleTask(block.taskId, !block.done);
    else if (block.eventId) void toggleEvent(block.eventId, !block.done);
  };
  const slotUsesProject = Boolean(!slotDraft?.editingBlock?.eventId && (slotCategory === "focus" || slotCategory === "study" || slotCategory === "work"));
  const slotProjects = slotCategory === "study" ? data.focusProjects.filter((project) => project.kind === "study")
    : slotCategory === "work" ? data.focusProjects.filter((project) => project.kind === "work")
    : data.focusProjects;
  const slotAreaOptions = slotDraft?.editingBlock?.taskId
    ? SLOT_CATEGORY_OPTIONS.filter((option) => option.value === "focus" || option.value === "study" || option.value === "work")
    : SLOT_CATEGORY_OPTIONS;
  const weekAgendaPanel = <article className="panel week-agenda">
    <div className="agenda-head">
      <button onClick={() => shiftWeek(-1)} aria-label="Semana anterior">‹</button>
      <div><p>ZOOM DE LA SEMANA</p><h2>{formatDate(agendaWeek[0].iso)} — {formatDate(agendaWeek[6].iso)}</h2></div>
      <button onClick={() => shiftWeek(1)} aria-label="Semana siguiente">›</button>
    </div>
    <div className="agenda-scroll">
      <div className="agenda-grid" style={{ "--hours": String(agendaHours.length) } as CSSProperties}>
        <div className="agenda-corner" />
        {agendaWeek.map((day) => <div className={"agenda-day-head " + (day.iso === today ? "today" : "")} key={day.iso}>
          <small>{day.short}</small><b>{day.number}</b>
        </div>)}
        <div className="agenda-hours">
          {agendaHours.map((hour) => <span key={hour}>{String(hour).padStart(2, "0")}:00</span>)}
        </div>
        {agendaWeek.map((day) => {
          const blocks = agendaBlocksByDay[day.iso] ?? [];
          return <div className={"agenda-column " + (day.iso === today ? "today" : "")} key={day.iso}>
            {agendaHours.map((hour) => <button
              key={hour}
              className="agenda-slot"
              aria-label={`Agregar un bloque el ${formatDate(day.iso)} a las ${String(hour).padStart(2, "0")}:00`}
              onClick={() => openSlotDraft(day.iso, `${String(hour).padStart(2, "0")}:00`)}
            />)}
            {blocks.map((block) => {
              const top = (block.start - agendaStartHour * 60) / 60;
              const height = block.minutes / 60;
              if (top + height <= 0 || top >= agendaHours.length) return null;
              return <button
                type="button"
                key={block.key}
                className={"agenda-block " + block.category + (block.done ? " done" : "")}
                style={{ top: "calc(" + Math.max(0, top) + " * var(--hour-height)", height: "calc(" + Math.min(height, agendaHours.length - top) + " * var(--hour-height) - 3px)" }}
                title={block.title + " · " + clockFromMinutes(block.start) + "–" + clockFromMinutes(block.end)}
                aria-pressed={block.done}
                onClick={() => handleAgendaBlockClick(block)}
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture?.(event.pointerId);
                  beginAgendaLongPress(block, day.iso);
                }}
                onPointerUp={(event) => {
                  clearAgendaLongPress();
                  if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture?.(event.pointerId);
                }}
                onPointerCancel={clearAgendaLongPress}
                onPointerLeave={clearAgendaLongPress}
                onContextMenu={(event) => { event.preventDefault(); clearAgendaLongPress(); setBlockMenu({ block, date: day.iso }); }}
              >
                <b>{block.title}</b>
                <small>{clockFromMinutes(block.start)}</small>
              </button>;
            })}
            {day.iso === today && nowMinutes >= agendaStartHour * 60 && nowMinutes <= agendaEndHour * 60 && <i
              className="agenda-now"
              style={{ top: `calc(${(nowMinutes - agendaStartHour * 60) / 60} * var(--hour-height))` }}
            />}
          </div>;
        })}
      </div>
    </div>
    {slotDraft && <form key={`${slotDraft.editingBlock?.key ?? "new"}-${slotDraft.date}-${slotDraft.startTime}`} className="slot-form" onSubmit={(event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const customHours = parseDecimalInput(slotCustomHours);
      const durationMinutes = slotDuration === "custom" ? Math.round(customHours * 60) : Number(slotDuration) || 60;
      if (durationMinutes < 15 || durationMinutes > 1440) {
        setError("Indicá una duración válida (entre 15 minutos y 24 horas).");
        return;
      }
      const editingBlock = slotDraft.editingBlock;
      const projectId = Number(form.get("projectId")) || null;
      const disciplineId = Number(form.get("disciplineId")) || null;
      if (slotUsesProject && !projectId) {
        setError(slotCategory === "study" ? "Elegí la materia que querés estudiar." : slotCategory === "work" ? "Elegí el proyecto de trabajo." : "Elegí una materia o proyecto.");
        return;
      }
      if (slotCategory === "training" && !disciplineId) {
        setError("Elegí qué disciplina vas a entrenar.");
        return;
      }
      const payload = editingBlock
        ? editingBlock.taskId
          ? { action: "update_task", id: editingBlock.taskId, title: form.get("title"), projectId, dueDate: slotDraft.date, startTime: slotDraft.startTime, durationMinutes }
          : { action: "update_event", id: editingBlock.eventId, title: form.get("title"), eventDate: slotDraft.date, eventTime: slotDraft.startTime, durationMinutes, category: slotCategory, disciplineId }
        : slotUsesProject
          ? { action: "add_task", title: form.get("title"), projectId, dueDate: slotDraft.date, startTime: slotDraft.startTime, durationMinutes }
          : { action: "add_event", title: form.get("title"), eventDate: slotDraft.date, eventTime: slotDraft.startTime, durationMinutes, category: slotCategory, disciplineId };
      void save(payload).then((ok) => { if (ok) setSlotDraft(null); });
    }}>
      <p>{slotDraft.editingBlock ? "Editar bloque" : "Nuevo bloque"} · {formatDate(slotDraft.date)} a las {slotDraft.startTime}</p>
      <div className="slot-fields">
        <input name="title" required autoFocus defaultValue={slotDraft.editingBlock?.title ?? ""} placeholder={slotCategory === "study" ? "Ej. Estudiar capítulo 2" : slotCategory === "work" ? "Ej. Avanzar presentación" : "Ej. Gimnasio"} />
        <Dropdown ariaLabel="Área del bloque" value={slotCategory} onChange={(value) => setSlotCategory(value as SlotCategory)} options={slotAreaOptions} />
        {slotUsesProject && <Dropdown key={"slot-project-" + slotCategory} name="projectId" ariaLabel={slotCategory === "study" ? "Materia del bloque" : "Proyecto del bloque"} defaultValue={String(slotDraft.editingBlock?.projectId ?? "")} options={slotProjects.map((project) => ({ value: String(project.id), label: project.name }))} />}
        {slotCategory === "training" && <Dropdown key={"slot-discipline-" + (slotDraft.editingBlock?.key ?? "new")} name="disciplineId" ariaLabel="Disciplina del entrenamiento" defaultValue={String(slotDraft.editingBlock?.disciplineId ?? data.disciplines[0]?.id ?? "")} options={data.disciplines.map((discipline) => ({ value: String(discipline.id), label: discipline.name + (discipline.priority === "secondary" ? " · Secundaria" : " · Importante") }))} />}
        <Dropdown ariaLabel="Duración del bloque" value={slotDuration} onChange={setSlotDuration} options={[...durationOptions([30, 45, 60, 90, 120, 180]), { value: "custom", label: "Personalizado" }]} />
        {slotDuration === "custom" && <label className="slot-custom-duration">Duración personalizada
          <div className="slot-custom-duration-input">
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9]+([.,][0-9]+)?"
              value={slotCustomHours}
              onChange={(event) => setSlotCustomHours(event.target.value)}
              placeholder="Ej. 4,5"
              autoFocus
              required
            />
            <span>h</span>
          </div>
        </label>}
      </div>
      <div className="slot-actions">
        <button type="button" onClick={() => setSlotDraft(null)}>Cancelar</button>
        <button className="primary-action" disabled={saving}><SaveButtonContent label={slotDraft.editingBlock ? "Guardar cambios" : "Agregar bloque"} phase={savePhase(slotDraft.editingBlock ? (slotDraft.editingBlock.taskId ? "update_task" : "update_event") : (slotCategory === "focus" ? "add_task" : "add_event"))} /></button>
      </div>
    </form>}
    <p className="agenda-hint">Tocá una franja vacía para agregar. Mantené apretado un bloque para editarlo o eliminarlo.</p>
  </article>;
  const monthCalendarPanel = <article className="panel calendar-panel"><div className="calendar-head"><button onClick={() => shiftCalendar(-1)}>‹</button><h2>{calendarMonthName}</h2><button onClick={() => shiftCalendar(1)}>›</button></div><div className="calendar-grid"><div className="calendar-weekdays">{["L", "M", "M", "J", "V", "S", "D"].map((item, index) => <b key={item + index}>{item}</b>)}</div><div className="calendar-cells">{Array.from({ length: calendarOffset }, (_, index) => <span className="blank" key={"blank" + index} />)}{Array.from({ length: calendarDays }, (_, index) => {
    const date = calendarCursor + "-" + String(index + 1).padStart(2, "0");
    const items = calendarItems.filter((item) => item.date === date);
    const daySummary = items.map((item) => item.title).join(", ");
    return <button className={date === today ? "today" : ""} key={date} aria-label={items.length ? `${index + 1}: ${daySummary}` : String(index + 1)} title={daySummary || undefined} onClick={() => { setWeekAnchor(date); setAgendaView("week"); }}><b>{index + 1}</b><div className="calendar-day-events">{items.slice(0, 2).map((item) => <span className={"calendar-event " + item.type} key={item.key}><i />{item.title}</span>)}{items.length > 2 && <small className="calendar-more">+{items.length - 2} más</small>}</div></button>;
  })}</div></div></article>;
  const calendarPanel = <section className="module-stack">
    <div className="period-switch agenda-switch">
      <button className={agendaView === "week" ? "active" : ""} onClick={() => setAgendaView("week")}>Semana por horas</button>
      <button className={agendaView === "month" ? "active" : ""} onClick={() => setAgendaView("month")}>Mes completo</button>
    </div>
    {agendaView === "week" ? weekAgendaPanel : monthCalendarPanel}
    <div className="calendar-layout">
      <article className="panel"><div className="panel-heading"><div><p>NUEVO RECORDATORIO</p><h2>Evento importante</h2></div></div><form className="data-form" onSubmit={(event) => { const form = new FormData(event.currentTarget); void submitForm(event, { action: "add_event", title: form.get("title"), eventDate: form.get("eventDate"), eventTime: form.get("eventTime"), durationMinutes: form.get("durationMinutes"), category: form.get("category"), notes: form.get("notes") }); }}>
        <label>Evento<input name="title" required placeholder="Examen, turno, carrera…" /></label><div className="three-fields"><label>Fecha<DatePicker name="eventDate" ariaLabel="Fecha del evento" defaultValue={today} /></label><TimeFieldPicker idPrefix="event-time" label="Hora" name="eventTime" defaultValue="09:00" hourOptions={FULL_DAY_HOUR_OPTIONS} /><label>Dura<Dropdown name="durationMinutes" ariaLabel="Duración del evento" defaultValue="60" options={durationOptions([30, 60, 90, 120, 180, 240])} /></label></div><label>Categoría<Dropdown name="category" ariaLabel="Categoría del evento" options={EVENT_CATEGORY_OPTIONS} /></label><label>Notas<textarea name="notes" placeholder="Dirección, preparación, información útil…" /></label><button className="primary-action" disabled={saving}><SaveButtonContent label="Guardar evento" phase={savePhase("add_event")} /></button>
      </form></article>
      <article className="panel"><div className="panel-heading"><div><p>LO PRÓXIMO</p><h2>Recordatorios y cuenta regresiva</h2></div><span className="week-pill">{upcoming.length} próximos</span></div><div className="upcoming-list">{upcoming.length ? upcoming.map((item) => <div key={item.key}><span className={"event-dot " + item.type} /><p><b>{item.title}</b><small>{formatDate(item.date)} · {item.source === "goal" ? "Objetivo" : item.source === "task" ? "Tarea" : "Evento"}</small></p><strong>{countdownLabelCapitalized(dayDistance(today, item.date))}</strong>{item.source === "event" && <button onClick={() => void save({ action: "delete_event", id: item.id })}>×</button>}</div>) : <div className="inline-empty"><span>□</span><p><b>No hay fechas próximas</b><small>Agregá un evento, tarea u objetivo.</small></p></div>}</div></article>
    </div>
  </section>;
  const blockMenuDialog = blockMenu && <div className="block-action-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setBlockMenu(null); }}>
      <section className="block-action-sheet" role="dialog" aria-modal="true" aria-label={"Opciones para " + blockMenu.block.title}>
        <p>{blockMenu.block.title}</p>
        <button type="button" onClick={() => { const current = blockMenu; setBlockMenu(null); openSlotDraft(current.date, clockFromMinutes(current.block.start), current.block); }}>Editar</button>
        <button type="button" className="danger" onClick={() => { const current = blockMenu; setBlockMenu(null); if (window.confirm("¿Eliminar este bloque?")) void deleteAgendaBlock(current.block); }}>Eliminar</button>
        <button type="button" className="cancel" onClick={() => setBlockMenu(null)}>Cancelar</button>
      </section>
    </div>;

  return <><GoalsPanel />{calendarPanel}{blockMenuDialog}</>;
}
