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
