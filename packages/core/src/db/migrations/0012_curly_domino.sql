DROP INDEX `idx_media_storage_key`;--> statement-breakpoint
CREATE UNIQUE INDEX `uq_media_provider_storage_key` ON `media` (`provider`,`storage_key`);