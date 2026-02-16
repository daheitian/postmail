-- v2 Schema Migration
-- Restructures posts, creates pages, updates collections, replaces navigation_links with nav_items

-- Disable FK checks for migration (dropping/recreating tables with cross-references)
PRAGMA foreign_keys = OFF;
--> statement-breakpoint

-- =============================================================================
-- 1. Create pages table (before modifying posts, migrate type='page' data)
-- =============================================================================

CREATE TABLE `pages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`title` text,
	`body` text,
	`body_html` text,
	`status` text DEFAULT 'published' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pages_slug_unique` ON `pages` (`slug`);
--> statement-breakpoint

-- Migrate type='page' posts into pages table
INSERT INTO `pages` (`slug`, `title`, `body`, `body_html`, `status`, `created_at`, `updated_at`)
SELECT
  CASE
    WHEN `path` IS NOT NULL AND `path` != '' THEN REPLACE(`path`, '/', '')
    ELSE 'page-' || `id`
  END,
  `title`,
  `content`,
  `content_html`,
  CASE WHEN `visibility` = 'draft' THEN 'draft' ELSE 'published' END,
  `created_at`,
  `updated_at`
FROM `posts`
WHERE `type` = 'page';
--> statement-breakpoint

-- =============================================================================
-- 2. Restructure posts table (create new → migrate → drop old → rename)
-- =============================================================================

CREATE TABLE `posts_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`format` text DEFAULT 'note' NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`featured` integer DEFAULT 0 NOT NULL,
	`pinned` integer DEFAULT 0 NOT NULL,
	`slug` text,
	`title` text,
	`url` text,
	`body` text,
	`body_html` text,
	`quote_text` text,
	`rating` integer,
	`collection_id` integer,
	`reply_to_id` integer,
	`thread_id` integer,
	`deleted_at` integer,
	`published_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint

-- Migrate data from old posts to new posts (excluding type='page')
INSERT INTO `posts_new` (
  `id`, `format`, `status`, `featured`, `pinned`,
  `slug`, `title`, `url`, `body`, `body_html`, `quote_text`, `rating`,
  `collection_id`, `reply_to_id`, `thread_id`,
  `deleted_at`, `published_at`, `created_at`, `updated_at`
)
SELECT
  `id`,
  -- format mapping: article→note, image→note, note→note, link→link, quote→quote
  CASE
    WHEN `type` IN ('article', 'image', 'note') THEN 'note'
    WHEN `type` = 'link' THEN 'link'
    WHEN `type` = 'quote' THEN 'quote'
    ELSE 'note'
  END,
  -- status mapping from visibility
  CASE WHEN `visibility` = 'draft' THEN 'draft' ELSE 'published' END,
  -- featured mapping from visibility
  CASE WHEN `visibility` = 'featured' THEN 1 ELSE 0 END,
  -- pinned: default 0
  0,
  -- slug: migrate from path (strip leading /)
  CASE
    WHEN `path` IS NOT NULL AND `path` != '' THEN REPLACE(`path`, '/', '')
    ELSE NULL
  END,
  `title`,
  `source_url`,
  `content`,
  `content_html`,
  -- quote_text: for quote type, content was the quote; set to null (manual fix may be needed)
  NULL,
  -- rating: null
  NULL,
  -- collection_id: migrate from post_collections (take first collection for each post)
  (SELECT `collection_id` FROM `post_collections` WHERE `post_collections`.`post_id` = `posts`.`id` LIMIT 1),
  `reply_to_id`,
  `thread_id`,
  `deleted_at`,
  `published_at`,
  `created_at`,
  `updated_at`
FROM `posts`
WHERE `type` != 'page';
--> statement-breakpoint

-- Update media references to point at new table (foreign keys reference posts)
-- media.post_id still works since IDs are preserved
--> statement-breakpoint

-- Drop old posts table and rename new one
DROP TABLE `posts`;
--> statement-breakpoint
ALTER TABLE `posts_new` RENAME TO `posts`;
--> statement-breakpoint
CREATE UNIQUE INDEX `posts_slug_unique` ON `posts` (`slug`);
--> statement-breakpoint

-- =============================================================================
-- 3. Update collections table (add new columns, rename path→slug)
-- =============================================================================

CREATE TABLE `collections_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`icon` text,
	`sort_order` text DEFAULT 'newest' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`show_divider` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `collections_new_slug_unique` ON `collections_new` (`slug`);
--> statement-breakpoint

INSERT INTO `collections_new` (`id`, `slug`, `title`, `description`, `icon`, `sort_order`, `position`, `show_divider`, `created_at`, `updated_at`)
SELECT
  `id`,
  COALESCE(`path`, 'collection-' || `id`),
  `title`,
  `description`,
  NULL,
  'newest',
  0,
  0,
  `created_at`,
  `updated_at`
FROM `collections`;
--> statement-breakpoint

DROP TABLE `collections`;
--> statement-breakpoint
ALTER TABLE `collections_new` RENAME TO `collections`;
--> statement-breakpoint
CREATE UNIQUE INDEX `collections_slug_unique` ON `collections` (`slug`);
--> statement-breakpoint

-- =============================================================================
-- 4. Replace navigation_links with nav_items
-- =============================================================================

CREATE TABLE `nav_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text DEFAULT 'link' NOT NULL,
	`label` text NOT NULL,
	`url` text NOT NULL,
	`page_id` integer,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

-- Migrate existing navigation_links as type='link'
INSERT INTO `nav_items` (`type`, `label`, `url`, `page_id`, `position`, `created_at`, `updated_at`)
SELECT 'link', `label`, `url`, NULL, `position`, `created_at`, `updated_at`
FROM `navigation_links`;
--> statement-breakpoint

DROP TABLE `navigation_links`;
--> statement-breakpoint

-- =============================================================================
-- 5. Drop post_collections table (replaced by posts.collection_id)
-- =============================================================================

DROP TABLE `post_collections`;
--> statement-breakpoint

-- =============================================================================
-- 6. Rebuild FTS5 (column rename: content→body, add quote_text)
-- =============================================================================

-- Drop old FTS triggers
DROP TRIGGER IF EXISTS posts_fts_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS posts_fts_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS posts_fts_delete;
--> statement-breakpoint

-- Drop old FTS table
DROP TABLE IF EXISTS posts_fts;
--> statement-breakpoint

-- Create new FTS table with updated columns
CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(
  title,
  body,
  quote_text,
  content=posts,
  content_rowid=id,
  tokenize='trigram'
);
--> statement-breakpoint

-- Populate FTS with migrated data
INSERT INTO posts_fts(rowid, title, body, quote_text)
SELECT id, COALESCE(title, ''), COALESCE(body, ''), COALESCE(quote_text, '')
FROM posts WHERE deleted_at IS NULL;
--> statement-breakpoint

-- Trigger: sync FTS on INSERT
CREATE TRIGGER posts_fts_insert AFTER INSERT ON posts
WHEN NEW.deleted_at IS NULL
BEGIN
  INSERT INTO posts_fts(rowid, title, body, quote_text)
  VALUES (NEW.id, COALESCE(NEW.title, ''), COALESCE(NEW.body, ''), COALESCE(NEW.quote_text, ''));
END;
--> statement-breakpoint

-- Trigger: sync FTS on UPDATE
CREATE TRIGGER posts_fts_update AFTER UPDATE ON posts BEGIN
  DELETE FROM posts_fts WHERE rowid = OLD.id;
  INSERT INTO posts_fts(rowid, title, body, quote_text)
  SELECT NEW.id, COALESCE(NEW.title, ''), COALESCE(NEW.body, ''), COALESCE(NEW.quote_text, '')
  WHERE NEW.deleted_at IS NULL;
END;
--> statement-breakpoint

-- Trigger: sync FTS on DELETE
CREATE TRIGGER posts_fts_delete AFTER DELETE ON posts BEGIN
  DELETE FROM posts_fts WHERE rowid = OLD.id;
END;
--> statement-breakpoint

-- =============================================================================
-- 7. Re-enable FK checks and verify integrity
-- =============================================================================

PRAGMA foreign_keys = ON;
--> statement-breakpoint
PRAGMA foreign_key_check;
