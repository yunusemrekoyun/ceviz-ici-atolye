CREATE TABLE `drills` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`description` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `evaluations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`registration_id` integer NOT NULL,
	`evaluated_on` text NOT NULL,
	`scores` text NOT NULL,
	`comment` text,
	`created_by` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `evaluations_registration_idx` ON `evaluations` (`registration_id`);--> statement-breakpoint
CREATE TABLE `measurements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`registration_id` integer NOT NULL,
	`measured_on` text NOT NULL,
	`height_cm` real,
	`weight_kg` real,
	`created_by` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `measurements_reg_day_unique` ON `measurements` (`registration_id`,`measured_on`);--> statement-breakpoint
CREATE TABLE `session_drills` (
	`session_id` integer NOT NULL,
	`drill_id` integer NOT NULL,
	PRIMARY KEY(`session_id`, `drill_id`),
	FOREIGN KEY (`session_id`) REFERENCES `training_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`drill_id`) REFERENCES `drills`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `test_definitions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`unit` text NOT NULL,
	`higher_better` integer DEFAULT true NOT NULL,
	`decimals` integer DEFAULT 1 NOT NULL,
	`group_ids` text,
	`description` text,
	`active` integer DEFAULT true NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `test_results` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`test_id` integer NOT NULL,
	`registration_id` integer NOT NULL,
	`tested_on` text NOT NULL,
	`value` real NOT NULL,
	`created_by` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`test_id`) REFERENCES `test_definitions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `test_results_unique` ON `test_results` (`test_id`,`registration_id`,`tested_on`);--> statement-breakpoint
CREATE INDEX `test_results_registration_idx` ON `test_results` (`registration_id`);--> statement-breakpoint
INSERT OR IGNORE INTO `measurements` (`registration_id`,`measured_on`,`height_cm`,`weight_kg`) SELECT `id`, date(COALESCE(`enrolled_at`, `created_at`), '+3 hours'), `height_cm`, `weight_kg` FROM `registrations` WHERE `height_cm` IS NOT NULL OR `weight_kg` IS NOT NULL;
