CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `api_token` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`token_hash` text NOT NULL,
	`prefix` text NOT NULL,
	`last_used_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_token_token_hash_unique` ON `api_token` (`token_hash`);--> statement-breakpoint
CREATE TABLE `collection_directory_item` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`collection_id` text,
	`label` text,
	`position` text DEFAULT 'a0' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`collection_id`) REFERENCES `collection`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_collection_directory_item_type" CHECK("collection_directory_item"."type" IN ('collection', 'divider')),
	CONSTRAINT "chk_collection_directory_item_shape" CHECK((
        "collection_directory_item"."type" = 'collection' AND "collection_directory_item"."collection_id" IS NOT NULL
      ) OR (
        "collection_directory_item"."type" = 'divider' AND "collection_directory_item"."collection_id" IS NULL
      )),
	CONSTRAINT "chk_collection_directory_item_label" CHECK("collection_directory_item"."type" = 'divider' OR "collection_directory_item"."label" IS NULL)
);
--> statement-breakpoint
CREATE INDEX `idx_collection_directory_item_collection_id` ON `collection_directory_item` (`collection_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_collection_directory_item_position` ON `collection_directory_item` (`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_collection_directory_item_collection_once` ON `collection_directory_item` (`collection_id`) WHERE "collection_directory_item"."type" = 'collection' AND "collection_directory_item"."collection_id" IS NOT NULL;--> statement-breakpoint
CREATE TABLE `collection` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`icon` text,
	`sort_order` text DEFAULT 'newest' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "chk_collection_sort_order" CHECK("collection"."sort_order" IN ('newest', 'oldest', 'rating_desc', 'rating_asc'))
);
--> statement-breakpoint
CREATE TABLE `media` (
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
	CONSTRAINT "chk_media_provider" CHECK("media"."provider" IN ('r2', 's3', 'local')),
	CONSTRAINT "chk_media_media_kind" CHECK("media"."media_kind" IN ('image', 'video', 'audio', 'text', 'document')),
	CONSTRAINT "chk_media_size_positive" CHECK("media"."size" > 0),
	CONSTRAINT "chk_media_position_not_blank" CHECK(trim("media"."position") <> ''),
	CONSTRAINT "chk_media_dimensions_positive" CHECK((
        "media"."width" IS NULL OR "media"."width" > 0
      ) AND (
        "media"."height" IS NULL OR "media"."height" > 0
      )),
	CONSTRAINT "chk_media_chars_nonnegative" CHECK("media"."chars" IS NULL OR "media"."chars" >= 0)
);
--> statement-breakpoint
CREATE INDEX `idx_media_post_id_position` ON `media` (`post_id`,`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_media_post_position` ON `media` (`post_id`,`position`) WHERE "media"."post_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `uq_media_provider_storage_key` ON `media` (`provider`,`storage_key`);--> statement-breakpoint
CREATE INDEX `idx_media_media_kind_post_id` ON `media` (`media_kind`,`post_id`);--> statement-breakpoint
CREATE TABLE `nav_item` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text DEFAULT 'link' NOT NULL,
	`system_key` text,
	`label` text NOT NULL,
	`url` text NOT NULL,
	`position` text DEFAULT 'a0' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "chk_nav_item_type" CHECK("nav_item"."type" IN ('link', 'system')),
	CONSTRAINT "chk_nav_item_system_key" CHECK("nav_item"."system_key" IS NULL OR "nav_item"."system_key" IN ('rss', 'settings', 'collections', 'archive')),
	CONSTRAINT "chk_nav_item_shape" CHECK((
        "nav_item"."type" = 'link'
        AND "nav_item"."system_key" IS NULL
      ) OR (
        "nav_item"."type" = 'system'
        AND "nav_item"."system_key" IS NOT NULL
      ))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_nav_item_position` ON `nav_item` (`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_nav_item_system_key` ON `nav_item` (`system_key`) WHERE "nav_item"."system_key" IS NOT NULL;--> statement-breakpoint
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
	CONSTRAINT "chk_path_registry_kind" CHECK("path_registry"."kind" IN ('slug', 'alias', 'redirect')),
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
CREATE TABLE `post_collection` (
	`post_id` text NOT NULL,
	`collection_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`post_id`, `collection_id`),
	FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`collection_id`) REFERENCES `collection`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_post_collection_collection_id` ON `post_collection` (`collection_id`);--> statement-breakpoint
CREATE INDEX `idx_post_collection_collection_created_post` ON `post_collection` (`collection_id`,`created_at`,`post_id`);--> statement-breakpoint
CREATE TABLE `post` (
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
	CONSTRAINT "chk_post_format" CHECK("post"."format" IN ('note', 'link', 'quote')),
	CONSTRAINT "chk_post_status" CHECK("post"."status" IN ('draft', 'published')),
	CONSTRAINT "chk_post_visibility" CHECK("post"."visibility" IN ('public', 'unlisted', 'private')),
	CONSTRAINT "chk_post_root_visibility_present" CHECK((
        "post"."reply_to_id" IS NULL
        AND "post"."visibility" IS NOT NULL
      ) OR (
        "post"."reply_to_id" IS NOT NULL
        AND "post"."visibility" IS NULL
      )),
	CONSTRAINT "chk_post_reply_to_not_self" CHECK("post"."reply_to_id" IS NULL OR "post"."reply_to_id" <> "post"."id"),
	CONSTRAINT "chk_post_thread_shape" CHECK((
        "post"."reply_to_id" IS NULL
        AND "post"."thread_id" = "post"."id"
      ) OR (
        "post"."reply_to_id" IS NOT NULL
        AND "post"."thread_id" <> "post"."id"
      )),
	CONSTRAINT "chk_post_reply_not_pinned" CHECK("post"."pinned_at" IS NULL OR "post"."reply_to_id" IS NULL),
	CONSTRAINT "chk_post_format_shape" CHECK((
        "post"."format" = 'note'
        AND ("post"."url" IS NULL OR trim("post"."url") = '')
        AND ("post"."quote_text" IS NULL OR trim("post"."quote_text") = '')
      ) OR (
        "post"."format" = 'link'
        AND "post"."url" IS NOT NULL
        AND trim("post"."url") <> ''
        AND ("post"."quote_text" IS NULL OR trim("post"."quote_text") = '')
      ) OR (
        "post"."format" = 'quote'
        AND "post"."quote_text" IS NOT NULL
        AND trim("post"."quote_text") <> ''
      )),
	CONSTRAINT "chk_post_rating_range" CHECK("post"."rating" IS NULL OR "post"."rating" BETWEEN 1 AND 5),
	CONSTRAINT "chk_post_status_published_at" CHECK((
        "post"."status" = 'draft'
        AND "post"."published_at" IS NULL
      ) OR (
        "post"."status" = 'published'
        AND "post"."published_at" IS NOT NULL
      ))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_post_id_thread_id` ON `post` (`id`,`thread_id`);--> statement-breakpoint
CREATE INDEX `idx_post_thread_id` ON `post` (`thread_id`);--> statement-breakpoint
CREATE INDEX `idx_post_thread_live_created` ON `post` (`thread_id`,`created_at`,`id`) WHERE "post"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX `idx_post_status_deleted_published` ON `post` (`status`,`deleted_at`,`published_at`);--> statement-breakpoint
CREATE INDEX `idx_post_status_deleted_activity` ON `post` (`status`,`deleted_at`,`last_activity_at`);--> statement-breakpoint
CREATE INDEX `idx_post_root_live_published_activity` ON `post` (`last_activity_at`,`id`) WHERE "post"."deleted_at" IS NULL AND "post"."reply_to_id" IS NULL AND "post"."status" = 'published';--> statement-breakpoint
CREATE INDEX `idx_post_root_live_draft_updated` ON `post` (`updated_at`,`id`) WHERE "post"."deleted_at" IS NULL AND "post"."reply_to_id" IS NULL AND "post"."status" = 'draft';--> statement-breakpoint
CREATE INDEX `idx_post_reply_live_thread_created` ON `post` (`thread_id`,`created_at`,`id`) WHERE "post"."deleted_at" IS NULL AND "post"."reply_to_id" IS NOT NULL AND "post"."status" = 'published';--> statement-breakpoint
CREATE INDEX `idx_post_featured_live_featured_at` ON `post` (`featured_at`,`thread_id`,`id`) WHERE "post"."deleted_at" IS NULL AND "post"."status" = 'published' AND "post"."featured_at" IS NOT NULL;--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `idx_session_user_id` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `setting` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`role` text DEFAULT 'member',
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
