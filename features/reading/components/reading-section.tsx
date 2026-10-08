"use client";
import type { Book, BookStatus, BookSuggestion } from "@/shared/data/types";
import { CatalogBookCover, SavedBookCover } from "@/features/reading/components/book-covers";
import { DayStrip } from "@/shared/ui/day-strip";
import { Dropdown } from "@/shared/ui/dropdown";
import type { FormEvent } from "react";
import { NotesThread, StudyResourcesPanel } from "@/features/reading/components/study-resources";
import { SaveButtonContent } from "@/shared/ui/save-button";
import { bookLanguageOptions, normalizeBookText } from "@/features/reading/logic/books";
import { readJson } from "@/shared/api/read-json";
import { readingPositionForDate } from "@/features/reading/logic/reading";
import { useEffect, useState } from "react";
import { useWorkspace } from "@/features/app-shell/workspace";

/** Lectura: biblioteca con notas por libro, artículos/podcasts y descubrir libros. */
export function ReadingSection() {
  const {
    today,
    data,
    saving,
    setError,
    savePhase,
    saveLabel,
    save,
    entryDayLabel,
    historicalScore,
  } = useWorkspace();
  /* eslint-disable react-hooks/set-state-in-effect */
  const [readingEntryDate, setReadingEntryDate] = useState(today);
  const [bookTab, setBookTab] = useState<BookStatus>("reading");
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);
  const [bookShelfPage, setBookShelfPage] = useState(0);
  const [pagesInput, setPagesInput] = useState<number | "">(0);
  const [bookForm, setBookForm] = useState(false);
  const [bookDraft, setBookDraft] = useState({ title: "", author: "", totalPages: 0, status: "reading" as BookStatus, coverUrl: "", externalKey: "" });
  const [bookSuggestions, setBookSuggestions] = useState<BookSuggestion[]>([]);
  const [bookSuggestLoading, setBookSuggestLoading] = useState(false);
  const [bookMatching, setBookMatching] = useState(false);
  const [bookSuggestionOpen, setBookSuggestionOpen] = useState(false);
  const [discoverQuery, setDiscoverQuery] = useState("");
  const [discoverLanguage, setDiscoverLanguage] = useState("es");
  const [discoverResults, setDiscoverResults] = useState<BookSuggestion[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverSearched, setDiscoverSearched] = useState(false);
  const adjustPages = (delta: number) => {
    setPagesInput((current) => {
      const maximum = selectedBook?.totalPages ? selectedBook.totalPages : 20000;
      return Math.min(maximum, Math.max(0, (Number(current) || 0) + delta));
    });
  };
  useEffect(() => {
    const title = bookDraft.title.trim();
    if (!bookForm || !bookSuggestionOpen || title.length < 2) {
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setBookSuggestLoading(true);
      try {
        const response = await fetch(`/api/book-search?q=${encodeURIComponent(title)}&limit=6`, { signal: controller.signal });
        const result = await readJson<{ books?: BookSuggestion[]; error?: string }>(response);
        if (!response.ok) throw new Error(result.error || "No pudimos buscar libros.");
        setBookSuggestions(result.books ?? []);
      } catch (caught) {
        if (!(caught instanceof DOMException && caught.name === "AbortError")) setBookSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setBookSuggestLoading(false);
      }
    }, 320);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [bookDraft.title, bookForm, bookSuggestionOpen]);
  const latestReadingDateByBook = new Map<number, string>();
  for (const log of data.readingHistory) {
    if (log.pages <= 0 && log.minutes <= 0) continue;
    const previousDate = latestReadingDateByBook.get(log.bookId);
    if (!previousDate || log.logDate > previousDate) latestReadingDateByBook.set(log.bookId, log.logDate);
  }
  const booksInTab = data.books
    .map((book, index) => ({ book, index }))
    .filter(({ book }) => book.status === bookTab)
    .sort((a, b) => {
      const mostRecentA = latestReadingDateByBook.get(a.book.id) ?? "";
      const mostRecentB = latestReadingDateByBook.get(b.book.id) ?? "";
      return mostRecentB.localeCompare(mostRecentA) || a.index - b.index;
    })
    .map(({ book }) => book);
  const bookShelfPageCount = Math.max(1, Math.ceil(booksInTab.length / 3));
  const visibleBookShelfPage = Math.min(bookShelfPage, bookShelfPageCount - 1);
  const visibleBooks = booksInTab.slice(visibleBookShelfPage * 3, visibleBookShelfPage * 3 + 3);
  const selectedBook = booksInTab.find((book) => book.id === selectedBookId) ?? booksInTab[0] ?? null;
  const selectedReadingLog = selectedBook ? data.readingHistory.find((log) => log.bookId === selectedBook.id && log.logDate === readingEntryDate) : undefined;
  const selectedReadingPosition = selectedBook
    ? readingPositionForDate(selectedBook.currentPage, data.readingHistory.filter((log) => log.bookId === selectedBook.id), readingEntryDate, selectedBook.totalPages)
    : 0;
  const readingRelevanceValue = data.profile.readingRelevant === true ? "true"
    : data.profile.readingRelevant === false ? "false" : "";
  useEffect(() => {
    if (selectedBook) {
      setSelectedBookId(selectedBook.id);
      setPagesInput(selectedReadingPosition);
    } else {
      setSelectedBookId(null);
      setPagesInput(0);
    }
  }, [selectedBook, selectedReadingLog?.pages, selectedReadingPosition, readingEntryDate]);
  function showBookShelfPage(page: number) {
    const nextPage = Math.max(0, Math.min(bookShelfPageCount - 1, page));
    setBookShelfPage(nextPage);
    setSelectedBookId(booksInTab[nextPage * 3]?.id ?? null);
  }
  function openAddBook(status: BookStatus = bookTab) {
    setBookDraft({ title: "", author: "", totalPages: 0, status, coverUrl: "", externalKey: "" });
    setBookSuggestions([]);
    setBookSuggestionOpen(false);
    setBookForm(true);
  }
  function chooseBookSuggestion(book: BookSuggestion) {
    setBookDraft((current) => ({ ...current, title: book.title, author: book.author === "Autor no informado" ? "" : book.author, totalPages: book.pages || 0, coverUrl: book.coverUrl, externalKey: book.key }));
    setBookSuggestions([]);
    setBookSuggestionOpen(false);
  }
  async function submitNewBook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBookMatching(true);
    try {
      let resolvedCoverUrl = bookDraft.coverUrl;
      let resolvedExternalKey = bookDraft.externalKey;
      let resolvedAuthor = bookDraft.author;
      let resolvedPages = bookDraft.totalPages;
      if (!resolvedExternalKey) {
        try {
          const query = [bookDraft.title, bookDraft.author].filter(Boolean).join(" ");
          const response = await fetch(`/api/book-search?q=${encodeURIComponent(query)}&limit=8`);
          const result = await readJson<{ books?: BookSuggestion[] }>(response);
          const normalizedTitle = normalizeBookText(bookDraft.title);
          const normalizedAuthor = normalizeBookText(bookDraft.author);
          const match = result.books?.find((book) => normalizeBookText(book.title) === normalizedTitle && (!normalizedAuthor || normalizeBookText(book.author).includes(normalizedAuthor) || normalizedAuthor.includes(normalizeBookText(book.author))));
          if (match) {
            resolvedCoverUrl = match.coverUrl;
            resolvedExternalKey = match.key;
            resolvedAuthor ||= match.author === "Autor no informado" ? "" : match.author;
            resolvedPages ||= match.pages;
          }
        } catch {
          // A manual book can still be saved with the app's default cover.
        }
      }
      const ok = await save({ action: "add_book", title: bookDraft.title, author: resolvedAuthor, totalPages: resolvedPages, status: bookDraft.status, coverUrl: resolvedCoverUrl, externalKey: resolvedExternalKey });
      if (ok) {
        setBookTab(bookDraft.status);
        setBookForm(false);
        setBookDraft({ title: "", author: "", totalPages: 0, status: "reading", coverUrl: "", externalKey: "" });
        setBookSuggestions([]);
      }
    } finally {
      setBookMatching(false);
    }
  }
  async function discoverBooks(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (discoverQuery.trim().length < 2) return;
    setDiscoverLoading(true);
    setDiscoverSearched(true);
    setDiscoverResults([]);
    try {
      const response = await fetch(`/api/book-search?q=${encodeURIComponent(discoverQuery.trim())}&language=${discoverLanguage}&mode=discover&limit=8`);
      const result = await readJson<{ books?: BookSuggestion[]; error?: string }>(response);
      if (!response.ok) throw new Error(result.error || "No pudimos buscar recomendaciones.");
      setDiscoverResults(result.books ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos buscar recomendaciones.");
    } finally {
      setDiscoverLoading(false);
    }
  }
  async function saveDiscoveredBook(book: BookSuggestion) {
    const ok = await save({ action: "add_book", title: book.title, author: book.author === "Autor no informado" ? "" : book.author, totalPages: book.pages, status: "wishlist", coverUrl: book.coverUrl, externalKey: book.key });
    if (ok) setBookTab("wishlist");
  }

  const booksPanel = <section className="books-layout"><article className="panel section-panel books-panel"><div className="panel-heading"><div><p>BIBLIOTECA · {entryDayLabel(readingEntryDate)}</p><h2>Libros</h2></div><div className="meal-panel-actions"><button className="add-button light" onClick={() => bookForm ? setBookForm(false) : openAddBook(bookTab)}>{bookForm ? "Cerrar" : "＋ Nuevo libro"}</button></div></div>
    <div className="reading-relevance-row"><div className="reading-relevance-copy"><b>¿La lectura es relevante para vos?</b><small>Si la marcás como relevante, suma dentro de Foco hasta 20 puntos. Sin definir o como “No relevante”, no afecta el Daily Score.</small></div><Dropdown ariaLabel="Relevancia de la lectura para el Daily Score" value={readingRelevanceValue} onChange={(value) => void save({ action: "set_reading_relevance", relevant: value === "" ? null : value === "true" }, "set_reading_relevance")} options={[{ value: "", label: "Elegí una opción" }, { value: "true", label: "Relevante" }, { value: "false", label: "No relevante" }]} className="reading-relevance-dropdown" /></div>
    <DayStrip label="Elegí el día de lectura que querés registrar" value={readingEntryDate} today={today} onChange={setReadingEntryDate} markedDates={new Set(data.readingHistory.filter((log) => log.pages > 0 || log.minutes > 0).map((log) => log.logDate))} />
    {historicalScore(readingEntryDate)}
    {bookForm && <form className="book-form smart-book-form" onSubmit={(event) => void submitNewBook(event)}><div className="book-title-search"><input name="title" autoComplete="off" required value={bookDraft.title} onFocus={() => { if (bookSuggestions.length) setBookSuggestionOpen(true); }} onChange={(event) => { const title = event.target.value; setBookDraft({ ...bookDraft, title, coverUrl: "", externalKey: "" }); setBookSuggestionOpen(true); if (title.trim().length < 2) { setBookSuggestions([]); setBookSuggestLoading(false); } }} placeholder="Empezá a escribir el título…" />{(bookDraft.title.trim().length >= 2 && bookSuggestionOpen && (bookSuggestLoading || bookSuggestions.length > 0)) && <div className="book-autocomplete">{bookSuggestLoading && <div className="book-searching"><span className="voice-spinner" />Buscando en el catálogo…</div>}{!bookSuggestLoading && bookSuggestions.map((book) => <button type="button" key={book.key} onClick={() => chooseBookSuggestion(book)}><CatalogBookCover book={book} compact /><p><b>{book.title}</b><small>{book.author}{book.year ? ` · ${book.year}` : ""}</small></p>{book.pages > 0 && <em>{book.pages} pág.</em>}</button>)}</div>}</div><input name="author" value={bookDraft.author} onChange={(event) => setBookDraft({ ...bookDraft, author: event.target.value })} placeholder="Autor" /><input name="totalPages" value={bookDraft.totalPages || ""} onChange={(event) => setBookDraft({ ...bookDraft, totalPages: Number(event.target.value) || 0 })} type="number" min="0" placeholder="Páginas" /><Dropdown ariaLabel="Estado del libro" value={bookDraft.status} onChange={(value) => setBookDraft({ ...bookDraft, status: value as BookStatus })} options={[{ value: "reading", label: "Leyendo" }, { value: "read", label: "Leído" }, { value: "wishlist", label: "Quiero leer" }]} /><button disabled={saving || bookMatching}>{bookMatching && savePhase("add_book") === null ? "Identificando…" : <SaveButtonContent label="Guardar" phase={savePhase("add_book")} />}</button></form>}
    <div className="book-tabs">{(["reading", "read", "wishlist"] as BookStatus[]).map((tab) => <button className={bookTab === tab ? "active" : ""} key={tab} onClick={() => { setBookTab(tab); setBookShelfPage(0); setSelectedBookId(null); }}>{tab === "reading" ? "Leyendo" : tab === "read" ? "Leídos" : "Quiero leer"} <i>{data.books.filter((book) => book.status === tab).length}</i></button>)}</div>
    {booksInTab.length ? <><div className="book-shelf-list">{visibleBooks.map((book) => {
      const isSelected = selectedBook?.id === book.id;
      const bookNotes = data.notes.filter((item) => item.bookId === book.id);
      const bookNoteCount = bookNotes.length;
      const canEditPosition = (bookTab === "reading" || bookTab === "read") && isSelected;
      const currentInput = Number(pagesInput) || 0;
      const maximumPage = book.totalPages > 0 ? book.totalPages : 20000;
      const savePosition = async () => {
        const nextPage = Math.min(maximumPage, Math.max(0, currentInput));
        const ok = await save({ action: "set_pages", bookId: book.id, date: readingEntryDate, currentPage: nextPage });
        if (!ok) return;
        const completed = book.totalPages > 0 && nextPage >= book.totalPages;
        setBookTab(completed ? "read" : "reading");
        setSelectedBookId(book.id);
        setBookShelfPage(0);
      };
      return <article className={"current-book shelf-book " + (isSelected ? "selected" : "")} key={book.id}>
        <SavedBookCover book={book} />
        <div className="book-info">
          <button type="button" className="book-card-select" aria-pressed={isSelected} onClick={() => setSelectedBookId(book.id)}>
            <span>{bookTab === "reading" ? "LEYENDO AHORA" : bookTab === "read" ? "TERMINADO" : "PRÓXIMA LECTURA"}</span>
            <h3>{book.title}</h3><p>{book.author}</p>
          </button>
          <div className="progress-line"><i style={{ width: String(book.totalPages ? Math.min(100, book.currentPage / book.totalPages * 100) : 0) + "%" }} /></div>
          <small>{book.currentPage} de {book.totalPages || "?"} páginas</small>
          <button type="button" className="delete-book-trigger" onClick={() => setBookToDelete(book)}>Eliminar libro</button>
        </div>
        {canEditPosition ? <div className="page-counter">
          <label>Vas por la página</label>
          <div>
            <button type="button" className="stepper-button" aria-label="Retroceder una página" onClick={() => adjustPages(-1)} disabled={currentInput <= 0}>−</button>
            <input type="number" inputMode="numeric" min="0" max={book.totalPages || undefined} value={pagesInput} onFocus={() => { if (pagesInput === 0) setPagesInput(""); }} onBlur={() => { if (pagesInput === "") setPagesInput(0); }} onChange={(event) => setPagesInput(event.target.value === "" ? "" : Math.min(maximumPage, Math.max(0, Number(event.target.value) || 0)))} />
            <button type="button" className="stepper-button" aria-label="Avanzar una página" onClick={() => adjustPages(1)} disabled={book.totalPages > 0 && currentInput >= book.totalPages}>＋</button>
            <button type="button" className="save-pages" onClick={() => void savePosition()}><SaveButtonContent label="Guardar" phase={savePhase("set_pages")} /></button>
          </div>
        </div> : <button type="button" className="book-select-action" onClick={() => setSelectedBookId(book.id)}>{isSelected ? "✓ Seleccionado" : `Ver notas y detalles${bookNoteCount ? ` · ${bookNoteCount}` : ""}`}</button>}
        {isSelected && <div className="book-notes-slot"><NotesThread
          key={book.id}
          notes={bookNotes}
          placeholder={`Idea u observación de ${book.title}…`}
          saving={saving}
          saveLabel={saveLabel}
          feedbackKey="add_note"
          onAdd={(content) => save({ action: "add_note", bookId: book.id, content })}
          onDelete={(id) => void save({ action: "delete_note", id })}
        /></div>}
      </article>;
    })}</div>{bookShelfPageCount > 1 && <div className="book-shelf-pagination"><button type="button" disabled={visibleBookShelfPage === 0} onClick={() => showBookShelfPage(visibleBookShelfPage - 1)}>← Anteriores</button><span>{visibleBookShelfPage + 1} de {bookShelfPageCount}</span><button type="button" disabled={visibleBookShelfPage === bookShelfPageCount - 1} onClick={() => showBookShelfPage(visibleBookShelfPage + 1)}>Siguientes →</button></div>}</> : <button type="button" className="empty-shelf" onClick={() => openAddBook(bookTab)}><span>＋</span><b>No hay libros en esta lista</b><p>Tocá acá para agregar el primero.</p></button>}
  </article><StudyResourcesPanel resources={data.resources ?? []} notes={data.resourceNotes ?? []} saving={saving} save={save} saveLabel={saveLabel} onError={setError} />
  <article className="panel section-panel book-discover-panel"><div className="book-discover-head"><span>✦</span><div><p>DESCUBRIR NUEVAS LECTURAS</p><h2>¿Sobre qué querés leer?</h2><small>Buscá por un tema, una idea o un interés y elegí el idioma de la edición.</small></div></div><form className="book-discover-form" onSubmit={(event) => void discoverBooks(event)}><input value={discoverQuery} onChange={(event) => setDiscoverQuery(event.target.value)} placeholder="Ej. finanzas personales, inteligencia artificial, historia…" /><Dropdown ariaLabel="Idioma del libro" value={discoverLanguage} onChange={setDiscoverLanguage} options={bookLanguageOptions.map(([value, label]) => ({ value, label }))} /><button disabled={discoverLoading || discoverQuery.trim().length < 2}>{discoverLoading ? "Buscando…" : "Buscar libros"}</button></form><div className="book-topic-chips">{["Finanzas personales", "Productividad", "Historia", "Tecnología", "Psicología", "Biografías"].map((topic) => <button type="button" key={topic} onClick={() => setDiscoverQuery(topic)}>{topic}</button>)}</div>{discoverLoading && <div className="discover-loading"><span className="voice-spinner" /><b>Buscando buenas opciones…</b></div>}{!discoverLoading && discoverResults.length > 0 && <div className="book-results-grid">{discoverResults.map((book) => { const isSaved = data.books.some((savedBook) => savedBook.title.toLowerCase() === book.title.toLowerCase() && (!savedBook.author || savedBook.author.toLowerCase() === book.author.toLowerCase())); return <article key={book.key}><CatalogBookCover book={book} /><div className="book-result-copy"><span>{book.year || "Edición disponible"}</span><h3>{book.title}</h3><p>{book.author}</p><small>{book.pages ? `${book.pages} páginas aproximadas` : "Páginas no informadas"}</small></div><div className="book-result-actions"><button type="button" disabled={saving || isSaved} onClick={() => void saveDiscoveredBook(book)}>{isSaved ? "✓ En tu biblioteca" : "＋ Quiero leer"}</button><a href={book.openLibraryUrl} target="_blank" rel="noreferrer">Ver ficha ↗</a></div></article>; })}</div>}{!discoverLoading && discoverSearched && !discoverResults.length && <div className="inline-empty discover-empty"><span>⌕</span><p><b>No encontramos opciones con esos filtros</b><small>Probá con un tema más amplio u otro idioma.</small></p></div>}<p className="catalog-credit">Información bibliográfica y portadas provistas por <a href="https://openlibrary.org/" target="_blank" rel="noreferrer">Open Library</a>.</p></article></section>;
  const bookDeleteDialog = bookToDelete && <div className="delete-book-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setBookToDelete(null); }}><section className="delete-book-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-book-title"><span className="delete-book-icon" aria-hidden="true">⌫</span><p>ELIMINAR DE TU BIBLIOTECA</p><h2 id="delete-book-title">¿Eliminar “{bookToDelete.title}”?</h2><small>También se eliminarán sus páginas registradas y sus notas. Esta acción no se puede deshacer.</small><div><button type="button" className="delete-book-cancel" disabled={saving} onClick={() => setBookToDelete(null)}>Cancelar</button><button type="button" className="delete-book-confirm" disabled={saving} onClick={() => { const bookId = bookToDelete.id; void save({ action: "delete_book", bookId }).then((ok) => { if (ok) { setBookToDelete(null); setSelectedBookId(null); setBookShelfPage(0); setPagesInput(0); } }); }}>{saving ? "Eliminando…" : "Sí, eliminar libro"}</button></div></section></div>;
  /* eslint-enable react-hooks/set-state-in-effect */

  return <>{booksPanel}{bookDeleteDialog}</>;
}
