/** Pruebas de la actualización optimista (`applyPatch`). */

import assert from "node:assert/strict";
import test from "node:test";

import { applyPatch } from "../app/lib/apply-patch";

const TODAY = "2026-09-19";

const base = () => ({
  meals: [{ id: 1, mealDate: TODAY, createdAt: "2026-09-19T09:00:00Z", calories: 300 }],
  mealHistory: [
    { id: 1, mealDate: TODAY, createdAt: "2026-09-19T09:00:00Z", calories: 300 },
    { id: 2, mealDate: "2026-09-18", createdAt: "2026-09-18T20:00:00Z", calories: 500 },
  ],
  tasks: [
    { id: 10, completedAt: null, dueDate: "2026-09-20", createdAt: "2026-09-01T00:00:00Z", title: "a" },
    { id: 11, completedAt: null, dueDate: "2026-09-19", createdAt: "2026-09-02T00:00:00Z", title: "b" },
  ],
  dailyCheckin: null as null | Record<string, unknown>,
  dailyCheckins: [] as Array<Record<string, unknown>>,
  profile: { email: "x@y.z" },
});

test("una comida nueva aparece en el historial y en las de hoy, sin tocar lo demás", () => {
  const data = base();
  const next = applyPatch(data, { upsert: { mealHistory: [{ id: 3, mealDate: TODAY, createdAt: "2026-09-19T13:00:00Z", calories: 700 }] } }, TODAY);
  assert.deepEqual(next.mealHistory.map((meal) => meal.id), [3, 1, 2]);
  assert.deepEqual(next.meals.map((meal) => meal.id), [1, 3]);
  assert.equal(next.tasks, data.tasks);
  assert.equal(data.mealHistory.length, 2, "no muta el original");
});

test("una comida de otro día no entra en las de hoy", () => {
  const next = applyPatch(base(), { upsert: { mealHistory: [{ id: 4, mealDate: "2026-09-18", createdAt: "2026-09-18T21:00:00Z", calories: 100 }] } }, TODAY);
  assert.deepEqual(next.meals.map((meal) => meal.id), [1]);
});

test("borrar una comida la saca de las dos listas", () => {
  const next = applyPatch(base(), { remove: { mealHistory: [1] } }, TODAY);
  assert.deepEqual(next.mealHistory.map((meal) => meal.id), [2]);
  assert.deepEqual(next.meals, []);
});

test("editar una fila la reemplaza y la reordena como el servidor (tildadas primero, nulos al final)", () => {
  const next = applyPatch(base(), { upsert: { tasks: [{ id: 10, completedAt: "2026-09-19T10:00:00Z", dueDate: "2026-09-20", createdAt: "2026-09-01T00:00:00Z", title: "a" }] } }, TODAY);
  assert.deepEqual(next.tasks.map((task) => task.id), [10, 11]);
  assert.equal(next.tasks[0].completedAt, "2026-09-19T10:00:00Z");
  const back = applyPatch(next, { upsert: { tasks: [{ id: 10, completedAt: null, dueDate: "2026-09-20", createdAt: "2026-09-01T00:00:00Z", title: "a" }] } }, TODAY);
  assert.deepEqual(back.tasks.map((task) => task.id), [11, 10]);
});

test("el sueño de hoy actualiza también dailyCheckin", () => {
  const next = applyPatch(base(), { upsert: { dailyCheckins: [{ id: 5, entryDate: TODAY, sleepMinutes: 450 }] } }, TODAY);
  assert.equal(next.dailyCheckin?.sleepMinutes, 450);
  const past = applyPatch(base(), { upsert: { dailyCheckins: [{ id: 6, entryDate: "2026-09-18", sleepMinutes: 400 }] } }, TODAY);
  assert.equal(past.dailyCheckin, null);
});

test("borrar un proyecto de foco quita sus bloques y conserva sus tareas sin proyecto", () => {
  const data = {
    ...base(),
    focusProjects: [{ id: 4, createdAt: "2026-09-01T00:00:00Z", name: "Física", kind: "study" }],
    focusSessions: [{ id: 20, projectId: 4, sessionDate: TODAY, minutes: 90 }],
    tasks: [{ id: 10, projectId: 4, completedAt: null, dueDate: TODAY, createdAt: "2026-09-01T00:00:00Z", title: "Repasar" }],
  };
  const next = applyPatch(data, {
    remove: { focusProjects: [4], focusSessions: [20] },
    upsert: { tasks: [{ id: 10, projectId: null, completedAt: null, dueDate: TODAY, createdAt: "2026-09-01T00:00:00Z", title: "Repasar" }] },
  }, TODAY);
  assert.deepEqual(next.focusProjects, []);
  assert.deepEqual(next.focusSessions, []);
  assert.equal(next.tasks[0].projectId, null);
});

test("ignora colecciones desconocidas o ausentes", () => {
  const data = base();
  const next = applyPatch(data, { upsert: { events: [{ id: 1 }] }, remove: { books: [1] } }, TODAY);
  assert.equal(next.profile, data.profile);
  assert.equal("events" in next, false);
});
