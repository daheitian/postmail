-- Update FTS to index plain text (body_text) instead of raw TipTap JSON (body),
-- and add URL indexing for link-format posts.

-- 1. Add body_text column for pre-extracted plain text
ALTER TABLE posts ADD COLUMN body_text TEXT;
--> statement-breakpoint

-- 2. Drop old FTS triggers
DROP TRIGGER IF EXISTS posts_fts_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS posts_fts_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS posts_fts_delete;
--> statement-breakpoint

-- 3. Drop old FTS table
DROP TABLE IF EXISTS posts_fts;
--> statement-breakpoint

-- 4. Recreate FTS with body_text (plain text) and url columns
CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(
  title,
  body_text,
  quote_text,
  url,
  content=posts,
  content_rowid=id,
  tokenize='trigram'
);
--> statement-breakpoint

-- 5. Populate FTS with existing data (body_text will be NULL for existing posts)
INSERT INTO posts_fts(rowid, title, body_text, quote_text, url)
SELECT id, COALESCE(title, ''), COALESCE(body_text, ''), COALESCE(quote_text, ''), COALESCE(url, '')
FROM posts WHERE deleted_at IS NULL;
--> statement-breakpoint

-- 6. Trigger: sync FTS on INSERT
CREATE TRIGGER posts_fts_insert AFTER INSERT ON posts
WHEN NEW.deleted_at IS NULL
BEGIN
  INSERT INTO posts_fts(rowid, title, body_text, quote_text, url)
  VALUES (NEW.id, COALESCE(NEW.title, ''), COALESCE(NEW.body_text, ''), COALESCE(NEW.quote_text, ''), COALESCE(NEW.url, ''));
END;
--> statement-breakpoint

-- 7. Trigger: sync FTS on UPDATE
CREATE TRIGGER posts_fts_update AFTER UPDATE ON posts BEGIN
  DELETE FROM posts_fts WHERE rowid = OLD.id;
  INSERT INTO posts_fts(rowid, title, body_text, quote_text, url)
  SELECT NEW.id, COALESCE(NEW.title, ''), COALESCE(NEW.body_text, ''), COALESCE(NEW.quote_text, ''), COALESCE(NEW.url, '')
  WHERE NEW.deleted_at IS NULL;
END;
--> statement-breakpoint

-- 8. Trigger: sync FTS on DELETE
CREATE TRIGGER posts_fts_delete AFTER DELETE ON posts BEGIN
  DELETE FROM posts_fts WHERE rowid = OLD.id;
END;
