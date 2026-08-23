ALTER TABLE `profiles` ADD `onboarding_completed` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `main_goals_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `usage_preferences_json` text DEFAULT '[]' NOT NULL;