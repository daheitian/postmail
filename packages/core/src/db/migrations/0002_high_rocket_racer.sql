CREATE TABLE `path_registry` (
	`id` text PRIMARY KEY NOT NULL,
	`path` text NOT NULL,
	`kind` text NOT NULL,
	`post_id` text,
	`collection_id` text,
	`redirect_to_path` text,
	`redirect_type` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`collection_id`) REFERENCES `collection`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_path_registry_shape" CHECK((
        "path_registry"."kind" IN ('slug', 'alias')
        AND (
          ("path_registry"."post_id" IS NOT NULL AND "path_registry"."collection_id" IS NULL)
          OR ("path_registry"."post_id" IS NULL AND "path_registry"."collection_id" IS NOT NULL)
        )
        AND "path_registry"."redirect_to_path" IS NULL
        AND "path_registry"."redirect_type" IS NULL
      ) OR (
        "path_registry"."kind" = 'redirect'
        AND "path_registry"."post_id" IS NULL
        AND "path_registry"."collection_id" IS NULL
        AND "path_registry"."redirect_to_path" IS NOT NULL
        AND "path_registry"."redirect_type" IN (301, 302)
      ))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `path_registry_path_unique` ON `path_registry` (`path`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_path_registry_post_slug` ON `path_registry` (`post_id`) WHERE "path_registry"."kind" = 'slug' AND "path_registry"."post_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `uq_path_registry_collection_slug` ON `path_registry` (`collection_id`) WHERE "path_registry"."kind" = 'slug' AND "path_registry"."collection_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_path_registry_post_id` ON `path_registry` (`post_id`);--> statement-breakpoint
CREATE INDEX `idx_path_registry_collection_id` ON `path_registry` (`collection_id`);--> statement-breakpoint
DROP TABLE `custom_url`;--> statement-breakpoint
DROP INDEX `collection_slug_unique`;--> statement-breakpoint
ALTER TABLE `collection` DROP COLUMN `slug`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
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
	`thread_id` text,
	`deleted_at` integer,
	`published_at` integer NOT NULL,
	`last_activity_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`reply_to_id`) REFERENCES `post`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`thread_id`) REFERENCES `post`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "chk_post_reply_to_not_self" CHECK("__new_post"."reply_to_id" IS NULL OR "__new_post"."reply_to_id" <> "__new_post"."id"),
	CONSTRAINT "chk_post_thread_not_self" CHECK("__new_post"."thread_id" IS NULL OR "__new_post"."thread_id" <> "__new_post"."id"),
	CONSTRAINT "chk_post_reply_requires_thread" CHECK("__new_post"."reply_to_id" IS NULL OR "__new_post"."thread_id" IS NOT NULL)
);
--> statement-breakpoint
INSERT INTO `__new_post`("id", "format", "status", "visibility", "pinned_at", "featured_at", "title", "url", "body", "body_html", "body_text", "quote_text", "summary", "rating", "reply_to_id", "thread_id", "deleted_at", "published_at", "last_activity_at", "created_at", "updated_at") SELECT "id", "format", "status", "visibility", "pinned_at", "featured_at", "title", "url", "body", "body_html", "body_text", "quote_text", "summary", "rating", "reply_to_id", "thread_id", "deleted_at", "published_at", "last_activity_at", "created_at", "updated_at" FROM `post`;--> statement-breakpoint
DROP TABLE `post`;--> statement-breakpoint
ALTER TABLE `__new_post` RENAME TO `post`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_post_thread_id` ON `post` (`thread_id`);--> statement-breakpoint
CREATE INDEX `idx_post_status_deleted_published` ON `post` (`status`,`deleted_at`,`published_at`);--> statement-breakpoint
CREATE INDEX `idx_post_status_deleted_activity` ON `post` (`status`,`deleted_at`,`last_activity_at`);--> statement-breakpoint
CREATE TABLE `__new_sidebar_item` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`collection_id` text,
	`position` text DEFAULT 'a0' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`collection_id`) REFERENCES `collection`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_sidebar_item_shape" CHECK((
        "__new_sidebar_item"."type" = 'collection' AND "__new_sidebar_item"."collection_id" IS NOT NULL
      ) OR (
        "__new_sidebar_item"."type" = 'divider' AND "__new_sidebar_item"."collection_id" IS NULL
      ))
);
--> statement-breakpoint
INSERT INTO `__new_sidebar_item`("id", "type", "collection_id", "position", "created_at", "updated_at") SELECT "id", "type", "collection_id", "position", "created_at", "updated_at" FROM `sidebar_item`;--> statement-breakpoint
DROP TABLE `sidebar_item`;--> statement-breakpoint
ALTER TABLE `__new_sidebar_item` RENAME TO `sidebar_item`;--> statement-breakpoint
CREATE INDEX `idx_sidebar_item_collection_id` ON `sidebar_item` (`collection_id`);