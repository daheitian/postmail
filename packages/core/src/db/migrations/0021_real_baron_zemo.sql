DELETE FROM `path_registry` WHERE `owner_type` = 'page';--> statement-breakpoint
DELETE FROM `nav_items` WHERE `type` = 'page';--> statement-breakpoint
DROP TABLE `pages`;--> statement-breakpoint
ALTER TABLE `nav_items` DROP COLUMN `page_id`;