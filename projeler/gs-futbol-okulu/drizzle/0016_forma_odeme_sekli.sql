ALTER TABLE `equipment_orders` ADD `paid_method` text;--> statement-breakpoint
ALTER TABLE `equipment_orders` ADD `paid_by` integer;--> statement-breakpoint
UPDATE `equipment_orders` SET `paid_method` = 'cash' WHERE `paid` = 1;
