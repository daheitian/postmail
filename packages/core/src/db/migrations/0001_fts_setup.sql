-- FTS5 virtual table for full-text search on posts.
-- Uses trigram tokenizer for partial-match support, including CJK text.

CREATE VIRTUAL TABLE post_fts USING fts5(
  title,
  body_text,
  quote_text,
  url,
  content='post',
  content_rowid='rowid',
  tokenize='trigram'
);
--> statement-breakpoint
CREATE TRIGGER post_ai AFTER INSERT ON post BEGIN
  INSERT INTO post_fts(rowid, title, body_text, quote_text, url)
  VALUES (new.rowid, new.title, new.body_text, new.quote_text, new.url);
END;
--> statement-breakpoint
CREATE TRIGGER post_ad AFTER DELETE ON post BEGIN
  INSERT INTO post_fts(post_fts, rowid, title, body_text, quote_text, url)
  VALUES ('delete', old.rowid, old.title, old.body_text, old.quote_text, old.url);
END;
--> statement-breakpoint
CREATE TRIGGER post_au AFTER UPDATE ON post BEGIN
  INSERT INTO post_fts(post_fts, rowid, title, body_text, quote_text, url)
  VALUES ('delete', old.rowid, old.title, old.body_text, old.quote_text, old.url);
  INSERT INTO post_fts(rowid, title, body_text, quote_text, url)
  VALUES (new.rowid, new.title, new.body_text, new.quote_text, new.url);
END;
--> statement-breakpoint
INSERT INTO post_fts(post_fts) VALUES ('rebuild');
