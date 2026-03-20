-- Reset script for Jant demo site (demo.jant.me) (v2 schema)
-- Clears content data while preserving the managed demo shell
-- Usage: mise run db-demo-clear-content or db-demo-reseed

BEGIN TRANSACTION;

-- Clear junction/dependent tables first
DELETE FROM post_collection;
DELETE FROM collection_directory_item;
DELETE FROM path_registry;

-- Clear main tables (order matters for FK constraints)
DELETE FROM media;
DELETE FROM post;
DELETE FROM collection;

COMMIT;

-- post delete triggers keep post_fts in sync

-- Users, accounts, settings, default nav, and API tokens are preserved
-- Canonical demo publishing now restores from sites/demo-source/canonical/snapshot
