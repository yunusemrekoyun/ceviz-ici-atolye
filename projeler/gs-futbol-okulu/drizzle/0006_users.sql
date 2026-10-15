CREATE TABLE `login_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`identifier` text NOT NULL,
	`user_id` integer,
	`success` integer NOT NULL,
	`reason` text,
	`ip` text,
	`user_agent` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `login_events_created_at_idx` ON `login_events` (`created_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` text NOT NULL,
	`last_seen_at` text NOT NULL,
	`ip` text,
	`last_ip` text,
	`user_agent` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`role` text NOT NULL,
	`username` text,
	`email` text,
	`phone` text,
	`full_name` text,
	`password_hash` text,
	`status` text DEFAULT 'active' NOT NULL,
	`last_login_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role`);--> statement-breakpoint
INSERT INTO `users` (`id`, `role`, `username`, `password_hash`, `status`, `created_at`, `updated_at`)
	SELECT `id`, 'admin', `username`, `password_hash`, 'active', `created_at`, `updated_at` FROM `admins`;--> statement-breakpoint
INSERT INTO `sessions` (`id`, `user_id`, `expires_at`, `last_seen_at`, `ip`, `last_ip`, `user_agent`, `created_at`)
	SELECT `id`, `admin_id`, `expires_at`, `last_seen_at`, `ip`, `last_ip`, `user_agent`, `created_at` FROM `admin_sessions`;--> statement-breakpoint
INSERT INTO `login_events` (`identifier`, `user_id`, `success`, `reason`, `ip`, `user_agent`, `created_at`)
	SELECT e.`username`, u.`id`, e.`success`, e.`reason`, e.`ip`, e.`user_agent`, e.`created_at`
	FROM `admin_login_events` e LEFT JOIN `users` u ON u.`username` = e.`username`;
