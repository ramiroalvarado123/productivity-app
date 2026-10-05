/** PostgREST indica que falta la migración cuando la tabla aún no existe. */
export function isMissingWeeklyAiSchema(cause: unknown) {
  const message = cause instanceof Error ? cause.message : String(cause);
  return /PGRST205|42P01/.test(message)
    || (/weekly_ai_(?:reviews|memory)/.test(message) && /schema cache|does not exist|not found|404/i.test(message));
}
