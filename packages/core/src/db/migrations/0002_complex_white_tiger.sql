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
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_media`("id", "post_id", "filename", "original_name", "mime_type", "size", "storage_key", "provider", "width", "height", "alt", "position", "blurhash", "waveform", "poster_key", "summary", "chars", "created_at", "updated_at") SELECT "id", "post_id", "filename", "original_name", "mime_type", "size", "storage_key", "provider", "width", "height", "alt", "position", "blurhash", "waveform", "poster_key", "summary", "chars", "created_at", "updated_at" FROM `media`;--> statement-breakpoint
DROP TABLE `media`;--> statement-breakpoint
ALTER TABLE `__new_media` RENAME TO `media`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_media_post_id_position` ON `media` (`post_id`,`position`);--> statement-breakpoint
CREATE INDEX `idx_media_storage_key` ON `media` (`storage_key`);--> statement-breakpoint
CREATE TABLE `__new_post_collection` (
	`post_id` text NOT NULL,
	`collection_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`post_id`, `collection_id`),
	FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`collection_id`) REFERENCES `collection`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_post_collection`("post_id", "collection_id", "created_at") SELECT "post_id", "collection_id", "created_at" FROM `post_collection`;--> statement-breakpoint
DROP TABLE `post_collection`;--> statement-breakpoint
ALTER TABLE `__new_post_collection` RENAME TO `post_collection`;--> statement-breakpoint
CREATE INDEX `idx_post_collection_collection_id` ON `post_collection` (`collection_id`);--> statement-breakpoint
CREATE TABLE `__new_post` (
	`id` text PRIMARY KEY NOT NULL,
	`format` text NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`visibility` text DEFAULT 'public' NOT NULL,
	`pinned_at` integer,
	`slug` text NOT NULL,
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
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`reply_to_id`) REFERENCES `post`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`thread_id`) REFERENCES `post`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_post`("id", "format", "status", "visibility", "pinned_at", "slug", "title", "url", "body", "body_html", "body_text", "quote_text", "summary", "rating", "reply_to_id", "thread_id", "deleted_at", "published_at", "created_at", "updated_at") SELECT "id", "format", "status", "visibility", "pinned_at", "slug", "title", "url", "body", "body_html", "body_text", "quote_text", "summary", "rating", "reply_to_id", "thread_id", "deleted_at", "published_at", "created_at", "updated_at" FROM `post`;--> statement-breakpoint
DROP TABLE `post`;--> statement-breakpoint
ALTER TABLE `__new_post` RENAME TO `post`;--> statement-breakpoint
CREATE UNIQUE INDEX `post_slug_unique` ON `post` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_post_thread_id` ON `post` (`thread_id`);--> statement-breakpoint
CREATE INDEX `idx_post_status_deleted_published` ON `post` (`status`,`deleted_at`,`published_at`);--> statement-breakpoint
CREATE TABLE `__new_sidebar_item` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`collection_id` text,
	`position` text DEFAULT 'a0' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`collection_id`) REFERENCES `collection`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_sidebar_item`("id", "type", "collection_id", "position", "created_at", "updated_at") SELECT "id", "type", "collection_id", "position", "created_at", "updated_at" FROM `sidebar_item`;--> statement-breakpoint
DROP TABLE `sidebar_item`;--> statement-breakpoint
ALTER TABLE `__new_sidebar_item` RENAME TO `sidebar_item`;--> statement-breakpoint
CREATE INDEX `idx_sidebar_item_collection_id` ON `sidebar_item` (`collection_id`);--> statement-breakpoint
CREATE INDEX `idx_api_token_token_hash` ON `api_token` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_custom_url_target_id` ON `custom_url` (`target_id`);--> statement-breakpoint
-- Recreate FTS triggers lost when post table was dropped and recreated
CREATE TRIGGER post_ai AFTER INSERT ON post BEGIN
  INSERT INTO post_fts(rowid, title, body_text, quote_text, url)
  VALUES (new.rowid, new.title, new.body_text, new.quote_text, new.url);
END;--> statement-breakpoint
CREATE TRIGGER post_ad AFTER DELETE ON post BEGIN
  INSERT INTO post_fts(post_fts, rowid, title, body_text, quote_text, url)
  VALUES ('delete', old.rowid, old.title, old.body_text, old.quote_text, old.url);
END;--> statement-breakpoint
CREATE TRIGGER post_au AFTER UPDATE ON post BEGIN
  INSERT INTO post_fts(post_fts, rowid, title, body_text, quote_text, url)
  VALUES ('delete', old.rowid, old.title, old.body_text, old.quote_text, old.url);
  INSERT INTO post_fts(rowid, title, body_text, quote_text, url)
  VALUES (new.rowid, new.title, new.body_text, new.quote_text, new.url);
END;--> statement-breakpoint
-- Rebuild FTS index since rowids changed during table recreation
INSERT INTO post_fts(post_fts) VALUES('rebuild');