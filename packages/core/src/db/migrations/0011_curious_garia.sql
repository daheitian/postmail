PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_post` (
	`id` text PRIMARY KEY NOT NULL,
	`format` text NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`visibility` text DEFAULT 'public',
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
	CONSTRAINT "chk_post_root_visibility_present" CHECK("__new_post"."reply_to_id" IS NOT NULL OR "__new_post"."visibility" IS NOT NULL),
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
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `uq_post_id_thread_id` ON `post` (`id`,`thread_id`);--> statement-breakpoint
CREATE INDEX `idx_post_thread_id` ON `post` (`thread_id`);--> statement-breakpoint
CREATE INDEX `idx_post_thread_live_created` ON `post` (`thread_id`,`created_at`,`id`) WHERE "post"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX `idx_post_status_deleted_published` ON `post` (`status`,`deleted_at`,`published_at`);--> statement-breakpoint
CREATE INDEX `idx_post_status_deleted_activity` ON `post` (`status`,`deleted_at`,`last_activity_at`);--> statement-breakpoint
CREATE INDEX `idx_post_root_live_published_activity` ON `post` (`last_activity_at`,`id`) WHERE "post"."deleted_at" IS NULL AND "post"."reply_to_id" IS NULL AND "post"."status" = 'published';--> statement-breakpoint
CREATE INDEX `idx_post_root_live_draft_updated` ON `post` (`updated_at`,`id`) WHERE "post"."deleted_at" IS NULL AND "post"."reply_to_id" IS NULL AND "post"."status" = 'draft';--> statement-breakpoint
CREATE INDEX `idx_post_reply_live_thread_created` ON `post` (`thread_id`,`created_at`,`id`) WHERE "post"."deleted_at" IS NULL AND "post"."reply_to_id" IS NOT NULL AND "post"."status" = 'published';