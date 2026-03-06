CREATE TABLE `custom_urls` (
	`id` text PRIMARY KEY NOT NULL,
	`path` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text,
	`to_path` text,
	`redirect_type` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `custom_urls_path_unique` ON `custom_urls` (`path`);--> statement-breakpoint
DROP TABLE `path_registry`;--> statement-breakpoint
DROP TABLE `redirects`;--> statement-breakpoint
CREATE TABLE `posts_new` (
	`id` text PRIMARY KEY NOT NULL,
	`format` text NOT NULL DEFAULT 'note',
	`status` text NOT NULL DEFAULT 'published',
	`visibility` text NOT NULL DEFAULT 'public',
	`pinned` integer NOT NULL DEFAULT 0,
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
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `posts_new` (`id`, `format`, `status`, `visibility`, `pinned`, `slug`, `title`, `url`, `body`, `body_html`, `body_text`, `quote_text`, `summary`, `rating`, `reply_to_id`, `thread_id`, `deleted_at`, `published_at`, `created_at`, `updated_at`)
SELECT `id`, `format`, `status`, `visibility`, `pinned`, COALESCE(`path`, `id`), `title`, `url`, `body`, `body_html`, `body_text`, `quote_text`, `summary`, `rating`, `reply_to_id`, `thread_id`, `deleted_at`, `published_at`, `created_at`, `updated_at`
FROM `posts`;
--> statement-breakpoint
DROP TRIGGER IF EXISTS posts_fts_insert;--> statement-breakpoint
DROP TRIGGER IF EXISTS posts_fts_update;--> statement-breakpoint
DROP TRIGGER IF EXISTS posts_fts_delete;--> statement-breakpoint
DROP TABLE `posts`;--> statement-breakpoint
ALTER TABLE `posts_new` RENAME TO `posts`;--> statement-breakpoint
CREATE UNIQUE INDEX `posts_slug_unique` ON `posts` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_posts_published` ON `posts` (`status`, `deleted_at`, `published_at` DESC);--> statement-breakpoint
CREATE INDEX `idx_posts_thread` ON `posts` (`thread_id`, `deleted_at`, `created_at`);--> statement-breakpoint
CREATE TRIGGER posts_fts_insert AFTER INSERT ON posts
BEGIN
  INSERT INTO posts_fts(rowid, title, body_text, quote_text, url)
  VALUES (NEW.rowid, NEW.title, NEW.body_text, NEW.quote_text, NEW.url);
END;--> statement-breakpoint
CREATE TRIGGER posts_fts_update AFTER UPDATE ON posts BEGIN
  INSERT INTO posts_fts(posts_fts, rowid, title, body_text, quote_text, url)
  VALUES ('delete', OLD.rowid, OLD.title, OLD.body_text, OLD.quote_text, OLD.url);
  INSERT INTO posts_fts(rowid, title, body_text, quote_text, url)
  VALUES (NEW.rowid, NEW.title, NEW.body_text, NEW.quote_text, NEW.url);
END;--> statement-breakpoint
CREATE TRIGGER posts_fts_delete AFTER DELETE ON posts BEGIN
  INSERT INTO posts_fts(posts_fts, rowid, title, body_text, quote_text, url)
  VALUES ('delete', OLD.rowid, OLD.title, OLD.body_text, OLD.quote_text, OLD.url);
END;
