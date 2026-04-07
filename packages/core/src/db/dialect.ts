export type DatabaseDialect = "sqlite" | "pg";

const POSTGRES_PROTOCOLS = new Set(["postgres:", "postgresql:"]);

/**
 * Resolves the supported Jant database dialect from a DATABASE_URL value.
 *
 * @param databaseUrl - Raw DATABASE_URL value from the environment.
 * @returns The normalized Jant database dialect.
 * @example
 * resolveDatabaseDialect("file:./data/jant.sqlite");
 * // => "sqlite"
 *
 * @example
 * resolveDatabaseDialect("postgres://localhost:5432/jant");
 * // => "pg"
 */
export function resolveDatabaseDialect(databaseUrl: string): DatabaseDialect {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL must be set.");
  }

  if (
    databaseUrl === ":memory:" ||
    databaseUrl === "file::memory:" ||
    databaseUrl.startsWith("file:")
  ) {
    return "sqlite";
  }

  try {
    const parsed = new URL(databaseUrl);
    if (POSTGRES_PROTOCOLS.has(parsed.protocol)) {
      return "pg";
    }
  } catch {
    throw new Error(
      "DATABASE_URL must use the file:, postgres:, or postgresql: scheme.",
    );
  }

  throw new Error(
    "DATABASE_URL must use the file:, postgres:, or postgresql: scheme.",
  );
}

/**
 * Returns whether the given DATABASE_URL points at a SQLite database.
 *
 * @param databaseUrl - Raw DATABASE_URL value from the environment.
 * @returns `true` when the URL resolves to SQLite.
 * @example
 * isSqliteDatabaseUrl("file:./data/jant.sqlite");
 * // => true
 */
export function isSqliteDatabaseUrl(databaseUrl: string): boolean {
  return resolveDatabaseDialect(databaseUrl) === "sqlite";
}

/**
 * Returns whether the given DATABASE_URL points at a PostgreSQL database.
 *
 * @param databaseUrl - Raw DATABASE_URL value from the environment.
 * @returns `true` when the URL resolves to PostgreSQL.
 * @example
 * isPostgresDatabaseUrl("postgres://localhost:5432/jant");
 * // => true
 */
export function isPostgresDatabaseUrl(databaseUrl: string): boolean {
  return resolveDatabaseDialect(databaseUrl) === "pg";
}

/**
 * Check if an error (or any of its causes) is a unique constraint violation.
 *
 * Supports both SQLite (D1) and PostgreSQL error formats.
 *
 * @param err - The caught error value.
 * @returns `true` when the error chain contains a unique constraint violation.
 * @example
 * try { await db.insert(...) } catch (err) {
 *   if (isUniqueConstraintError(err)) { ... }
 * }
 */
export function isUniqueConstraintError(err: unknown): boolean {
  let current: unknown = err;
  while (current) {
    const msg = String(current);
    // SQLite / D1
    if (
      msg.includes("UNIQUE constraint") ||
      msg.includes("SQLITE_CONSTRAINT")
    ) {
      return true;
    }
    // PostgreSQL (code 23505 = unique_violation)
    if (
      msg.includes("duplicate key value violates unique constraint") ||
      (current instanceof Error &&
        "code" in current &&
        (current as Record<string, unknown>).code === "23505")
    ) {
      return true;
    }
    current =
      current instanceof Error && current.cause !== current
        ? current.cause
        : undefined;
  }
  return false;
}
