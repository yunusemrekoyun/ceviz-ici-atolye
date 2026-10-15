PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_registrations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_tc` text,
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
	`status` text DEFAULT 'pending' NOT NULL,
	`appointment_at` text,
	`no_show_count` integer DEFAULT 0 NOT NULL,
	`enrolled_at` text,
	`height_cm` integer,
	`weight_kg` real,
	`group_id` integer,
	`admin_note` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `age_groups`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_registrations`("id", "student_tc", "student_full_name", "birth_date", "home_address", "student_phone", "blood_group", "email", "father_full_name", "father_tc", "father_phone", "mother_full_name", "mother_tc", "mother_phone", "contact_parent_type", "contact_parent_full_name", "contact_parent_phone", "emergency_full_name", "emergency_relation", "emergency_phone", "status", "appointment_at", "no_show_count", "enrolled_at", "height_cm", "weight_kg", "group_id", "admin_note", "created_at", "updated_at") SELECT "id", "student_tc", "student_full_name", "birth_date", "home_address", "student_phone", "blood_group", "email", "father_full_name", "father_tc", "father_phone", "mother_full_name", "mother_tc", "mother_phone", "contact_parent_type", "contact_parent_full_name", "contact_parent_phone", "emergency_full_name", "emergency_relation", "emergency_phone", "status", "appointment_at", "no_show_count", "enrolled_at", "height_cm", "weight_kg", "group_id", "admin_note", "created_at", "updated_at" FROM `registrations`;--> statement-breakpoint
DROP TABLE `registrations`;--> statement-breakpoint
ALTER TABLE `__new_registrations` RENAME TO `registrations`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `registrations_student_tc_unique` ON `registrations` (`student_tc`);--> statement-breakpoint
CREATE INDEX `registrations_created_at_idx` ON `registrations` (`created_at`);--> statement-breakpoint
CREATE INDEX `registrations_status_idx` ON `registrations` (`status`);--> statement-breakpoint
CREATE INDEX `registrations_appointment_at_idx` ON `registrations` (`appointment_at`);