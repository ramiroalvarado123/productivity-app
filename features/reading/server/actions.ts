import { ok, fail, patched } from "@/server/http";
import { deleteRows, insertRows, selectRows, updateRows } from "@/server/db/postgrest";
import { owned, upsert, now } from "@/server/db/rows";
import type { ProgressRow } from "@/server/db/rows";
import { DATE } from "@/domain/validation";
import { readingUpdateFromPosition } from "@/features/reading/logic/reading";
import type { ActionMap } from "@/server/progress/types";

export const readingActions: ActionMap = {
  add_book: async ({ p, email }) => { const title = String(p.title ?? "").trim(); if (!title) return fail("Ingresá el título del libro."); const status = ["reading", "read", "wishlist"].includes(String(p.status)) ? String(p.status) : "reading", totalPages = Math.max(0, Math.min(20000, Number(p.totalPages) || 0)); await insertRows("books", { userEmail: email, title, author: String(p.author ?? "").trim(), status, totalPages, currentPage: status === "read" ? totalPages : 0, coverUrl: String(p.coverUrl ?? "").slice(0, 1000), externalKey: String(p.externalKey ?? "").slice(0, 300) }); return ok(); },
  delete_book: async ({ p, email }) => { const bookId = Number(p.bookId); if (!(await owned("books", email, { id: bookId }))[0]) return fail("Libro no encontrado.", 404); await deleteRows("reading_logs", { bookId, userEmail: email }); await deleteRows("book_notes", { bookId, userEmail: email }); await deleteRows("books", { id: bookId, userEmail: email }); return ok(); },
  set_pages: async ({ p, email }) => {
    const bookId = Number(p.bookId), date = String(p.date ?? ""), book = (await owned("books", email, { id: bookId }))[0];
    if (!book || !DATE.test(date)) return fail("Datos de lectura inválidos.");
    const previous = (await owned("reading_logs", email, { bookId, logDate: date }))[0];
    const minutes = p.minutes === undefined ? previous?.minutes ?? 0 : Math.max(0, Math.min(1440, Number(p.minutes) || 0));
    let pages: number, currentPage: number, completed: boolean;
    if (p.currentPage !== undefined) {
      const bookLogs = await selectRows<ProgressRow>("reading_logs", { where: { userEmail: email, bookId } });
      const laterPages = bookLogs
        .filter((log) => String(log.logDate) > date)
        .reduce((sum, log) => sum + Math.max(0, Number(log.pages) || 0), 0);
      ({ pages, currentPage, completed } = readingUpdateFromPosition({
        currentPage: Number(book.currentPage) || 0,
        totalPages: Number(book.totalPages) || 0,
        previousPages: Number(previous?.pages) || 0,
        laterPages,
        requestedPosition: Number(p.currentPage) || 0,
      }));
    } else {
      // Compatibilidad con versiones anteriores de la PWA que todavía
      // envían “páginas leídas en el día”.
      pages = Math.max(0, Math.min(5000, Number(p.pages) || 0));
      const delta = pages - (Number(previous?.pages) || 0);
      currentPage = Math.max(0, Number(book.totalPages) ? Math.min(Number(book.totalPages), Number(book.currentPage) + delta) : Number(book.currentPage) + delta);
      completed = Number(book.totalPages) > 0 && currentPage >= Number(book.totalPages);
    }
    const nextStatus = completed ? "read" : String(book.status) === "read" ? "reading" : book.status;
    const logRows = await upsert("reading_logs", { userEmail: email, bookId, logDate: date, pages, minutes }, ["userEmail", "bookId", "logDate"]);
    const bookRows = await updateRows<ProgressRow>("books", { id: bookId, userEmail: email }, { currentPage, status: nextStatus }, true);
    return patched({ upsert: { readingHistory: logRows, books: bookRows } }, { completed, currentPage, pages });
  },
  add_note: async ({ p, email }) => { const bookId = Number(p.bookId), content = String(p.content ?? "").trim().slice(0, 4000); if (!content || !(await owned("books", email, { id: bookId }))[0]) return fail("Elegí un libro y escribí una nota."); const rows = await insertRows<ProgressRow>("book_notes", { userEmail: email, bookId, content }, { returnRows: true }); return patched({ upsert: { notes: rows } }); },
  delete_note: async ({ p, email }) => { const id = Number(p.id); if (!(await owned("book_notes", email, { id }))[0]) return fail("Nota no encontrada.", 404); await deleteRows("book_notes", { id, userEmail: email }); return patched({ remove: { notes: [id] } }); },
  // Artículos, podcasts y videos de Estudio, con sus propias notas.
  add_resource: async ({ p, email }) => {
    const kind = String(p.kind ?? ""), title = String(p.title ?? "").trim().slice(0, 200), url = String(p.url ?? "").trim().slice(0, 1000);
    if (!["article", "podcast", "video"].includes(kind) || !title) return fail("Completá el título y el tipo.");
    if (url && !/^https?:\/\//i.test(url)) return fail("El link tiene que empezar con http:// o https://");
    const rows = await insertRows<ProgressRow>("study_resources", { userEmail: email, kind, title, author: String(p.author ?? "").trim().slice(0, 160), url }, { returnRows: true });
    return patched({ upsert: { resources: rows } });
  },
  set_resource_status: async ({ p, email }) => {
    const id = Number(p.id), status = String(p.status ?? "");
    if (!["pending", "done"].includes(status) || !(await owned("study_resources", email, { id }))[0]) return fail("Elemento no encontrado.", 404);
    const rows = await updateRows<ProgressRow>("study_resources", { id, userEmail: email }, { status, updatedAt: now() }, true);
    return patched({ upsert: { resources: rows } });
  },
  delete_resource: async ({ p, email }) => {
    const id = Number(p.id);
    if (!(await owned("study_resources", email, { id }))[0]) return fail("Elemento no encontrado.", 404);
    const resourceNotes = await selectRows<ProgressRow>("resource_notes", { where: { userEmail: email, resourceId: id } });
    await deleteRows("study_resources", { id, userEmail: email });
    return patched({ remove: { resources: [id], resourceNotes: resourceNotes.map((row) => row.id) } });
  },
  add_resource_note: async ({ p, email }) => {
    const resourceId = Number(p.resourceId), content = String(p.content ?? "").trim().slice(0, 4000);
    if (!content || !(await owned("study_resources", email, { id: resourceId }))[0]) return fail("Elegí un elemento y escribí una nota.");
    const rows = await insertRows<ProgressRow>("resource_notes", { userEmail: email, resourceId, content }, { returnRows: true });
    return patched({ upsert: { resourceNotes: rows } });
  },
  delete_resource_note: async ({ p, email }) => { const id = Number(p.id); if (!(await owned("resource_notes", email, { id }))[0]) return fail("Nota no encontrada.", 404); await deleteRows("resource_notes", { id, userEmail: email }); return patched({ remove: { resourceNotes: [id] } }); },
  update_book_status: async ({ p, email }) => { const status = String(p.status); if (!["reading", "read", "wishlist"].includes(status)) return fail("Estado inválido."); await updateRows("books", { id: Number(p.bookId), userEmail: email }, { status }); return ok(); },
};
