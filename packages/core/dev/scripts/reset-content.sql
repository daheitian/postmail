-- Reset content data while preserving the managed site shell
-- Used by export scripts to embed a content-only reset for current schema

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

-- Users, accounts, settings, default nav, and API tokens are preserved
