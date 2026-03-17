/**
 * Minimal raw-query contract used by runtime-specific features such as FTS.
 *
 * This intentionally covers only the subset of native SQL behavior currently
 * needed outside the shared Drizzle CRUD path.
 */

export interface RawQueryStatement {
  bind(...params: unknown[]): RawQueryStatement;
  all<T = unknown>(): Promise<{ results?: T[] }>;
}

export interface RawQueryClient {
  prepare(query: string): RawQueryStatement;
}
