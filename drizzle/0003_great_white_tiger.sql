CREATE TABLE `calendar_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_email` text NOT NULL,
	`title` text NOT NULL,
	`event_date` text NOT NULL,
	`event_time` text DEFAULT '' NOT NULL,
	`category` text DEFAULT 'personal' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `exercise_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_email` text NOT NULL,
	`training_log_id` integer NOT NULL,
	`exercise` text NOT NULL,
	`weight_deci_kg` integer DEFAULT 0 NOT NULL,
	`sets` integer DEFAULT 0 NOT NULL,
	`reps` integer DEFAULT 0 NOT NULL,
	`is_record` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `focus_projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_email` text NOT NULL,
	`name` text NOT NULL,
	`kind` text DEFAULT 'study' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `focus_project_user_name_unique` ON `focus_projects` (`user_email`,`name`);--> statement-breakpoint
CREATE TABLE `focus_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_email` text NOT NULL,
	`project_id` integer NOT NULL,
	`session_date` text NOT NULL,
	`minutes` integer DEFAULT 0 NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_email` text NOT NULL,
	`project_id` integer,
	`title` text NOT NULL,
	`due_date` text,
	`completed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `training_disciplines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_email` text NOT NULL,
	`name` text NOT NULL,
	`kind` text DEFAULT 'other' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `training_discipline_user_name_unique` ON `training_disciplines` (`user_email`,`name`);--> statement-breakpoint
CREATE TABLE `training_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_email` text NOT NULL,
	`discipline_id` integer NOT NULL,
	`training_date` text NOT NULL,
	`duration_minutes` integer DEFAULT 0 NOT NULL,
	`distance_meters` integer DEFAULT 0 NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `training_user_discipline_date_unique` ON `training_logs` (`user_email`,`discipline_id`,`training_date`);