-- Destructive migration: integer autoincrement PKs → UUIDv7 text PKs
-- Pre-1.0: all existing data is dropped and tables are recreated.

-- 1. Drop FTS triggers first (they reference posts)
DROP TRIGGER IF EXISTS posts_fts_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS posts_fts_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS posts_fts_delete;
--> statement-breakpoint

-- 2. Drop FTS virtual table
DROP TABLE IF EXISTS posts_fts;
--> statement-breakpoint

-- 3. Drop junction/dependent tables first
DROP TABLE IF EXISTS post_collections;
--> statement-breakpoint
DROP TABLE IF EXISTS media;
--> statement-breakpoint
DROP TABLE IF EXISTS nav_items;
--> statement-breakpoint
DROP TABLE IF EXISTS path_registry;
--> statement-breakpoint
DROP TABLE IF EXISTS collection_dividers;
--> statement-breakpoint
DROP TABLE IF EXISTS redirects;
--> statement-breakpoint

-- 4. Drop primary tables
DROP TABLE IF EXISTS posts;
--> statement-breakpoint
DROP TABLE IF EXISTS pages;
--> statement-breakpoint
DROP TABLE IF EXISTS collections;
--> statement-breakpoint

-- 5. Recreate posts with text PK
CREATE TABLE posts (
  id TEXT PRIMARY KEY NOT NULL,
  format TEXT NOT NULL DEFAULT 'note',
  status TEXT NOT NULL DEFAULT 'published',
  visibility TEXT NOT NULL DEFAULT 'public',
  pinned INTEGER NOT NULL DEFAULT 0,
  path TEXT,
  title TEXT,
  url TEXT,
  body TEXT,
  body_html TEXT,
  body_text TEXT,
  quote_text TEXT,
  summary TEXT,
  rating INTEGER,
  reply_to_id TEXT,
  thread_id TEXT,
  deleted_at INTEGER,
  published_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX posts_path_unique ON posts(path);
--> statement-breakpoint

-- 6. Recreate pages with text PK
CREATE TABLE pages (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL,
  title TEXT,
  body TEXT,
  body_html TEXT,
  status TEXT NOT NULL DEFAULT 'published',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX pages_slug_unique ON pages(slug);
--> statement-breakpoint

-- 7. Recreate collections with text PK
CREATE TABLE collections (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order TEXT NOT NULL DEFAULT 'newest',
  position INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX collections_slug_unique ON collections(slug);
--> statement-breakpoint

-- 8. Recreate collection_dividers with text PK
CREATE TABLE collection_dividers (
  id TEXT PRIMARY KEY NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
--> statement-breakpoint

-- 9. Recreate media with text post_id FK
CREATE TABLE media (
  id TEXT PRIMARY KEY NOT NULL,
  post_id TEXT,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  storage_key TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'r2',
  width INTEGER,
  height INTEGER,
  alt TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  blurhash TEXT,
  poster_key TEXT,
  summary TEXT,
  chars INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT 0
);
--> statement-breakpoint

-- 10. Recreate post_collections with text FKs
CREATE TABLE post_collections (
  post_id TEXT NOT NULL,
  collection_id TEXT NOT NULL
);
--> statement-breakpoint

-- 11. Recreate nav_items with text PK and text page_id FK
CREATE TABLE nav_items (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL DEFAULT 'link',
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  page_id TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
--> statement-breakpoint

-- 12. Recreate redirects with text PK
CREATE TABLE redirects (
  id TEXT PRIMARY KEY NOT NULL,
  from_path TEXT NOT NULL,
  to_path TEXT NOT NULL,
  type INTEGER NOT NULL DEFAULT 301,
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX redirects_from_path_unique ON redirects(from_path);
--> statement-breakpoint

-- 13. Recreate path_registry with text owner_id
CREATE TABLE path_registry (
  path TEXT PRIMARY KEY NOT NULL,
  owner_type TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
--> statement-breakpoint

-- 14. Recreate FTS5 (text PK means no explicit content_rowid — FTS5 uses implicit rowid by default)
CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(
  title,
  body_text,
  quote_text,
  url,
  content=posts,
  tokenize='trigram'
);
--> statement-breakpoint

-- 15. FTS triggers using SQLite implicit rowid
-- External content FTS5 requires the special 'delete' command (INSERT INTO fts(fts,...) VALUES('delete',...))
-- instead of plain DELETE, per https://www.sqlite.org/fts5.html#external_content_tables
CREATE TRIGGER posts_fts_insert AFTER INSERT ON posts
WHEN NEW.deleted_at IS NULL
BEGIN
  INSERT INTO posts_fts(rowid, title, body_text, quote_text, url)
  VALUES (NEW.rowid, COALESCE(NEW.title, ''), COALESCE(NEW.body_text, ''), COALESCE(NEW.quote_text, ''), COALESCE(NEW.url, ''));
END;
--> statement-breakpoint

CREATE TRIGGER posts_fts_update AFTER UPDATE ON posts BEGIN
  INSERT INTO posts_fts(posts_fts, rowid, title, body_text, quote_text, url)
  VALUES('delete', OLD.rowid, COALESCE(OLD.title, ''), COALESCE(OLD.body_text, ''), COALESCE(OLD.quote_text, ''), COALESCE(OLD.url, ''));
  INSERT INTO posts_fts(rowid, title, body_text, quote_text, url)
  SELECT NEW.rowid, COALESCE(NEW.title, ''), COALESCE(NEW.body_text, ''), COALESCE(NEW.quote_text, ''), COALESCE(NEW.url, '')
  WHERE NEW.deleted_at IS NULL;
END;
--> statement-breakpoint

CREATE TRIGGER posts_fts_delete AFTER DELETE ON posts BEGIN
  INSERT INTO posts_fts(posts_fts, rowid, title, body_text, quote_text, url)
  VALUES('delete', OLD.rowid, COALESCE(OLD.title, ''), COALESCE(OLD.body_text, ''), COALESCE(OLD.quote_text, ''), COALESCE(OLD.url, ''));
END;
--> statement-breakpoint

-- 16. Recreate performance indexes
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(status, deleted_at, published_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_posts_thread ON posts(thread_id, deleted_at, created_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_media_post ON media(post_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_pc_post ON post_collections(post_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_pc_collection ON post_collections(collection_id);
