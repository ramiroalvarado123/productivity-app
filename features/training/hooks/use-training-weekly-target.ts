// Meta semanal de entrenamientos para la racha de constancia: vive en este
// navegador (localStorage), no en el servidor, así que se lee con
// useSyncExternalStore en vez de useState+useEffect. Evita el flash de
// hidratación (el snapshot de servidor siempre es el default) y el
// cascading-render de hacer setState dentro de un efecto.
export const TRAINING_WEEKLY_TARGET_KEY = "avora:training-weekly-target";
export const trainingWeeklyTargetListeners = new Set<() => void>();
export function subscribeTrainingWeeklyTarget(onChange: () => void) {
  trainingWeeklyTargetListeners.add(onChange);
  return () => trainingWeeklyTargetListeners.delete(onChange);
}
export function getTrainingWeeklyTargetSnapshot() {
  const stored = Number(window.localStorage.getItem(TRAINING_WEEKLY_TARGET_KEY));
  return stored > 0 ? stored : 3;
}
export function getTrainingWeeklyTargetServerSnapshot() {
  return 3;
}
export function setTrainingWeeklyTargetValue(value: number) {
  const next = Math.min(14, Math.max(1, Math.round(value)));
  window.localStorage.setItem(TRAINING_WEEKLY_TARGET_KEY, String(next));
  trainingWeeklyTargetListeners.forEach((listener) => listener());
}
