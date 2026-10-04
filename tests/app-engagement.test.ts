import assert from "node:assert/strict";
import test from "node:test";

import {
  declineAppStreakRestore,
  emptyAppEngagement,
  recordAppUse,
  restoreAppStreak,
} from "@/features/engagement/logic/app-engagement";
import {
  profileEngagement,
  profilePreferences,
  usagePreferencesJsonWithEngagement,
  usagePreferencesJsonWithPreferences,
} from "@/domain/profile-metadata";

function day(offset: number) {
  const date = new Date("2026-09-01T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

test("una visita por día suma la racha y entrega una vida al séptimo día", () => {
  let state = emptyAppEngagement();
  for (let offset = 0; offset < 7; offset += 1) state = recordAppUse(state, day(offset)).state;
  assert.equal(state.totalUseDays, 7);
  assert.equal(state.currentStreak, 7);
  assert.equal(state.bestStreak, 7);
  assert.equal(state.restoresAvailable, 1);

  const repeated = recordAppUse(state, day(6));
  assert.equal(repeated.state.totalUseDays, 7);
  assert.equal(repeated.state.currentStreak, 7);
});

test("las vidas se acumulan hasta tres", () => {
  let state = emptyAppEngagement();
  for (let offset = 0; offset < 22; offset += 1) state = recordAppUse(state, day(offset)).state;
  assert.equal(state.currentStreak, 22);
  assert.equal(state.restoresAvailable, 3);
});

test("una vida recupera un día perdido y mantiene los días reales de uso separados", () => {
  let state = emptyAppEngagement();
  for (let offset = 0; offset < 7; offset += 1) state = recordAppUse(state, day(offset)).state;
  const missedDay = recordAppUse(state, day(8));
  assert.equal(missedDay.prompt, "restore");
  assert.equal(missedDay.state.totalUseDays, 8);
  assert.deepEqual(missedDay.state.pendingRestore?.gapDates, [day(7)]);

  const restored = restoreAppStreak(missedDay.state);
  assert.equal(restored.prompt, null);
  assert.equal(restored.state.currentStreak, 9);
  assert.equal(restored.state.bestStreak, 9);
  assert.equal(restored.state.restoresAvailable, 0);
  assert.equal(restored.state.totalUseDays, 8);
  assert.equal(restored.state.pendingRestore, null);
});

test("una sola vida recupera la racha completa aunque falten varios días", () => {
  let state = emptyAppEngagement();
  for (let offset = 0; offset < 7; offset += 1) state = recordAppUse(state, day(offset)).state;
  const returned = recordAppUse(state, day(10));
  assert.equal(returned.prompt, "restore");
  assert.equal(returned.state.pendingRestore?.gapDates.length, 3);
  assert.equal(returned.state.restoresAvailable, 1);

  const restored = restoreAppStreak(returned.state);
  assert.equal(restored.state.currentStreak, 11);
  assert.equal(restored.state.restoresAvailable, 0);
  assert.equal(restored.state.totalUseDays, 8);
});

test("si no quedan vidas, la racha se reinicia y se informa una sola vez", () => {
  let state = emptyAppEngagement();
  state = recordAppUse(state, day(0)).state;
  state = { ...state, currentStreak: 5, bestStreak: 5 };
  const lost = recordAppUse(state, day(2));
  assert.equal(lost.prompt, "lost");
  assert.equal(lost.state.currentStreak, 1);
  assert.equal(lost.state.bestStreak, 5);
  assert.equal(lost.state.lossNoticePending, true);
});

test("rechazar un restablecedor inicia una racha nueva y conserva el saldo", () => {
  let state = emptyAppEngagement();
  for (let offset = 0; offset < 7; offset += 1) state = recordAppUse(state, day(offset)).state;
  const offered = recordAppUse(state, day(8)).state;
  const declined = declineAppStreakRestore(offered);
  assert.equal(declined.currentStreak, 1);
  assert.equal(declined.restoresAvailable, 1);
  assert.equal(declined.bestStreak, 7);
  assert.equal(declined.pendingRestore, null);
});

test("las preferencias antiguas y las rachas se preservan en el perfil", () => {
  const legacy = JSON.stringify(["weekly", "quick"]);
  const state = { ...emptyAppEngagement(), totalUseDays: 19, currentStreak: 4, bestStreak: 8 };
  const withState = usagePreferencesJsonWithEngagement(legacy, state);
  assert.deepEqual(profilePreferences(withState), ["weekly", "quick"]);
  assert.equal(profileEngagement(withState).totalUseDays, 19);

  const updated = usagePreferencesJsonWithPreferences(withState, ["quick"]);
  assert.deepEqual(profilePreferences(updated), ["quick"]);
  assert.equal(profileEngagement(updated).bestStreak, 8);
});
