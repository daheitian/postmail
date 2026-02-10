-- =============================================================================
-- Reset script for local development
-- Clears ALL data (including users) to prepare for re-seeding
-- Usage: mise run db-seed
-- =============================================================================

-- Clear FTS index first
DELETE FROM posts_fts;

-- Clear join tables
DELETE FROM post_collections;

-- Clear main tables
DELETE FROM media;
DELETE FROM posts;
DELETE FROM collections;
DELETE FROM redirects;
DELETE FROM settings;

-- Clear auth tables
DELETE FROM session;
DELETE FROM verification;
DELETE FROM account;
DELETE FROM user;

-- Reset auto-increment counters
DELETE FROM sqlite_sequence;
