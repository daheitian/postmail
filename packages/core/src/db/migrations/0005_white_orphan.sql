ALTER TABLE `post` ADD `last_activity_at` integer;--> statement-breakpoint
CREATE INDEX `idx_post_status_deleted_activity` ON `post` (`status`,`deleted_at`,`last_activity_at`);--> statement-breakpoint
UPDATE `post` SET `last_activity_at` = `published_at` WHERE `last_activity_at` IS NULL;