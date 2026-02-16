ALTER TABLE posts RENAME COLUMN slug TO path;
--> statement-breakpoint
DROP INDEX IF EXISTS posts_slug_unique;
--> statement-breakpoint
CREATE UNIQUE INDEX posts_path_unique ON posts (path);
