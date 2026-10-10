/** Los campos de un objetivo mientras se escribe, antes de existir en el grupo. */
import type { GoalMetric, GoalMode, GoalSource, GroupGoal } from "@/features/friends/logic/social";
export type GoalDraft = { title: string; source: GoalSource; metric: GoalMetric; mode: GoalMode; targetValue: number; period: GroupGoal["period"]; dueDate: string };
/** Qué se está administrando de un grupo: el engranaje, el más o los amigos. */
export type GroupPanelTab = "settings" | "goals" | "members";
export const emptyGoalDraft = (): GoalDraft => ({ title: "", source: "manual", metric: "count", mode: "shared", targetValue: 3, period: "weekly", dueDate: "" });
