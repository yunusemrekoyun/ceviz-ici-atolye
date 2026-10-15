CREATE TABLE `access_overrides` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`registration_id` integer NOT NULL,
	`reason` text NOT NULL,
	`starts_on` text NOT NULL,
	`ends_on` text NOT NULL,
	`created_by` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`revoked_at` text,
	`revoked_by` integer,
	FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `access_overrides_registration_idx` ON `access_overrides` (`registration_id`);--> statement-breakpoint
CREATE TABLE `fee_periods` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`registration_id` integer NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`due_date` text NOT NULL,
	`amount_kurus` integer NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`payment_id` integer,
	`note` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fee_periods_reg_start_unique` ON `fee_periods` (`registration_id`,`start_date`);--> statement-breakpoint
CREATE INDEX `fee_periods_status_idx` ON `fee_periods` (`status`);--> statement-breakpoint
CREATE TABLE `job_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job` text NOT NULL,
	`run_key` text NOT NULL,
	`status` text NOT NULL,
	`detail` text,
	`started_at` text NOT NULL,
	`finished_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `job_runs_job_key_unique` ON `job_runs` (`job`,`run_key`);--> statement-breakpoint
CREATE TABLE `notification_reads` (
	`notification_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`read_at` text NOT NULL,
	PRIMARY KEY(`notification_id`, `user_id`),
	FOREIGN KEY (`notification_id`) REFERENCES `notifications`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`permission` text,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`body` text,
	`link` text,
	`dedupe_key` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notifications_user_idx` ON `notifications` (`user_id`);--> statement-breakpoint
CREATE INDEX `notifications_created_idx` ON `notifications` (`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `notifications_dedupe_unique` ON `notifications` (`dedupe_key`);--> statement-breakpoint
CREATE TABLE `payment_claims` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`registration_id` integer NOT NULL,
	`user_id` integer,
	`method` text NOT NULL,
	`file_id` integer,
	`note` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`decided_by` integer,
	`decided_at` text,
	`reject_reason` text,
	`payment_id` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`file_id`) REFERENCES `files`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `payment_claims_status_idx` ON `payment_claims` (`status`);--> statement-breakpoint
CREATE INDEX `payment_claims_registration_idx` ON `payment_claims` (`registration_id`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`registration_id` integer NOT NULL,
	`receipt_no` text NOT NULL,
	`amount_kurus` integer NOT NULL,
	`method` text NOT NULL,
	`paid_on` text NOT NULL,
	`period_count` integer NOT NULL,
	`note` text,
	`file_id` integer,
	`claim_id` integer,
	`created_by` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`voided_at` text,
	`voided_by` integer,
	`void_reason` text,
	FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`file_id`) REFERENCES `files`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payments_receipt_no_unique` ON `payments` (`receipt_no`);--> statement-breakpoint
CREATE INDEX `payments_registration_idx` ON `payments` (`registration_id`);--> statement-breakpoint
CREATE INDEX `payments_paid_on_idx` ON `payments` (`paid_on`);--> statement-breakpoint
ALTER TABLE `registrations` ADD `billing_day` integer;--> statement-breakpoint
ALTER TABLE `registrations` ADD `billing_anchor` text;--> statement-breakpoint
ALTER TABLE `registrations` ADD `left_at` text;--> statement-breakpoint
UPDATE `registrations` SET `billing_day` = CAST(strftime('%d', COALESCE(`enrolled_at`, `created_at`), '+3 hours') AS integer), `billing_anchor` = date(COALESCE(`enrolled_at`, `created_at`), '+3 hours') WHERE `status` = 'enrolled';
