-- Reset script for Jant local development (current schema)
-- Clears all data so a full local seed can re-insert everything

-- Clear FTS index first (to avoid trigger issues)
DELETE FROM post_fts;

-- Clear junction/dependent tables first
DELETE FROM post_collection;
DELETE FROM collection_directory_item;
DELETE FROM path_registry;
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
