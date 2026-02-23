-- Reset script for Jant local development (v2 schema)
-- Clears all data so seed-local.sql can re-insert everything
-- Usage: mise run db-reset (runs this then seed-local.sql)

-- Clear FTS index first (to avoid trigger issues)
DELETE FROM posts_fts;

-- Clear main tables (order matters for FK constraints)
DELETE FROM nav_items;
DELETE FROM media;
DELETE FROM posts;
DELETE FROM pages;
DELETE FROM collections;
DELETE FROM redirects;

-- Clear auth tables (order matters: session → account → user)
DELETE FROM session;
DELETE FROM account;
DELETE FROM user;

-- Clear settings
DELETE FROM settings;

-- Reset auto-increment counters
DELETE FROM sqlite_sequence WHERE name IN ('posts', 'pages', 'collections', 'nav_items', 'redirects');
