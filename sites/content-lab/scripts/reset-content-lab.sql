-- Reset script for Jant content-lab
-- Clears content data while preserving users, sessions, settings, and schema
-- Usage: mise run db-content-lab-clean

-- Clear junction and dependent tables first
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
