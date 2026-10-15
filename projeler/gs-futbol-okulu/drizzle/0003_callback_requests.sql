CREATE TABLE `callback_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`full_name` text NOT NULL,
	`phone` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`note` text,
	`handled_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `callback_requests_status_idx` ON `callback_requests` (`status`);--> statement-breakpoint
CREATE INDEX `callback_requests_created_at_idx` ON `callback_requests` (`created_at`);