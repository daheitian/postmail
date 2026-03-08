ALTER TABLE `media` ADD `media_kind` text DEFAULT 'document' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_media_media_kind` ON `media` (`media_kind`);--> statement-breakpoint
UPDATE `media` SET `media_kind` = 'image' WHERE `mime_type` LIKE 'image/%';--> statement-breakpoint
UPDATE `media` SET `media_kind` = 'video' WHERE `mime_type` LIKE 'video/%';--> statement-breakpoint
UPDATE `media` SET `media_kind` = 'audio' WHERE `mime_type` LIKE 'audio/%';--> statement-breakpoint
UPDATE `media` SET `media_kind` = 'text' WHERE `mime_type` LIKE 'text/%' OR `mime_type` IN ('application/json', 'application/xml', 'application/yaml', 'application/toml');