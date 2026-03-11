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
	`position` text DEFAULT 'a0' NOT NULL,
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
	CONSTRAINT "chk_media_position_not_blank" CHECK(trim("__new_media"."position") <> ''),
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
CREATE UNIQUE INDEX `uq_media_post_position` ON `media` (`post_id`,`position`) WHERE "media"."post_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_media_storage_key` ON `media` (`storage_key`);--> statement-breakpoint
CREATE INDEX `idx_media_media_kind_post_id` ON `media` (`media_kind`,`post_id`);--> statement-breakpoint
CREATE TABLE `__new_post` (
	`id` text PRIMARY KEY NOT NULL,
	`format` text NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`visibility` text DEFAULT 'public' NOT NULL,
	`pinned_at` integer,
	`featured_at` integer,
	`title` text,
	`url` text,
	`body` text,
	`body_html` text,
	`body_text` text,
	`quote_text` text,
	`summary` text,
	`rating` integer,
	`reply_to_id` text,
	`thread_id` text NOT NULL,
	`deleted_at` integer,
	`published_at` integer,
	`last_activity_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`reply_to_id`) REFERENCES `post`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`thread_id`) REFERENCES `post`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reply_to_id`,`thread_id`) REFERENCES `post`(`id`,`thread_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_post_format" CHECK("__new_post"."format" IN ('note', 'link', 'quote')),
	CONSTRAINT "chk_post_status" CHECK("__new_post"."status" IN ('draft', 'published')),
	CONSTRAINT "chk_post_visibility" CHECK("__new_post"."visibility" IN ('public', 'unlisted', 'private')),
	CONSTRAINT "chk_post_reply_to_not_self" CHECK("__new_post"."reply_to_id" IS NULL OR "__new_post"."reply_to_id" <> "__new_post"."id"),
	CONSTRAINT "chk_post_thread_shape" CHECK((
        "__new_post"."reply_to_id" IS NULL
        AND "__new_post"."thread_id" = "__new_post"."id"
      ) OR (
        "__new_post"."reply_to_id" IS NOT NULL
        AND "__new_post"."thread_id" <> "__new_post"."id"
      )),
	CONSTRAINT "chk_post_reply_not_pinned" CHECK("__new_post"."pinned_at" IS NULL OR "__new_post"."reply_to_id" IS NULL),
	CONSTRAINT "chk_post_format_shape" CHECK((
        "__new_post"."format" = 'note'
        AND ("__new_post"."url" IS NULL OR trim("__new_post"."url") = '')
        AND ("__new_post"."quote_text" IS NULL OR trim("__new_post"."quote_text") = '')
      ) OR (
        "__new_post"."format" = 'link'
        AND "__new_post"."url" IS NOT NULL
        AND trim("__new_post"."url") <> ''
        AND ("__new_post"."quote_text" IS NULL OR trim("__new_post"."quote_text") = '')
      ) OR (
        "__new_post"."format" = 'quote'
        AND "__new_post"."quote_text" IS NOT NULL
        AND trim("__new_post"."quote_text") <> ''
      )),
	CONSTRAINT "chk_post_rating_range" CHECK("__new_post"."rating" IS NULL OR "__new_post"."rating" BETWEEN 1 AND 5),
	CONSTRAINT "chk_post_status_published_at" CHECK((
        "__new_post"."status" = 'draft'
        AND "__new_post"."published_at" IS NULL
      ) OR (
        "__new_post"."status" = 'published'
        AND "__new_post"."published_at" IS NOT NULL
      ))
);
--> statement-breakpoint
INSERT INTO `__new_post`("id", "format", "status", "visibility", "pinned_at", "featured_at", "title", "url", "body", "body_html", "body_text", "quote_text", "summary", "rating", "reply_to_id", "thread_id", "deleted_at", "published_at", "last_activity_at", "created_at", "updated_at") SELECT "id", "format", "status", "visibility", "pinned_at", "featured_at", "title", "url", "body", "body_html", "body_text", "quote_text", "summary", "rating", "reply_to_id", "thread_id", "deleted_at", "published_at", "last_activity_at", "created_at", "updated_at" FROM `post`;--> statement-breakpoint
DROP TABLE `post`;--> statement-breakpoint
ALTER TABLE `__new_post` RENAME TO `post`;--> statement-breakpoint
CREATE UNIQUE INDEX `uq_post_id_thread_id` ON `post` (`id`,`thread_id`);--> statement-breakpoint
CREATE INDEX `idx_post_thread_id` ON `post` (`thread_id`);--> statement-breakpoint
CREATE INDEX `idx_post_thread_live_created` ON `post` (`thread_id`,`created_at`,`id`) WHERE "post"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX `idx_post_status_deleted_published` ON `post` (`status`,`deleted_at`,`published_at`);--> statement-breakpoint
CREATE INDEX `idx_post_status_deleted_activity` ON `post` (`status`,`deleted_at`,`last_activity_at`);--> statement-breakpoint
CREATE INDEX `idx_post_root_live_published_activity` ON `post` (`last_activity_at`,`id`) WHERE "post"."deleted_at" IS NULL AND "post"."reply_to_id" IS NULL AND "post"."status" = 'published';--> statement-breakpoint
CREATE INDEX `idx_post_root_live_draft_updated` ON `post` (`updated_at`,`id`) WHERE "post"."deleted_at" IS NULL AND "post"."reply_to_id" IS NULL AND "post"."status" = 'draft';--> statement-breakpoint
CREATE INDEX `idx_post_reply_live_thread_created` ON `post` (`thread_id`,`created_at`,`id`) WHERE "post"."deleted_at" IS NULL AND "post"."reply_to_id" IS NOT NULL AND "post"."status" = 'published';