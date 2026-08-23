import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const profiles = sqliteTable("profiles", {
  email: text("email").primaryKey(),
  displayName: text("display_name").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const gymAttendance = sqliteTable("gym_attendance", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userEmail: text("user_email").notNull(),
  attendedDate: text("attended_date").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("gym_user_date_unique").on(table.userEmail, table.attendedDate)]);

export const meals = sqliteTable("meals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userEmail: text("user_email").notNull(),
  mealDate: text("meal_date").notNull(),
  name: text("name").notNull(),
  detail: text("detail").notNull().default(""),
  calories: integer("calories").notNull().default(0),
  protein: integer("protein").notNull().default(0),
  carbs: integer("carbs").notNull().default(0),
  fat: integer("fat").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const dietPlans = sqliteTable("diet_plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userEmail: text("user_email").notNull(),
  age: integer("age").notNull(),
  sex: text("sex", { enum: ["female", "male", "unspecified"] }).notNull().default("unspecified"),
  heightCm: integer("height_cm").notNull(),
  currentWeightDeciKg: integer("current_weight_deci_kg").notNull(),
  targetWeightDeciKg: integer("target_weight_deci_kg").notNull(),
  activityLevel: text("activity_level", { enum: ["sedentary", "light", "moderate", "high"] }).notNull().default("light"),
  goalPace: text("goal_pace", { enum: ["gentle", "moderate"] }).notNull().default("gentle"),
  preferences: text("preferences").notNull().default(""),
  details: text("details").notNull().default(""),
  targetCalories: integer("target_calories").notNull(),
  planJson: text("plan_json").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("diet_plan_user_unique").on(table.userEmail)]);

export const books = sqliteTable("books", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userEmail: text("user_email").notNull(),
  title: text("title").notNull(),
  author: text("author").notNull().default(""),
  status: text("status", { enum: ["reading", "read", "wishlist"] }).notNull().default("reading"),
  totalPages: integer("total_pages").notNull().default(0),
  currentPage: integer("current_page").notNull().default(0),
  coverUrl: text("cover_url").notNull().default(""),
  externalKey: text("external_key").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const readingLogs = sqliteTable("reading_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userEmail: text("user_email").notNull(),
  bookId: integer("book_id").notNull(),
  logDate: text("log_date").notNull(),
  pages: integer("pages").notNull().default(0),
  minutes: integer("minutes").notNull().default(0),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("reading_user_book_date_unique").on(table.userEmail, table.bookId, table.logDate)]);

export const bookNotes = sqliteTable("book_notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userEmail: text("user_email").notNull(),
  bookId: integer("book_id").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const monthlyPriorities = sqliteTable("monthly_priorities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userEmail: text("user_email").notNull(),
  monthKey: text("month_key").notNull(),
  gymWeight: integer("gym_weight").notNull().default(2),
  nutritionWeight: integer("nutrition_weight").notNull().default(2),
  readingWeight: integer("reading_weight").notNull().default(2),
  sleepWeight: integer("sleep_weight").notNull().default(2),
  focusWeight: integer("focus_weight").notNull().default(2),
  goalsWeight: integer("goals_weight").notNull().default(2),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("priority_user_month_unique").on(table.userEmail, table.monthKey)]);

export const goals = sqliteTable("goals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userEmail: text("user_email").notNull(),
  title: text("title").notNull(),
  period: text("period", { enum: ["weekly", "monthly", "annual", "custom"] }).notNull(),
  category: text("category", { enum: ["general", "gym", "training", "nutrition", "reading", "study", "work", "sleep", "score", "calendar", "stats", "goals"] }).notNull().default("general"),
  targetDate: text("target_date").notNull(),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const dailyCheckins = sqliteTable("daily_checkins", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userEmail: text("user_email").notNull(),
  entryDate: text("entry_date").notNull(),
  habitsJson: text("habits_json").notNull().default("[]"),
  workoutDetail: text("workout_detail").notNull().default(""),
  studyMinutes: integer("study_minutes").notNull().default(0),
  studyDetail: text("study_detail").notNull().default(""),
  sleepMinutes: integer("sleep_minutes").notNull().default(0),
  bedtime: text("bedtime").notNull().default(""),
  wakeTime: text("wake_time").notNull().default(""),
  waterMl: integer("water_ml").notNull().default(0),
  journal: text("journal").notNull().default(""),
  transcript: text("transcript").notNull().default(""),
  voiceSummary: text("voice_summary").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("daily_checkin_user_date_unique").on(table.userEmail, table.entryDate)]);

export const trainingDisciplines = sqliteTable("training_disciplines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userEmail: text("user_email").notNull(),
  name: text("name").notNull(),
  kind: text("kind", { enum: ["strength", "running", "cycling", "swimming", "sport", "other"] }).notNull().default("other"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("training_discipline_user_name_unique").on(table.userEmail, table.name)]);

export const trainingLogs = sqliteTable("training_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userEmail: text("user_email").notNull(),
  disciplineId: integer("discipline_id").notNull(),
  trainingDate: text("training_date").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(0),
  distanceMeters: integer("distance_meters").notNull().default(0),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("training_user_discipline_date_unique").on(table.userEmail, table.disciplineId, table.trainingDate)]);

export const exerciseLogs = sqliteTable("exercise_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userEmail: text("user_email").notNull(),
  trainingLogId: integer("training_log_id").notNull(),
  exercise: text("exercise").notNull(),
  weightDeciKg: integer("weight_deci_kg").notNull().default(0),
  sets: integer("sets").notNull().default(0),
  reps: integer("reps").notNull().default(0),
  isRecord: integer("is_record", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const focusProjects = sqliteTable("focus_projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userEmail: text("user_email").notNull(),
  name: text("name").notNull(),
  kind: text("kind", { enum: ["study", "work"] }).notNull().default("study"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("focus_project_user_name_unique").on(table.userEmail, table.name)]);

export const focusSessions = sqliteTable("focus_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userEmail: text("user_email").notNull(),
  projectId: integer("project_id").notNull(),
  sessionDate: text("session_date").notNull(),
  minutes: integer("minutes").notNull().default(0),
  note: text("note").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userEmail: text("user_email").notNull(),
  projectId: integer("project_id"),
  title: text("title").notNull(),
  dueDate: text("due_date"),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const calendarEvents = sqliteTable("calendar_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userEmail: text("user_email").notNull(),
  title: text("title").notNull(),
  eventDate: text("event_date").notNull(),
  eventTime: text("event_time").notNull().default(""),
  category: text("category", { enum: ["personal", "study", "work", "training", "health", "other"] }).notNull().default("personal"),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
