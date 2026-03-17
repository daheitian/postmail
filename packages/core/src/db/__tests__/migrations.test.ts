/**
 * Migration Integrity Tests
 *
 * Schema migrations stay append-only and must remain tracked in the Drizzle
 * journal. Most schema changes should be generated from `src/db/schema.ts`
 * via `mise run db-generate`.
 *
 * Rare manual schema exceptions are allowed when Drizzle cannot express the
 * object, such as FTS virtual tables or triggers. Those files still belong in
 * `src/db/migrations/`, must keep canonical numbering, and must update the
 * journal/snapshot metadata in the same change.
 *
 * Historical business-data fixes belong in `src/db/backfills/`.
 */

import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import { readdirSync, readFileSync } from "fs";
import { resolve } from "path";
import {
  extractNumberPrefix,
  isCanonicalNumberedSqlFile,
} from "../../../bin/lib/migration-artifacts.js";

const MIGRATIONS_DIR = resolve(import.meta.dirname, "../migrations");
const BACKFILLS_DIR = resolve(import.meta.dirname, "../backfills");
const JOURNAL_PATH = resolve(MIGRATIONS_DIR, "meta/_journal.json");

interface JournalEntry {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
}

interface Journal {
  version: string;
  dialect: string;
  entries: JournalEntry[];
}

function readJournal(): Journal {
  return JSON.parse(readFileSync(JOURNAL_PATH, "utf-8"));
}

function listMigrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

function listBackfillFiles(): string[] {
  try {
    return readdirSync(BACKFILLS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();
  } catch {
    return [];
  }
}

function applyMigration(sqlite: Database.Database, filename: string) {
  const migration = readFileSync(resolve(MIGRATIONS_DIR, filename), "utf-8");
  for (const sql of migration.split("--> statement-breakpoint")) {
    const trimmed = sql.trim();
    if (!trimmed) continue;
    sqlite.exec(trimmed);
  }
}

function insertRootPost(
  sqlite: Database.Database,
  values: {
    id: string;
    title: string;
    bodyText: string;
    createdAt: number;
  },
) {
  sqlite
    .prepare(
      `
        INSERT INTO post (
          id,
          format,
          status,
          visibility,
          title,
          body_text,
          thread_id,
          published_at,
          created_at,
          updated_at
        ) VALUES (?, 'note', 'published', 'public', ?, ?, ?, ?, ?, ?)
      `,
    )
    .run(
      values.id,
      values.title,
      values.bodyText,
      values.id,
      values.createdAt,
      values.createdAt,
      values.createdAt,
    );
}

function searchPostFts(sqlite: Database.Database, query: string) {
  return sqlite
    .prepare(
      "SELECT rowid, title, body_text AS bodyText FROM post_fts WHERE post_fts MATCH ? ORDER BY rowid",
    )
    .all(query);
}

describe("migration integrity", () => {
  it("every SQL file has a corresponding journal entry", () => {
    const journal = readJournal();
    const tags = new Set(journal.entries.map((e) => e.tag));
    const sqlFiles = listMigrationFiles();

    const untracked = sqlFiles
      .map((f) => f.replace(".sql", ""))
      .filter((tag) => !tags.has(tag));

    expect(
      untracked,
      [
        "These migration files are not tracked in meta/_journal.json.",
        "This usually means the file was added without matching Drizzle metadata.",
        "Default flow: update src/db/schema.ts first, then run `mise run db-generate`.",
        "Manual schema exceptions must add the matching journal and snapshot files in the same change.",
        `Untracked files: ${untracked.map((t) => `${t}.sql`).join(", ")}`,
      ].join("\n"),
    ).toEqual([]);
  });

  it("every journal entry has a corresponding SQL file", () => {
    const journal = readJournal();
    const sqlFiles = new Set(
      listMigrationFiles().map((f) => f.replace(".sql", "")),
    );

    const missing = journal.entries
      .map((e) => e.tag)
      .filter((tag) => !sqlFiles.has(tag));

    expect(
      missing,
      [
        "These journal entries have no matching SQL file.",
        `Missing files: ${missing.map((t) => `${t}.sql`).join(", ")}`,
      ].join("\n"),
    ).toEqual([]);
  });

  it("journal entries have sequential idx values", () => {
    const journal = readJournal();
    for (let i = 0; i < journal.entries.length; i++) {
      const entry = journal.entries[i];
      if (entry) expect(entry.idx).toBe(i);
    }
  });

  it("latest migration has a snapshot file", () => {
    const journal = readJournal();
    const lastEntry = journal.entries[journal.entries.length - 1];
    if (!lastEntry) return;

    const prefix = lastEntry.tag.split("_")[0];
    const snapshotPath = resolve(
      MIGRATIONS_DIR,
      `meta/${prefix}_snapshot.json`,
    );

    let exists = false;
    try {
      readFileSync(snapshotPath);
      exists = true;
    } catch {
      // file doesn't exist
    }

    expect(
      exists,
      [
        `Missing snapshot for latest migration: meta/${prefix}_snapshot.json`,
        "This means the migration metadata is incomplete.",
        "Fix: run `mise run db-generate`, or add the matching snapshot for a manual schema exception.",
      ].join("\n"),
    ).toBe(true);
  });

  it("schema migration files use canonical numbered filenames", () => {
    const invalid = listMigrationFiles().filter(
      (file) => !isCanonicalNumberedSqlFile(file),
    );

    expect(
      invalid,
      [
        "Schema migrations must use the `0000_name.sql` format.",
        "Generated and manual schema migrations share the same numbering rules.",
        "Use `src/db/backfills/` for historical data fixes instead.",
        `Invalid files: ${invalid.join(", ")}`,
      ].join("\n"),
    ).toEqual([]);
  });

  it("canonical schema migration number prefixes are unique", () => {
    const seen = new Map<string, string>();
    const duplicates: string[] = [];

    for (const file of listMigrationFiles()) {
      if (!isCanonicalNumberedSqlFile(file)) {
        continue;
      }

      const prefix = extractNumberPrefix(file);
      if (!prefix) {
        continue;
      }

      const previous = seen.get(prefix);
      if (previous) {
        duplicates.push(`${previous}, ${file}`);
        continue;
      }
      seen.set(prefix, file);
    }

    expect(
      duplicates,
      [
        "Canonical schema migrations must not share the same numeric prefix.",
        "Equal prefixes let external runners apply files in filesystem order.",
        `Duplicates: ${duplicates.join(" | ")}`,
      ].join("\n"),
    ).toEqual([]);
  });

  it("data backfills use canonical numbered filenames", () => {
    const files = listBackfillFiles();
    const invalid = files.filter((file) => !isCanonicalNumberedSqlFile(file));

    expect(
      invalid,
      [
        "Data backfills must use the `0000_name.sql` format.",
        "Backfills are append-only and tracked separately from schema migrations.",
        `Invalid files: ${invalid.join(", ")}`,
      ].join("\n"),
    ).toEqual([]);

    const seen = new Map<string, string>();
    const duplicates: string[] = [];
    for (const file of files) {
      const prefix = extractNumberPrefix(file);
      if (!prefix) {
        continue;
      }
      const previous = seen.get(prefix);
      if (previous) {
        duplicates.push(`${previous}, ${file}`);
        continue;
      }
      seen.set(prefix, file);
    }

    expect(
      duplicates,
      [
        "Data backfill number prefixes must be unique.",
        `Duplicates: ${duplicates.join(" | ")}`,
      ].join("\n"),
    ).toEqual([]);
  });

  it("fts schema migration rebuilds and maintains the post_fts index", () => {
    const sqlite = new Database(":memory:");
    sqlite.pragma("foreign_keys = ON");

    applyMigration(sqlite, "0000_baseline.sql");

    insertRootPost(sqlite, {
      id: "post-1",
      title: "Alpha note",
      bodyText: "alpha beta",
      createdAt: 1,
    });

    applyMigration(sqlite, "0001_fts_setup.sql");

    expect(searchPostFts(sqlite, "alpha")).toEqual([
      {
        rowid: 1,
        title: "Alpha note",
        bodyText: "alpha beta",
      },
    ]);

    insertRootPost(sqlite, {
      id: "post-2",
      title: "Beta note",
      bodyText: "delta epsilon",
      createdAt: 2,
    });

    expect(searchPostFts(sqlite, "delta")).toEqual([
      {
        rowid: 2,
        title: "Beta note",
        bodyText: "delta epsilon",
      },
    ]);

    sqlite
      .prepare(
        "UPDATE post SET title = ?, body_text = ?, updated_at = ? WHERE id = ?",
      )
      .run("Gamma note", "gamma theta", 3, "post-2");

    expect(searchPostFts(sqlite, "delta")).toEqual([]);
    expect(searchPostFts(sqlite, "gamma")).toEqual([
      {
        rowid: 2,
        title: "Gamma note",
        bodyText: "gamma theta",
      },
    ]);

    sqlite.prepare("DELETE FROM post WHERE id = ?").run("post-1");
    expect(searchPostFts(sqlite, "alpha")).toEqual([]);
  });
});
