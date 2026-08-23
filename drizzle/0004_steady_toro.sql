CREATE TABLE `diet_plans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_email` text NOT NULL,
	`age` integer NOT NULL,
	`sex` text DEFAULT 'unspecified' NOT NULL,
	`height_cm` integer NOT NULL,
	`current_weight_deci_kg` integer NOT NULL,
	`target_weight_deci_kg` integer NOT NULL,
	`activity_level` text DEFAULT 'light' NOT NULL,
	`goal_pace` text DEFAULT 'gentle' NOT NULL,
	`preferences` text DEFAULT '' NOT NULL,
	`details` text DEFAULT '' NOT NULL,
	`target_calories` integer NOT NULL,
	`plan_json` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `diet_plan_user_unique` ON `diet_plans` (`user_email`);--> statement-breakpoint
ALTER TABLE `monthly_priorities` ADD `sleep_weight` integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE `monthly_priorities` ADD `focus_weight` integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE `monthly_priorities` ADD `goals_weight` integer DEFAULT 2 NOT NULL;