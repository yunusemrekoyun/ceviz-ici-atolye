CREATE TABLE `admin_login_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`success` integer NOT NULL,
	`reason` text,
	`ip` text,
	`user_agent` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `admin_login_events_created_at_idx` ON `admin_login_events` (`created_at`);--> statement-breakpoint
ALTER TABLE `admin_sessions` ADD `ip` text;--> statement-breakpoint
ALTER TABLE `admin_sessions` ADD `last_ip` text;--> statement-breakpoint
ALTER TABLE `admin_sessions` ADD `user_agent` text;