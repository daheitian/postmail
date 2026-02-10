ALTER TABLE `media` ADD COLUMN `position` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `media` ADD COLUMN `blurhash` text;
