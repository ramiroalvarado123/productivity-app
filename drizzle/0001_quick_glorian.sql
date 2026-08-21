CREATE TABLE `goals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_email` text NOT NULL,
	`title` text NOT NULL,
	`period` text NOT NULL,
	`category` text DEFAULT 'general' NOT NULL,
	`target_date` text NOT NULL,
	`completed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `monthly_priorities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_email` text NOT NULL,
	`month_key` text NOT NULL,
	`gym_weight` integer DEFAULT 2 NOT NULL,
	`nutrition_weight` integer DEFAULT 2 NOT NULL,
	`reading_weight` integer DEFAULT 2 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `priority_user_month_unique` ON `monthly_priorities` (`user_email`,`month_key`);