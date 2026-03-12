/**
 * Database utilities
 */

import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema.js";

export type Database = ReturnType<typeof createDatabase>;

export function createDatabase(d1: D1Database) {
  return drizzle(d1, { schema });
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
