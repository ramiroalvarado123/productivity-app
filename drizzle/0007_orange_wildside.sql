ALTER TABLE `calendar_events` ADD `duration_minutes` integer DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `start_time` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `duration_minutes` integer DEFAULT 0 NOT NULL;