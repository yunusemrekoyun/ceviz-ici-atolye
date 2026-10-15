CREATE TABLE `age_groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`min_birth_year` integer NOT NULL,
	`max_birth_year` integer NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `registrations` ADD `status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `registrations` ADD `appointment_at` text;--> statement-breakpoint
ALTER TABLE `registrations` ADD `no_show_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `registrations` ADD `enrolled_at` text;--> statement-breakpoint
ALTER TABLE `registrations` ADD `height_cm` integer;--> statement-breakpoint
ALTER TABLE `registrations` ADD `weight_kg` real;--> statement-breakpoint
ALTER TABLE `registrations` ADD `group_id` integer REFERENCES age_groups(id) ON DELETE set null;--> statement-breakpoint
ALTER TABLE `registrations` ADD `admin_note` text;--> statement-breakpoint
CREATE INDEX `registrations_status_idx` ON `registrations` (`status`);--> statement-breakpoint
CREATE INDEX `registrations_appointment_at_idx` ON `registrations` (`appointment_at`);--> statement-breakpoint
INSERT INTO `age_groups` (`name`, `min_birth_year`, `max_birth_year`) VALUES
	('1. Grup', 2019, 2021),
	('2. Grup', 2017, 2018),
	('3. Grup', 2015, 2016),
	('4. Grup', 2013, 2014),
	('5. Grup', 2011, 2012);
