CREATE TABLE `equipment_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`price_kurus` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `equipment_orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`registration_id` integer NOT NULL,
	`item_id` integer NOT NULL,
	`size` text,
	`price_kurus` integer NOT NULL,
	`paid` integer DEFAULT false NOT NULL,
	`paid_on` text,
	`delivery` text DEFAULT 'waiting' NOT NULL,
	`delivered_on` text,
	`note` text,
	`created_by` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `equipment_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `equipment_orders_registration_idx` ON `equipment_orders` (`registration_id`);--> statement-breakpoint
CREATE INDEX `equipment_orders_item_idx` ON `equipment_orders` (`item_id`);--> statement-breakpoint
CREATE TABLE `registration_submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`registration_id` integer NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`decided_by` integer,
	`decided_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `registration_submissions_reg_idx` ON `registration_submissions` (`registration_id`);--> statement-breakpoint
ALTER TABLE `registrations` ADD `discount_name` text;--> statement-breakpoint
ALTER TABLE `registrations` ADD `discount_percent` integer;--> statement-breakpoint
ALTER TABLE `registrations` ADD `not_duplicate_of` text;--> statement-breakpoint
INSERT INTO `equipment_items` (`name`,`price_kurus`,`sort`) VALUES ('Forma + Şort + Tozluk',220000,10);--> statement-breakpoint
INSERT INTO `equipment_items` (`name`,`price_kurus`,`sort`) VALUES ('Eşofman',0,20);
