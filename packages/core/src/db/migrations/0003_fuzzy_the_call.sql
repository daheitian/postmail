DROP INDEX `idx_media_storage_key`;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_media_storage_key` ON `media` (`storage_key`);