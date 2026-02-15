-- Reset script for Jant local development
-- Clears all data so seed-local.sql can re-insert everything
-- Usage: mise run db-seed (runs this then seed-local.sql)

-- Clear FTS index first (to avoid foreign key issues)
DELETE FROM posts_fts;

-- Clear join tables
DELETE FROM post_collections;

-- Clear main tables
DELETE FROM media;
DELETE FROM posts;
DELETE FROM collections;
DELETE FROM redirects;

-- Clear auth tables (order matters: session → account → user)
DELETE FROM session;
DELETE FROM account;
DELETE FROM user;

-- Clear settings
DELETE FROM settings;

-- Reset auto-increment counters
DELETE FROM sqlite_sequence WHERE name IN ('posts', 'media', 'collections', 'redirects');
