CREATE TABLE `registrations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_tc` text NOT NULL,
	`student_full_name` text NOT NULL,
	`birth_date` text NOT NULL,
	`home_address` text NOT NULL,
	`student_phone` text NOT NULL,
	`blood_group` text NOT NULL,
	`email` text,
	`father_full_name` text,
	`father_tc` text,
	`father_phone` text,
	`mother_full_name` text,
	`mother_tc` text,
	`mother_phone` text,
	`contact_parent_type` text NOT NULL,
	`contact_parent_full_name` text,
	`contact_parent_phone` text,
	`emergency_full_name` text NOT NULL,
	`emergency_relation` text NOT NULL,
	`emergency_phone` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `registrations_student_tc_unique` ON `registrations` (`student_tc`);--> statement-breakpoint
CREATE INDEX `registrations_created_at_idx` ON `registrations` (`created_at`);