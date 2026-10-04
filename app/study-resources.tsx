"use client";

import { useState, type ReactNode } from "react";

export type ResourceKind = "article" | "podcast" | "video";
export type StudyResource = { id: number; kind: ResourceKind; title: string; author: string; url: string; status: "pending" | "done"; createdAt: string; updatedAt?: string };
export type ResourceNote = { id: number; resourceId: number; content: string; createdAt: string };
type NoteItem = { id: number; content: string; createdAt: string };
type SaveFn = (payload: Record<string, unknown>, feedbackKey?: string) => Promise<boolean>;
type SaveLabel = (label: ReactNode, key: string) => ReactNode;

const KIND_LABELS: Record<ResourceKind, string> = { article: "Artículo", podcast: "Podcast", video: "Video" };
const KIND_ICONS: Record<ResourceKind, string> = { article: "📰", podcast: "🎧", video: "▶" };
const RESOURCE_TABS: Array<["all" | ResourceKind, string]> = [["all", "Todos"], ["article", "Artículos"], ["podcast", "Podcasts"], ["video", "Videos"]];

function formatNoteDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" }).format(date);
}

/**
 * Notas pegadas a lo que estás leyendo o escuchando: se escriben y se leen
 * desde la misma tarjeta del libro, artículo o podcast.
 */
export function NotesThread({ notes, placeholder, saving, saveLabel, feedbackKey, onAdd, onDelete }: {
  notes: NoteItem[];
  placeholder: string;
  saving: boolean;
  saveLabel: SaveLabel;
  feedbackKey: string;
  onAdd: (content: string) => Promise<boolean>;
  onDelete: (id: number) => void;
}) {
  const [draft, setDraft] = useState("");
  return <div className="notes-thread">
    <div className="notes-thread-head"><b>Notas</b><span>{notes.length}</span></div>
    <form onSubmit={(event) => { event.preventDefault(); if (!draft.trim()) return; void onAdd(draft).then((ok) => { if (ok) setDraft(""); }); }}>
      <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={placeholder} />
      <button disabled={saving || !draft.trim()}>{saveLabel("Guardar nota", feedbackKey)}</button>
    </form>
    {notes.length > 0 && <div className="notes-list">{notes.map((item) => <div key={item.id}>
      <span>“</span>
      <p>{item.content}<small>{formatNoteDate(item.createdAt)}</small></p>
      <button type="button" className="note-delete" aria-label="Borrar nota" disabled={saving} onClick={() => { if (window.confirm("¿Borrar esta nota?")) onDelete(item.id); }}>×</button>
    </div>)}</div>}
  </div>;
}

/** Artículos, podcasts y videos guardados en Estudio, cada uno con sus notas. */
export function StudyResourcesPanel({ resources, notes, saving, save, saveLabel, onError }: {
  resources: StudyResource[];
  notes: ResourceNote[];
  saving: boolean;
  save: SaveFn;
  saveLabel: SaveLabel;
  onError: (message: string) => void;
}) {
  const [tab, setTab] = useState<"all" | ResourceKind>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<{ kind: ResourceKind; title: string; author: string; url: string }>({ kind: "article", title: "", author: "", url: "" });
  const [openId, setOpenId] = useState<number | null>(null);
  const visible = resources
    .filter((item) => tab === "all" || item.kind === tab)
    .sort((left, right) => left.status === right.status ? 0 : left.status === "pending" ? -1 : 1);

  async function submit() {
    const title = draft.title.trim();
    if (!title) { onError("Ponele un título."); return; }
    const rawUrl = draft.url.trim();
    const url = rawUrl && !/^https?:\/\//i.test(rawUrl) ? `https://${rawUrl}` : rawUrl;
    const ok = await save({ action: "add_resource", kind: draft.kind, title, author: draft.author, url });
    if (ok) { setDraft({ kind: draft.kind, title: "", author: "", url: "" }); setFormOpen(false); setTab((current) => current === "all" ? "all" : draft.kind); }
  }

  return <article className="panel section-panel resources-panel">
    <div className="panel-heading">
      <div><p>ARTÍCULOS, PODCASTS Y VIDEOS</p><h2>Para aprender</h2></div>
      <div className="meal-panel-actions"><button className="add-button light" onClick={() => setFormOpen((open) => !open)}>{formOpen ? "Cerrar" : "＋ Nuevo"}</button></div>
    </div>
    {formOpen && <form className="resource-form" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <div className="resource-kind-picker" role="radiogroup" aria-label="Tipo">
        {(Object.keys(KIND_LABELS) as ResourceKind[]).map((kind) => <button key={kind} type="button" role="radio" aria-checked={draft.kind === kind} className={draft.kind === kind ? "active" : ""} onClick={() => setDraft({ ...draft, kind })}><span>{KIND_ICONS[kind]}</span>{KIND_LABELS[kind]}</button>)}
      </div>
      <input required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder={draft.kind === "podcast" ? "Episodio (ej. Cómo funciona la memoria)" : draft.kind === "video" ? "Título del video" : "Título del artículo"} />
      <input value={draft.author} onChange={(event) => setDraft({ ...draft, author: event.target.value })} placeholder={draft.kind === "podcast" ? "Programa o conductor" : draft.kind === "video" ? "Canal o autor" : "Autor o medio"} />
      <input value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} type="text" inputMode="url" autoComplete="off" placeholder="Link (opcional)" />
      <button disabled={saving}>{saveLabel("Guardar", "add_resource")}</button>
    </form>}
    <div className="book-tabs">{RESOURCE_TABS.map(([value, label]) => <button key={value} className={tab === value ? "active" : ""} onClick={() => setTab(value)}>{label} <i>{value === "all" ? resources.length : resources.filter((item) => item.kind === value).length}</i></button>)}</div>
    {visible.length ? <div className="resource-list">{visible.map((item) => {
      const itemNotes = notes.filter((note) => note.resourceId === item.id);
      const open = openId === item.id;
      return <article key={item.id} className={"resource-card " + item.kind + (open ? " open" : "") + (item.status === "done" ? " done" : "")}>
        <div className="resource-card-main">
          <span className="resource-icon" aria-hidden="true">{KIND_ICONS[item.kind]}</span>
          <button type="button" className="resource-card-select" aria-expanded={open} onClick={() => setOpenId(open ? null : item.id)}>
            <small>{KIND_LABELS[item.kind].toUpperCase()}{item.status === "done" ? " · TERMINADO" : ""}</small>
            <b>{item.title}</b>
            {item.author && <em>{item.author}</em>}
          </button>
          <button type="button" className="resource-notes-count" onClick={() => setOpenId(open ? null : item.id)}>✎ {itemNotes.length}</button>
        </div>
        {open && <div className="resource-card-body">
          <div className="resource-card-actions">
            {item.url && <a href={item.url} target="_blank" rel="noreferrer">Abrir link ↗</a>}
            <button type="button" disabled={saving} onClick={() => void save({ action: "set_resource_status", id: item.id, status: item.status === "done" ? "pending" : "done" })}>{item.status === "done" ? "Marcar pendiente" : item.kind === "article" ? "✓ Ya lo leí" : item.kind === "podcast" ? "✓ Ya lo escuché" : "✓ Ya lo vi"}</button>
            <button type="button" className="danger" disabled={saving} onClick={() => { if (window.confirm(`¿Eliminar “${item.title}”? También se borrarán sus notas.`)) void save({ action: "delete_resource", id: item.id }).then((ok) => { if (ok) setOpenId(null); }); }}>Eliminar</button>
          </div>
          <NotesThread
            notes={itemNotes}
            placeholder={`Idea u observación de ${item.title}…`}
            saving={saving}
            saveLabel={saveLabel}
            feedbackKey="add_resource_note"
            onAdd={(content) => save({ action: "add_resource_note", resourceId: item.id, content })}
            onDelete={(id) => void save({ action: "delete_resource_note", id })}
          />
        </div>}
      </article>;
    })}</div> : <button type="button" className="empty-shelf" onClick={() => setFormOpen(true)}><span>＋</span><b>{tab === "all" ? "Todavía no guardaste nada" : `No hay ${RESOURCE_TABS.find(([value]) => value === tab)?.[1].toLowerCase()} guardados`}</b><p>Guardá un artículo, podcast o video para tomar notas.</p></button>}
  </article>;
}
