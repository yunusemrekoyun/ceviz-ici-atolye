ALTER TABLE `equipment_orders` ADD `sock_size` text;--> statement-breakpoint
ALTER TABLE `equipment_orders` ADD `sock_delivery` text;--> statement-breakpoint
ALTER TABLE `equipment_orders` ADD `sock_delivered_on` text;--> statement-breakpoint
UPDATE `equipment_orders` SET `sock_delivery` = 'waiting' WHERE `item_id` IN (SELECT `id` FROM `equipment_items` WHERE `name` LIKE '%forma%' AND (`name` LIKE '%tozluk%' OR `name` LIKE '%çorap%'));
