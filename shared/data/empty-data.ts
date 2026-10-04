import type { ProgressData, User } from "@/shared/data/types";
export const emptyData = (user: User, monthKey: string): ProgressData => ({
  profile: user, gymDates: [], disciplines: [], trainingLogs: [], exerciseLogs: [], meals: [], mealHistory: [], books: [],
  readingLogs: [], readingHistory: [], notes: [], goals: [], priorities: { monthKey, gymWeight: 2, nutritionWeight: 2, readingWeight: 2, sleepWeight: 2, focusWeight: 2, goalsWeight: 2 },
  dailyCheckin: null, dailyCheckins: [], focusProjects: [], focusSessions: [], tasks: [], events: [],
  dietPlan: null, resources: [], resourceNotes: [],
});
