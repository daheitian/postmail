/**
 * Test Database Helper
 *
 * Creates an in-memory SQLite database with all migrations applied.
 * Used for service integration tests.
 */

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../../db/schema.js";
import { readFileSync, readdirSync } from "fs";
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

  // Apply the base schema migration (0000_*.sql)
  const baseFile = readdirSync(MIGRATIONS_DIR).find((f) =>
    f.startsWith("0000_"),
  );
  if (!baseFile) throw new Error("Base migration (0000_*) not found");
  applyMigration(sqlite, baseFile);

  // Apply FTS migration if requested
  if (options?.fts) {
    const ftsFile = readdirSync(MIGRATIONS_DIR).find((f) =>
      f.startsWith("0001_"),
    );
    if (!ftsFile) throw new Error("FTS migration (0001_*) not found");

    const ftsSql = readFileSync(resolve(MIGRATIONS_DIR, ftsFile), "utf-8");
    for (const stmt of ftsSql.split("--> statement-breakpoint")) {
      const trimmed = stmt.trim();
      if (!trimmed) continue;
      try {
        sqlite.exec(trimmed);
      } catch {
        // Trigram tokenizer may not be available — fall back to default tokenizer
        if (trimmed.includes("CREATE VIRTUAL TABLE")) {
          sqlite.exec(`
            CREATE VIRTUAL TABLE IF NOT EXISTS post_fts USING fts5(
              title,
              body_text,
              quote_text,
              url,
              content='post',
              content_rowid='rowid'
            );
          `);
        }
        // Ignore trigger failures if virtual table creation failed
        else if (!trimmed.startsWith("CREATE TRIGGER")) {
          throw new Error(
            `FTS migration statement failed: ${trimmed.slice(0, 100)}`,
          );
        }
      }
    }

    // If trigram fallback was used, triggers need to be created without trigram
    // Re-create triggers unconditionally (IF NOT EXISTS handles idempotency)
    sqlite.exec(`
      CREATE TRIGGER IF NOT EXISTS post_ai AFTER INSERT ON post BEGIN
        INSERT INTO post_fts(rowid, title, body_text, quote_text, url)
        VALUES (new.rowid, new.title, new.body_text, new.quote_text, new.url);
      END;
      CREATE TRIGGER IF NOT EXISTS post_ad AFTER DELETE ON post BEGIN
        INSERT INTO post_fts(post_fts, rowid, title, body_text, quote_text, url)
        VALUES ('delete', old.rowid, old.title, old.body_text, old.quote_text, old.url);
      END;
      CREATE TRIGGER IF NOT EXISTS post_au AFTER UPDATE ON post BEGIN
        INSERT INTO post_fts(post_fts, rowid, title, body_text, quote_text, url)
        VALUES ('delete', old.rowid, old.title, old.body_text, old.quote_text, old.url);
        INSERT INTO post_fts(rowid, title, body_text, quote_text, url)
        VALUES (new.rowid, new.title, new.body_text, new.quote_text, new.url);
      END;
    `);
  }

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
