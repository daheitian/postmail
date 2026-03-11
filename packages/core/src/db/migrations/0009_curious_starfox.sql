PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_media` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text,
	`filename` text NOT NULL,
	`original_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`size` integer NOT NULL,
	`storage_key` text NOT NULL,
	`provider` text DEFAULT 'r2' NOT NULL,
	`width` integer,
	`height` integer,
	`alt` text,
	`position` integer DEFAULT 0 NOT NULL,
	`blurhash` text,
	`waveform` text,
	`poster_key` text,
	`summary` text,
	`chars` integer,
	`media_kind` text DEFAULT 'document' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "chk_media_provider" CHECK("__new_media"."provider" IN ('r2', 's3')),
	CONSTRAINT "chk_media_media_kind" CHECK("__new_media"."media_kind" IN ('image', 'video', 'audio', 'text', 'document')),
	CONSTRAINT "chk_media_size_positive" CHECK("__new_media"."size" > 0),
	CONSTRAINT "chk_media_position_nonnegative" CHECK("__new_media"."position" >= 0),
	CONSTRAINT "chk_media_dimensions_positive" CHECK((
        "__new_media"."width" IS NULL OR "__new_media"."width" > 0
      ) AND (
        "__new_media"."height" IS NULL OR "__new_media"."height" > 0
      )),
	CONSTRAINT "chk_media_chars_nonnegative" CHECK("__new_media"."chars" IS NULL OR "__new_media"."chars" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_media`("id", "post_id", "filename", "original_name", "mime_type", "size", "storage_key", "provider", "width", "height", "alt", "position", "blurhash", "waveform", "poster_key", "summary", "chars", "media_kind", "created_at", "updated_at") SELECT "id", "post_id", "filename", "original_name", "mime_type", "size", "storage_key", "provider", "width", "height", "alt", "position", "blurhash", "waveform", "poster_key", "summary", "chars", "media_kind", "created_at", "updated_at" FROM `media`;--> statement-breakpoint
DROP TABLE `media`;--> statement-breakpoint
ALTER TABLE `__new_media` RENAME TO `media`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_media_post_id_position` ON `media` (`post_id`,`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_media_storage_key` ON `media` (`storage_key`);--> statement-breakpoint
CREATE INDEX `idx_media_media_kind_post_id` ON `media` (`media_kind`,`post_id`);--> statement-breakpoint
CREATE INDEX `idx_post_root_live_published_activity` ON `post` (`last_activity_at`,`id`) WHERE "post"."deleted_at" IS NULL AND "post"."reply_to_id" IS NULL AND "post"."status" = 'published';--> statement-breakpoint
CREATE INDEX `idx_post_root_live_draft_updated` ON `post` (`updated_at`,`id`) WHERE "post"."deleted_at" IS NULL AND "post"."reply_to_id" IS NULL AND "post"."status" = 'draft';--> statement-breakpoint
CREATE INDEX `idx_post_reply_live_thread_created` ON `post` (`thread_id`,`created_at`,`id`) WHERE "post"."deleted_at" IS NULL AND "post"."reply_to_id" IS NOT NULL AND "post"."status" = 'published';--> statement-breakpoint
CREATE INDEX `idx_session_user_id` ON `session` (`user_id`);