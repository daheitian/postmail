-- Reset script for Jant official site (jant.me) (v2 schema)
-- Clears content data while preserving the site shell and settings
-- Usage: mise run db-site-clear-content or db-site-reseed

BEGIN TRANSACTION;

-- Clear FTS index first (to avoid trigger issues)
DELETE FROM post_fts;

-- Clear junction/dependent tables first
DELETE FROM post_collection;
DELETE FROM collection_directory_item;
DELETE FROM path_registry;

-- Clear main tables (order matters for FK constraints)
DELETE FROM media;
DELETE FROM post;
DELETE FROM collection;

COMMIT;

-- Sessions, users, accounts, settings, nav items, and API tokens are preserved
-- (seed-site.sql only contains content data)
