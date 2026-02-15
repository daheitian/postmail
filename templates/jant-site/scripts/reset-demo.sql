-- Reset script for Jant demo site (demo.jant.me)
-- Clears content data while preserving users/settings/schema
-- Usage: mise run demo-reset (runs this then seed-demo.sql)

-- Clear FTS index first (to avoid foreign key issues)
DELETE FROM posts_fts;

-- Clear join tables
DELETE FROM post_collections;

-- Clear main tables
DELETE FROM media;
DELETE FROM posts;
DELETE FROM collections;
DELETE FROM redirects;

-- Sessions, users, accounts, and settings are preserved
-- (seed-demo.sql only contains content data)

-- Reset auto-increment counters
DELETE FROM sqlite_sequence WHERE name IN ('posts', 'media', 'collections', 'redirects');
