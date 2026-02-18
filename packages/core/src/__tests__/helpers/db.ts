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

  const db = drizzle(sqlite, { schema });

  return { db, sqlite };
}
