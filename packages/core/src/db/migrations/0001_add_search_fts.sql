-- FTS5 virtual table for full-text search (trigram tokenizer for CJK support)
CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(
  title,
  content,
  content='posts',
  content_rowid='id',
  tokenize='trigram'
);

-- Populate FTS with existing posts
INSERT INTO posts_fts(rowid, title, content)
SELECT id, COALESCE(title, ''), COALESCE(content, '')
FROM posts WHERE deleted_at IS NULL;

-- Trigger: sync FTS on INSERT
CREATE TRIGGER posts_fts_insert AFTER INSERT ON posts
WHEN NEW.deleted_at IS NULL
BEGIN
  INSERT INTO posts_fts(rowid, title, content)
  VALUES (NEW.id, COALESCE(NEW.title, ''), COALESCE(NEW.content, ''));
END;

-- Trigger: sync FTS on UPDATE
CREATE TRIGGER posts_fts_update AFTER UPDATE ON posts BEGIN
  DELETE FROM posts_fts WHERE rowid = OLD.id;
  INSERT INTO posts_fts(rowid, title, content)
  SELECT NEW.id, COALESCE(NEW.title, ''), COALESCE(NEW.content, '')
  WHERE NEW.deleted_at IS NULL;
END;

-- Trigger: sync FTS on DELETE
CREATE TRIGGER posts_fts_delete AFTER DELETE ON posts BEGIN
  DELETE FROM posts_fts WHERE rowid = OLD.id;
END;
