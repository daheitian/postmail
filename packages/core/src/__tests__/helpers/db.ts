/**
 * Test Database Helper
 *
 * Creates an in-memory SQLite database with all migrations applied.
 * Used for service integration tests.
 */

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../../db/schema.js";
import { readFileSync } from "fs";
import { resolve } from "path";

const MIGRATIONS_DIR = resolve(import.meta.dirname, "../../db/migrations");

/**
 * Creates a fresh in-memory SQLite database with all migrations applied.
 * Each call returns an isolated database instance for test isolation.
 *
 * @param options.fts - Whether to apply FTS5 migration (default: false).
 *   The trigram tokenizer used in production may not be available in all
 *   better-sqlite3 builds, so FTS is opt-in for tests that need it.
 */
export function createTestDatabase(options?: { fts?: boolean }) {
  const sqlite = new Database(":memory:");

  // Enable WAL mode for better performance
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  // Apply base schema migration
  const migration0 = readFileSync(
    resolve(MIGRATIONS_DIR, "0000_square_wallflower.sql"),
    "utf-8",
  );

  // Drizzle migrations use --> statement-breakpoint as separator
  for (const sql of migration0.split("--> statement-breakpoint")) {
    const trimmed = sql.trim();
    if (trimmed) sqlite.exec(trimmed);
  }

  // Optionally apply FTS5 migration (with fallback tokenizer)
  if (options?.fts) {
    try {
      const migration1 = readFileSync(
        resolve(MIGRATIONS_DIR, "0001_add_search_fts.sql"),
        "utf-8",
      );
      sqlite.exec(migration1);
    } catch {
      // Fallback: create FTS table with default tokenizer if trigram not available
      sqlite.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(
          title,
          content,
          content='posts',
          content_rowid='id'
        );

        CREATE TRIGGER IF NOT EXISTS posts_fts_insert AFTER INSERT ON posts
        WHEN NEW.deleted_at IS NULL
        BEGIN
          INSERT INTO posts_fts(rowid, title, content)
          VALUES (NEW.id, COALESCE(NEW.title, ''), COALESCE(NEW.content, ''));
        END;

        CREATE TRIGGER IF NOT EXISTS posts_fts_update AFTER UPDATE ON posts BEGIN
          DELETE FROM posts_fts WHERE rowid = OLD.id;
          INSERT INTO posts_fts(rowid, title, content)
          SELECT NEW.id, COALESCE(NEW.title, ''), COALESCE(NEW.content, '')
          WHERE NEW.deleted_at IS NULL;
        END;

        CREATE TRIGGER IF NOT EXISTS posts_fts_delete AFTER DELETE ON posts BEGIN
          DELETE FROM posts_fts WHERE rowid = OLD.id;
        END;
      `);
    }
  }

  // Apply media attachments migration (position + blurhash)
  const migration2 = readFileSync(
    resolve(MIGRATIONS_DIR, "0002_add_media_attachments.sql"),
    "utf-8",
  );
  for (const sql of migration2.split("--> statement-breakpoint")) {
    const trimmed = sql.trim();
    if (trimmed) sqlite.exec(trimmed);
  }

  // Apply navigation links migration
  const migration3 = readFileSync(
    resolve(MIGRATIONS_DIR, "0003_add_navigation_links.sql"),
    "utf-8",
  );
  for (const sql of migration3.split("--> statement-breakpoint")) {
    const trimmed = sql.trim();
    if (trimmed) sqlite.exec(trimmed);
  }

  // Apply storage provider migration
  const migration4 = readFileSync(
    resolve(MIGRATIONS_DIR, "0004_add_storage_provider.sql"),
    "utf-8",
  );
  for (const sql of migration4.split("--> statement-breakpoint")) {
    const trimmed = sql.trim();
    if (trimmed) sqlite.exec(trimmed);
  }

  const db = drizzle(sqlite, { schema });

  return { db, sqlite };
}
