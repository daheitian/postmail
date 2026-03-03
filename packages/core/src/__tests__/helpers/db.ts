/**
 * Test Database Helper
 *
 * Creates an in-memory SQLite database with all migrations applied (up to v2).
 * Used for service integration tests.
 */

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../../db/schema.js";
import { readFileSync } from "fs";
import { resolve } from "path";

const MIGRATIONS_DIR = resolve(import.meta.dirname, "../../db/migrations");

/**
 * Applies a migration file, splitting on Drizzle statement breakpoints.
 */
function applyMigration(sqlite: Database.Database, filename: string) {
  const migration = readFileSync(resolve(MIGRATIONS_DIR, filename), "utf-8");
  for (const sql of migration.split("--> statement-breakpoint")) {
    const trimmed = sql.trim();
    if (trimmed) sqlite.exec(trimmed);
  }
}

/**
 * Creates a fresh in-memory SQLite database with all migrations applied.
 * Each call returns an isolated database instance for test isolation.
 *
 * @param options.fts - Whether to enable FTS5 for search tests (default: false).
 *   The trigram tokenizer used in production may not be available in all
 *   better-sqlite3 builds, so FTS is opt-in for tests that need it.
 */
export function createTestDatabase(options?: { fts?: boolean }) {
  const sqlite = new Database(":memory:");

  // Enable WAL mode for better performance
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  // Apply v1 base migrations (0000-0004)
  applyMigration(sqlite, "0000_square_wallflower.sql");
  // Skip 0001 (FTS) — v2 migration will create updated FTS if needed
  applyMigration(sqlite, "0002_add_media_attachments.sql");
  applyMigration(sqlite, "0003_add_navigation_links.sql");
  applyMigration(sqlite, "0004_add_storage_provider.sql");

  // Apply v2 schema migration (0005)
  // Split FTS-related statements so we can handle them separately
  const v2Migration = readFileSync(
    resolve(MIGRATIONS_DIR, "0005_v2_schema_migration.sql"),
    "utf-8",
  );

  for (const stmt of v2Migration.split("--> statement-breakpoint")) {
    const trimmed = stmt.trim();
    if (!trimmed) continue;

    // Skip FTS-related statements if FTS not requested
    const isFts = trimmed.includes("posts_fts");
    if (!options?.fts && isFts) continue;

    try {
      sqlite.exec(trimmed);
    } catch {
      // Handle trigram tokenizer failure for FTS virtual table
      if (options?.fts && trimmed.includes("CREATE VIRTUAL TABLE")) {
        sqlite.exec(`
          CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(
            title,
            body,
            quote_text,
            content='posts',
            content_rowid='id'
          );
        `);
      }
      // Ignore DROP TRIGGER/TABLE IF EXISTS failures silently
      else if (
        !trimmed.startsWith("DROP TRIGGER") &&
        !trimmed.startsWith("DROP TABLE")
      ) {
        throw new Error(`Migration statement failed: ${trimmed.slice(0, 100)}`);
      }
    }
  }

  // Apply 0006: rename slug to path on posts
  applyMigration(sqlite, "0006_rename_slug_to_path.sql");

  // Apply 0007: post_collections M:N junction table
  const m7 = readFileSync(
    resolve(MIGRATIONS_DIR, "0007_post_collections_m2m.sql"),
    "utf-8",
  );
  for (const stmt of m7.split("--> statement-breakpoint")) {
    const trimmed = stmt.trim();
    if (!trimmed) continue;
    // Skip FTS trigger statements if FTS not requested
    const isFts = trimmed.includes("posts_fts");
    if (!options?.fts && isFts) continue;
    try {
      sqlite.exec(trimmed);
    } catch {
      // Ignore DROP TRIGGER failures silently
      if (!trimmed.startsWith("DROP TRIGGER")) {
        throw new Error(`Migration 0007 failed: ${trimmed.slice(0, 100)}`);
      }
    }
  }

  // Apply 0008: collection_dividers table
  applyMigration(sqlite, "0008_add_collection_dividers.sql");

  // Apply 0009: drop show_divider column from collections
  applyMigration(sqlite, "0009_drop_collection_show_divider.sql");

  // Apply 0010: performance indexes
  applyMigration(sqlite, "0010_add_performance_indexes.sql");

  // Apply 0011: path registry
  applyMigration(sqlite, "0011_add_path_registry.sql");

  // Apply 0012: Tiptap columns (summary)
  applyMigration(sqlite, "0012_add_tiptap_columns.sql");

  // Apply 0013: Replace featured with visibility
  applyMigration(sqlite, "0013_replace_featured_with_visibility.sql");

  // Apply 0014: Update FTS to use body_text + url instead of raw body JSON
  const m14 = readFileSync(
    resolve(MIGRATIONS_DIR, "0014_update_fts_body_text.sql"),
    "utf-8",
  );
  for (const stmt of m14.split("--> statement-breakpoint")) {
    const trimmed = stmt.trim();
    if (!trimmed) continue;
    const isFts = trimmed.includes("posts_fts");
    if (!options?.fts && isFts) continue;
    try {
      sqlite.exec(trimmed);
    } catch {
      // Handle trigram tokenizer failure for FTS virtual table
      if (options?.fts && trimmed.includes("CREATE VIRTUAL TABLE")) {
        sqlite.exec(`
          CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(
            title,
            body_text,
            quote_text,
            url,
            content='posts',
            content_rowid='id'
          );
        `);
      }
      // Ignore DROP TRIGGER/TABLE IF EXISTS failures silently
      else if (
        !trimmed.startsWith("DROP TRIGGER") &&
        !trimmed.startsWith("DROP TABLE")
      ) {
        throw new Error(`Migration 0014 failed: ${trimmed.slice(0, 100)}`);
      }
    }
  }

  // Apply 0015: add poster_key to media
  applyMigration(sqlite, "0015_add_media_poster_key.sql");

  // Apply 0016: add summary column to media
  applyMigration(sqlite, "0016_add_post_texts.sql");

  // Apply 0017: add updated_at to media
  applyMigration(sqlite, "0017_nice_ozymandias.sql");

  const db = drizzle(sqlite, { schema });

  // Polyfill D1 batch() for test compatibility.
  // In production, D1 batch executes statements atomically in a single transaction.
  // In tests, better-sqlite3 is synchronous and single-threaded so sequential
  // execution is effectively atomic.
  Object.defineProperty(db, "batch", {
    value: async (queries: PromiseLike<unknown>[]) => {
      const results = [];
      for (const q of queries) {
        results.push(await q);
      }
      return results;
    },
  });

  return { db, sqlite };
}
