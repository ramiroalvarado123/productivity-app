"use client";
// Copiar a app/preview-ui/page.tsx para ver la app con datos falsos sin login (npm run dev → /preview-ui).
// BORRARLA antes del commit. Mockea fetch de /api/*; editá `store` para el caso que quieras ver.
import ProgressClient from "@/features/app-shell/progress-app";

const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
const shift = (days: number) => { const d = new Date(today + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };
const store: Record<string, unknown> = {
  profile: { email: "demo@test.local", displayName: "Demo", username: "demo", avatarUrl: "", onboardingCompleted: true, mainGoals: ["training"], usagePreferences: [], seenAnnouncements: ["early_adopters_announcement_2026_09_30"], isPro: true, proSince: "2026-09-01", focusDailyTargetMinutes: 120 },
  gymDates: [], disciplines: [{ id: 1, name: "Gimnasio", kind: "strength", priority: "important" }],
  trainingLogs: [{ id: 11, disciplineId: 1, trainingDate: shift(-2), durationMinutes: 0, distanceMeters: 0, notes: "", quality: 3 }],
  exerciseLogs: [], meals: [], mealHistory: [{ id: 31, name: "Avena", detail: "", calories: 350, protein: 12, carbs: 60, fat: 6, mealDate: shift(-1), createdAt: shift(-1) + "T09:00:00Z" }],
  dietPlan: null, books: [], readingLogs: [], readingHistory: [], notes: [],
  priorities: { monthKey: today.slice(0, 7), gymWeight: 3, nutritionWeight: 2, readingWeight: 2, sleepWeight: 3, focusWeight: 2, goalsWeight: 2 }, priorityHistory: [],
  goals: [], dailyCheckin: null, dailyCheckins: [{ id: 71, entryDate: shift(-1), sleepMinutes: 450, bedtime: "23:30", wakeTime: "07:00", sleepQuality: "good" }],
  focusProjects: [], focusSessions: [], tasks: [], events: [], resources: [], resourceNotes: [],
};
const social = { me: "demo@test.local", friends: [], incoming: [], outgoing: [], groups: [], groupInvites: [] };
if (typeof window !== "undefined" && !(window as unknown as { __mocked?: boolean }).__mocked) {
  (window as unknown as { __mocked?: boolean }).__mocked = true;
  const json = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } }));
  const realFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (!url.startsWith("/api/")) return realFetch(input, init);
    if (url.startsWith("/api/progress")) return init?.method === "POST" ? json({ ok: true }) : json(JSON.parse(JSON.stringify(store)));
    if (url.startsWith("/api/streaks")) return json({ state: { totalUseDays: 5, currentStreak: 5, bestStreak: 5, restoresAvailable: 0, lastActiveDate: today, pendingRestore: null, lossNoticePending: false } });
    if (url.startsWith("/api/friends")) return init?.method === "POST" ? json({ ok: true }) : json(social);
    return json({ ok: true });
  };
}
export default function PreviewPage() {
  return <ProgressClient initialUser={store.profile as never} />;
}
