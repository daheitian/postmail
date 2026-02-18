-- Post-Collections M:N migration
-- Restore many-to-many relationship between posts and collections

PRAGMA foreign_keys = OFF;
--> statement-breakpoint

-- 1. Create junction table
CREATE TABLE `post_collections` (
  `post_id` integer NOT NULL,
  `collection_id` integer NOT NULL,
  PRIMARY KEY (`post_id`, `collection_id`),
  FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint

-- 2. Migrate existing data from posts.collection_id
INSERT INTO `post_collections` (`post_id`, `collection_id`)
SELECT `id`, `collection_id` FROM `posts`
WHERE `collection_id` IS NOT NULL;
--> statement-breakpoint

-- 3. Recreate posts table without collection_id
CREATE TABLE `posts_new` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `format` text NOT NULL,
  `status` text DEFAULT 'published' NOT NULL,
  `featured` integer DEFAULT 0 NOT NULL,
  `pinned` integer DEFAULT 0 NOT NULL,
  `path` text,
  `title` text,
  `url` text,
  `body` text,
  `body_html` text,
  `quote_text` text,
  `rating` integer,
  `reply_to_id` integer,
  `thread_id` integer,
  `deleted_at` integer,
  `published_at` integer NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint

INSERT INTO `posts_new` (
  `id`, `format`, `status`, `featured`, `pinned`,
  `path`, `title`, `url`, `body`, `body_html`, `quote_text`, `rating`,
  `reply_to_id`, `thread_id`, `deleted_at`, `published_at`, `created_at`, `updated_at`
)
SELECT
  `id`, `format`, `status`, `featured`, `pinned`,
  `path`, `title`, `url`, `body`, `body_html`, `quote_text`, `rating`,
  `reply_to_id`, `thread_id`, `deleted_at`, `published_at`, `created_at`, `updated_at`
FROM `posts`;
--> statement-breakpoint

DROP TABLE `posts`;
--> statement-breakpoint
ALTER TABLE `posts_new` RENAME TO `posts`;
--> statement-breakpoint
CREATE UNIQUE INDEX `posts_path_unique` ON `posts` (`path`);
--> statement-breakpoint

-- 4. Rebuild FTS triggers (column references changed due to table recreation)
DROP TRIGGER IF EXISTS posts_fts_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS posts_fts_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS posts_fts_delete;
--> statement-breakpoint

CREATE TRIGGER posts_fts_insert AFTER INSERT ON posts
WHEN NEW.deleted_at IS NULL
BEGIN
  INSERT INTO posts_fts(rowid, title, body, quote_text)
  VALUES (NEW.id, COALESCE(NEW.title, ''), COALESCE(NEW.body, ''), COALESCE(NEW.quote_text, ''));
END;
--> statement-breakpoint

CREATE TRIGGER posts_fts_update AFTER UPDATE ON posts BEGIN
  DELETE FROM posts_fts WHERE rowid = OLD.id;
  INSERT INTO posts_fts(rowid, title, body, quote_text)
  SELECT NEW.id, COALESCE(NEW.title, ''), COALESCE(NEW.body, ''), COALESCE(NEW.quote_text, '')
  WHERE NEW.deleted_at IS NULL;
END;
--> statement-breakpoint

CREATE TRIGGER posts_fts_delete AFTER DELETE ON posts BEGIN
  DELETE FROM posts_fts WHERE rowid = OLD.id;
END;
--> statement-breakpoint

PRAGMA foreign_keys = ON;
