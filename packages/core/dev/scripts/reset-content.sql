-- Reset content data while preserving users/settings/schema
-- Used by export scripts to embed a content-only reset

-- Clear FTS index first (to avoid trigger issues)
DELETE FROM post_fts;

-- Clear junction/dependent tables first
DELETE FROM post_collection;
DELETE FROM sidebar_item;
DELETE FROM custom_url;
DELETE FROM api_token;

-- Clear main tables (order matters for FK constraints)
DELETE FROM nav_item;
DELETE FROM media;
DELETE FROM post;
DELETE FROM collection;

-- Sessions, users, accounts, and settings are preserved
