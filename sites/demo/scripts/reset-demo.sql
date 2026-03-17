-- Reset script for Jant demo site (demo.jant.me) (v2 schema)
-- Clears content data while preserving users/settings/schema
-- Usage: mise run demo-reset (runs this then seed-demo.sql)

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

-- post delete triggers keep post_fts in sync

-- Sessions, users, accounts, and settings are preserved
-- (seed-demo.sql only contains content data)
