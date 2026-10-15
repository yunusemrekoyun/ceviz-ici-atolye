CREATE TABLE `audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`user_name` text,
	`action` text NOT NULL,
	`entity` text,
	`entity_id` text,
	`summary` text NOT NULL,
	`data` text,
	`ip` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `audit_log_created_at_idx` ON `audit_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `audit_log_entity_idx` ON `audit_log` (`entity`,`entity_id`);--> statement-breakpoint
CREATE TABLE `roles` (
	`key` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`portal` text NOT NULL,
	`permissions` text DEFAULT '[]' NOT NULL,
	`is_system` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);--> statement-breakpoint
INSERT INTO `roles` (`key`, `name`, `portal`, `permissions`, `is_system`) VALUES
	('admin', 'Yönetici', 'admin', '["kayit.gor", "kayit.duzenle", "kayit.sil", "hassas.gor", "aidat.gor", "aidat.al", "erisim.ac", "program.yonet", "yoklama.al", "gelisim.gir", "tum.gruplar", "duyuru.yap", "veli.yonet", "metin.yonet", "ekip.yonet", "ayar.yonet", "rapor.gor", "guvenlik.gor"]', 1),
	('coach', 'Antrenör', 'coach', '["yoklama.al", "gelisim.gir"]', 1),
	('guardian', 'Veli', 'guardian', '[]', 1);
