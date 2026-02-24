-- Path Registry: single source of truth for all claimed URL paths.
-- Enforces uniqueness at the DB level via PRIMARY KEY on path.

CREATE TABLE path_registry (
  path TEXT PRIMARY KEY,
  owner_type TEXT NOT NULL,
  owner_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX idx_path_registry_owner ON path_registry (owner_type, owner_id);
--> statement-breakpoint
-- Backfill from existing pages (slug)
INSERT INTO path_registry (path, owner_type, owner_id, created_at)
SELECT slug, 'page', id, created_at FROM pages;
--> statement-breakpoint
-- Backfill from existing posts with custom paths (non-deleted only)
INSERT INTO path_registry (path, owner_type, owner_id, created_at)
SELECT path, 'post', id, created_at FROM posts WHERE path IS NOT NULL AND deleted_at IS NULL;
--> statement-breakpoint
-- Backfill from existing redirects
INSERT INTO path_registry (path, owner_type, owner_id, created_at)
SELECT from_path, 'redirect', id, created_at FROM redirects;
