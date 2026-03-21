/**
 * Database utilities
 */

import type BetterSqlite3 from "better-sqlite3";
import type { SQLWrapper } from "drizzle-orm";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import type { DatabaseDialect } from "./dialect.js";
import * as schema from "./schema.js";

export type Database = ReturnType<typeof createDatabase>;
type BatchQueries = Parameters<Database["batch"]>[0];
type BatchResults = Awaited<ReturnType<Database["batch"]>>;

export function createDatabase(d1: D1Database) {
  return drizzleD1(d1, { schema });
}

export function createNodeDatabase(sqlite: BetterSqlite3.Database): Database {
  const db = drizzleSqlite(sqlite, { schema }) as unknown as Database;

  Object.defineProperty(db, "batch", {
    configurable: true,
    value: async (queries: BatchQueries): Promise<BatchResults> => {
      sqlite.exec("BEGIN");
      try {
        const results: unknown[] = [];
        for (const query of queries) {
          results.push(await (query as unknown as PromiseLike<unknown>));
        }
        sqlite.exec("COMMIT");
        return results as BatchResults;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  });

  return db;
}

type ExecutableDatabase = {
  execute(query: SQLWrapper | string): PromiseLike<unknown>;
};

type NodeSqliteDatabaseClient = {
  pragma(sql: string): unknown;
};

/**
 * Execute a raw SQL statement against any supported runtime.
 *
 * SQLite/D1 databases expose `run()`, while Postgres databases expose
 * `execute()`. This helper keeps service code dialect-agnostic.
 */
export async function executeStatement(
  db: Database,
  query: SQLWrapper | string,
): Promise<void> {
  if ("execute" in db) {
    await (db as Database & ExecutableDatabase).execute(query);
    return;
  }

  await db.run(query);
}

export function isNodeSqliteDatabase(db: Database): boolean {
  const client = (db as Database & { $client?: unknown }).$client;
  return (
    typeof client === "object" &&
    client !== null &&
    "pragma" in client &&
    typeof (client as NodeSqliteDatabaseClient).pragma === "function"
  );
}

/**
 * Returns whether the current binding can safely use Drizzle's async callback
 * transaction API.
 *
 * Jant reserves this path for PostgreSQL. SQLite-family backends use
 * batch/sequential writes instead:
 * - better-sqlite3 should not be driven through async callback transactions
 * - Cloudflare D1 rejects BEGIN/SAVEPOINT statements emitted by Drizzle
 */
export function supportsDrizzleTransaction(
  db: Database,
  dialect: DatabaseDialect,
): boolean {
  return dialect === "pg" && !isNodeSqliteDatabase(db);
}

export { schema };

/**
 * D1 enforces a lower SQL variable limit than standard SQLite (~999).
 * Keep batch size well under the limit to leave room for other
 * query parameters besides the IN-list.
 */
const BATCH_SIZE = 50;

/**
 * Run a query function in batches to avoid SQLite's variable limit.
 * Splits `items` into chunks, calls `fn` for each chunk, and merges
 * the resulting Maps.
 *
 * @param items - Array of IDs to batch
 * @param fn - Async function that takes a chunk and returns a Map
 * @returns Merged Map from all batches
 */
export async function batchQuery<K, V>(
  items: K[],
  fn: (chunk: K[]) => Promise<Map<K, V>>,
): Promise<Map<K, V>> {
  if (items.length <= BATCH_SIZE) return fn(items);

  const result = new Map<K, V>();
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const chunk = items.slice(i, i + BATCH_SIZE);
    const partial = await fn(chunk);
    for (const [k, v] of partial) {
      result.set(k, v);
    }
  }
  return result;
}

/**
 * Like `batchQuery` but for functions that return an array of rows
 * rather than a Map.
 */
export async function batchQueryRows<K, R>(
  items: K[],
  fn: (chunk: K[]) => Promise<R[]>,
): Promise<R[]> {
  if (items.length <= BATCH_SIZE) return fn(items);

  const result: R[] = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const chunk = items.slice(i, i + BATCH_SIZE);
    const partial = await fn(chunk);
    result.push(...partial);
  }
  return result;
}
