CREATE TABLE `daily_checkins` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_email` text NOT NULL,
	`entry_date` text NOT NULL,
	`habits_json` text DEFAULT '[]' NOT NULL,
	`workout_detail` text DEFAULT '' NOT NULL,
	`study_minutes` integer DEFAULT 0 NOT NULL,
	`study_detail` text DEFAULT '' NOT NULL,
	`sleep_minutes` integer DEFAULT 0 NOT NULL,
	`bedtime` text DEFAULT '' NOT NULL,
	`wake_time` text DEFAULT '' NOT NULL,
	`water_ml` integer DEFAULT 0 NOT NULL,
	`journal` text DEFAULT '' NOT NULL,
	`transcript` text DEFAULT '' NOT NULL,
	`voice_summary` text DEFAULT '' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_checkin_user_date_unique` ON `daily_checkins` (`user_email`,`entry_date`);--> statement-breakpoint
ALTER TABLE `meals` ADD `protein` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `meals` ADD `carbs` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `meals` ADD `fat` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `reading_logs` ADD `minutes` integer DEFAULT 0 NOT NULL;