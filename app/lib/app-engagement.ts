/**
 * Estado persistente de las rachas de uso de AVORA. Se mantiene en el perfil
 * para que funcione igual al entrar desde otro dispositivo.
 */

export type PendingStreakRestore = {
  /** Último día activo antes del primer día perdido. */
  startDate: string;
  /** Racha que llevaba justo antes del primer día perdido. */
  startStreak: number;
  /** Días que se deben recuperar para volver a unir la racha. */
  gapDates: string[];
};

export type AppEngagement = {
  totalUseDays: number;
  currentStreak: number;
  bestStreak: number;
  restoresAvailable: number;
  lastActiveDate: string | null;
  pendingRestore: PendingStreakRestore | null;
  lossNoticePending: boolean;
};

export type EngagementPrompt = "restore" | "lost" | null;

export const MAX_STREAK_RESTORES = 3;
const DAYS_PER_RESTORE = 7;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function emptyAppEngagement(): AppEngagement {
  return {
    totalUseDays: 0,
    currentStreak: 0,
    bestStreak: 0,
    restoresAvailable: 0,
    lastActiveDate: null,
    pendingRestore: null,
    lossNoticePending: false,
  };
}

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function normalizeAppEngagement(value: unknown): AppEngagement {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return emptyAppEngagement();
  const record = value as Record<string, unknown>;
  const pending = typeof record.pendingRestore === "object" && record.pendingRestore !== null && !Array.isArray(record.pendingRestore)
    ? record.pendingRestore as Record<string, unknown>
    : null;
  const pendingDates = Array.isArray(pending?.gapDates)
    ? [...new Set(pending.gapDates.filter(validDate))]
    : [];

  return {
    totalUseDays: Math.max(0, Math.floor(Number(record.totalUseDays) || 0)),
    currentStreak: Math.max(0, Math.floor(Number(record.currentStreak) || 0)),
    bestStreak: Math.max(0, Math.floor(Number(record.bestStreak) || 0)),
    restoresAvailable: Math.max(0, Math.min(MAX_STREAK_RESTORES, Math.floor(Number(record.restoresAvailable) || 0))),
    lastActiveDate: validDate(record.lastActiveDate) ? record.lastActiveDate : null,
    pendingRestore: pending && validDate(pending.startDate) && pendingDates.length
      ? {
          startDate: pending.startDate,
          startStreak: Math.max(0, Math.floor(Number(pending.startStreak) || 0)),
          gapDates: pendingDates,
        }
      : null,
    lossNoticePending: record.lossNoticePending === true,
  };
}

function daysBetween(from: string, to: string) {
  const start = new Date(`${from}T12:00:00Z`).getTime();
  const end = new Date(`${to}T12:00:00Z`).getTime();
  return Math.round((end - start) / 86_400_000);
}

function missingDates(from: string, to: string) {
  const result: string[] = [];
  const cursor = new Date(`${from}T12:00:00Z`);
  cursor.setUTCDate(cursor.getUTCDate() + 1);
  while (cursor.toISOString().slice(0, 10) < to) {
    result.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}

function updateStreakMilestones(previous: number, next: number, lives: number) {
  const earned = Math.max(0, Math.floor(next / DAYS_PER_RESTORE) - Math.floor(previous / DAYS_PER_RESTORE));
  return Math.min(MAX_STREAK_RESTORES, lives + earned);
}

function resetAfterLoss(state: AppEngagement, date: string, totalUseDays: number): AppEngagement {
  return {
    ...state,
    totalUseDays,
    currentStreak: 1,
    lastActiveDate: date,
    pendingRestore: null,
    lossNoticePending: true,
  };
}

/** Registra una visita diaria; repetir el mismo día no suma días ni vidas. */
export function recordAppUse(stateValue: AppEngagement, date: string): { state: AppEngagement; prompt: EngagementPrompt } {
  const state = normalizeAppEngagement(stateValue);
  if (!validDate(date)) return { state, prompt: state.pendingRestore ? "restore" : state.lossNoticePending ? "lost" : null };
  if (state.lastActiveDate && date <= state.lastActiveDate) {
    return { state, prompt: state.pendingRestore ? "restore" : state.lossNoticePending ? "lost" : null };
  }

  const totalUseDays = state.totalUseDays + 1;
  if (!state.lastActiveDate || state.currentStreak === 0) {
    const next = { ...state, totalUseDays, currentStreak: 1, bestStreak: Math.max(state.bestStreak, 1), lastActiveDate: date, pendingRestore: null, lossNoticePending: false };
    return { state: next, prompt: null };
  }

  const distance = daysBetween(state.lastActiveDate, date);
  if (state.pendingRestore) {
    const newGaps = missingDates(state.lastActiveDate, date);
    const gapDates = [...new Set([...state.pendingRestore.gapDates, ...newGaps])].sort();
    if (state.restoresAvailable < 1) {
      const next = resetAfterLoss(state, date, totalUseDays);
      return { state: next, prompt: "lost" };
    }
    const next = {
      ...state,
      totalUseDays,
      lastActiveDate: date,
      pendingRestore: { ...state.pendingRestore, gapDates },
      lossNoticePending: false,
    };
    return { state: next, prompt: "restore" };
  }

  if (distance === 1) {
    const currentStreak = state.currentStreak + 1;
    const next = {
      ...state,
      totalUseDays,
      currentStreak,
      bestStreak: Math.max(state.bestStreak, currentStreak),
      restoresAvailable: updateStreakMilestones(state.currentStreak, currentStreak, state.restoresAvailable),
      lastActiveDate: date,
      lossNoticePending: false,
    };
    return { state: next, prompt: null };
  }

  const gaps = missingDates(state.lastActiveDate, date);
  if (gaps.length > 0 && state.restoresAvailable >= 1) {
    const next = {
      ...state,
      totalUseDays,
      lastActiveDate: date,
      pendingRestore: { startDate: state.lastActiveDate, startStreak: state.currentStreak, gapDates: gaps },
      lossNoticePending: false,
    };
    return { state: next, prompt: "restore" };
  }

  const next = resetAfterLoss(state, date, totalUseDays);
  return { state: next, prompt: state.currentStreak > 0 ? "lost" : null };
}

/** Consume una vida para recuperar la racha completa, sin importar cuántos días faltó. */
export function restoreAppStreak(stateValue: AppEngagement): { state: AppEngagement; prompt: EngagementPrompt } {
  const state = normalizeAppEngagement(stateValue);
  const pending = state.pendingRestore;
  if (!pending || !state.lastActiveDate) return { state, prompt: state.lossNoticePending ? "lost" : null };
  if (state.restoresAvailable < 1) {
    const next = { ...state, currentStreak: 1, pendingRestore: null, lossNoticePending: true };
    return { state: next, prompt: "lost" };
  }

  const currentStreak = pending.startStreak + Math.max(1, daysBetween(pending.startDate, state.lastActiveDate));
  const remainingLives = state.restoresAvailable - 1;
  const next = {
    ...state,
    currentStreak,
    bestStreak: Math.max(state.bestStreak, currentStreak),
    restoresAvailable: updateStreakMilestones(pending.startStreak, currentStreak, remainingLives),
    pendingRestore: null,
    lossNoticePending: false,
  };
  return { state: next, prompt: null };
}

/** Decide seguir sin usar vidas: la racha nueva ya empezó en la visita actual. */
export function declineAppStreakRestore(stateValue: AppEngagement): AppEngagement {
  const state = normalizeAppEngagement(stateValue);
  return {
    ...state,
    currentStreak: state.lastActiveDate ? 1 : 0,
    bestStreak: Math.max(state.bestStreak, state.lastActiveDate ? 1 : 0),
    pendingRestore: null,
    lossNoticePending: false,
  };
}

export function dismissAppStreakLoss(stateValue: AppEngagement): AppEngagement {
  return { ...normalizeAppEngagement(stateValue), lossNoticePending: false };
}

/** La barra deja ver 7/7 el día en que se gana el restablecedor. */
export function restoreProgressFromStreak(currentStreak: number) {
  if (currentStreak <= 0) return 0;
  return currentStreak % DAYS_PER_RESTORE || DAYS_PER_RESTORE;
}
