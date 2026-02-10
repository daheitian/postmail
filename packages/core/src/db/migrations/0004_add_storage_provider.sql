ALTER TABLE `media` ADD COLUMN `provider` text NOT NULL DEFAULT 'r2';
--> statement-breakpoint
ALTER TABLE `media` RENAME COLUMN `r2_key` TO `storage_key`;
