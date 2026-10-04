export type ReadingProgressLog = {
  logDate: string;
  pages: number;
};

function clampPage(value: number, totalPages: number) {
  const maximum = totalPages > 0 ? totalPages : 20000;
  return Math.max(0, Math.min(maximum, Math.round(Number(value) || 0)));
}

/** Página en la que estaba el libro al terminar una fecha concreta. */
export function readingPositionForDate(
  currentPage: number,
  logs: ReadingProgressLog[],
  date: string,
  totalPages = 0,
) {
  const laterPages = logs
    .filter((log) => log.logDate > date)
    .reduce((sum, log) => sum + Math.max(0, Number(log.pages) || 0), 0);
  return clampPage((Number(currentPage) || 0) - laterPages, totalPages);
}

/**
 * Convierte una página absoluta en el avance de la fecha seleccionada.
 * Así la interfaz puede decir “vas por la página 200” sin perder el registro
 * diario que alimenta el Daily Score y la carga retroactiva.
 */
export function readingUpdateFromPosition(input: {
  currentPage: number;
  totalPages: number;
  previousPages: number;
  laterPages: number;
  requestedPosition: number;
}) {
  const currentPage = clampPage(input.currentPage, input.totalPages);
  const positionOnDate = clampPage(currentPage - Math.max(0, input.laterPages), input.totalPages);
  const requestedPosition = clampPage(input.requestedPosition, input.totalPages);
  const delta = requestedPosition - positionOnDate;
  const nextCurrentPage = clampPage(currentPage + delta, input.totalPages);
  const pages = Math.max(0, Math.min(5000, Math.round((Number(input.previousPages) || 0) + delta)));

  return { pages, currentPage: nextCurrentPage, completed: input.totalPages > 0 && nextCurrentPage >= input.totalPages };
}
