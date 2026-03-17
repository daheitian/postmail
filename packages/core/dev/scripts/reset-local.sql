-- Reset script for Jant local development (v2 schema)
-- Clears all data so seed-local.sql can re-insert everything
-- Usage: mise run db-reset (runs this then seed-local.sql)

-- Clear FTS index first (to avoid trigger issues)
DELETE FROM post_fts;

-- Clear junction/dependent tables first
DELETE FROM post_collection;
DELETE FROM collection_directory_item;
DELETE FROM custom_url;
DELETE FROM api_token;

-- Clear main tables (order matters for FK constraints)
DELETE FROM nav_item;
DELETE FROM media;
DELETE FROM post;
DELETE FROM collection;

-- Clear auth tables (order matters: session → account → user)
DELETE FROM session;
DELETE FROM account;
DELETE FROM user;

-- Clear settings
DELETE FROM setting;
