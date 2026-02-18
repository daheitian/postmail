-- Reset script for Jant demo site (demo.jant.me) (v2 schema)
-- Clears content data while preserving users/settings/schema
-- Usage: mise run demo-reset (runs this then seed-demo.sql)

-- Clear FTS index first (to avoid trigger issues)
DELETE FROM posts_fts;

-- Clear main tables (order matters for FK constraints)
DELETE FROM nav_items;
DELETE FROM media;
DELETE FROM post_collections;
DELETE FROM posts;
DELETE FROM pages;
DELETE FROM collections;
DELETE FROM redirects;

-- Sessions, users, accounts, and settings are preserved
-- (seed-demo.sql only contains content data)

-- Reset auto-increment counters
DELETE FROM sqlite_sequence WHERE name IN ('posts', 'pages', 'collections', 'nav_items', 'redirects');
