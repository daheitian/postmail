import { drizzle } from "drizzle-orm/node-postgres";
import { migrate as drizzleMigrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import type { Database } from "../index.js";
import type { RawQueryClient, RawQueryStatement } from "../raw-query.js";
import { pgSchemaBundle } from "../schema-bundle.js";

interface PostgresErrorLike extends Error {
  code?: string;
}

export function describePostgresTarget(databaseUrl: string): string {
  try {
    const parsed = new URL(databaseUrl);
    const protocol = parsed.protocol.replace(/:$/, "");
    const username = parsed.username || "<unknown-user>";
    const hostname = parsed.hostname || "<unknown-host>";
    const port = parsed.port || "5432";
    const database = parsed.pathname.replace(/^\/+/, "") || "<unknown-db>";
    return `${protocol}://${username}@${hostname}:${port}/${database}`;
  } catch {
    return "<invalid-postgres-url>";
  }
}

export function wrapPostgresConnectionError(
  error: unknown,
  databaseUrl: string,
  action: "connect" | "migrate",
): Error {
  const target = describePostgresTarget(databaseUrl);
  const pgError =
    error instanceof Error ? (error as PostgresErrorLike) : undefined;

  if (pgError?.code === "28P01") {
    return new Error(
      `Postgres authentication failed while attempting to ${action} ${target}. Check the DATABASE_URL username and password.`,
      { cause: error },
    );
  }

  if (pgError?.code === "3D000") {
    return new Error(
      `Postgres database does not exist while attempting to ${action} ${target}. Check the DATABASE_URL database name.`,
      { cause: error },
    );
  }

  return error instanceof Error
    ? error
    : new Error(`Failed to ${action} Postgres database ${target}.`, {
        cause: error,
      });
}

function convertQuestionMarkParams(query: string): string {
  let parameterIndex = 0;
  return query.replace(/\?/g, () => {
    parameterIndex += 1;
    return `$${parameterIndex}`;
  });
}

export function createNodePgRawQuery(pool: Pool): RawQueryClient {
  return {
    prepare(query: string): RawQueryStatement {
      let params: unknown[] = [];

      return {
        bind(...nextParams: unknown[]) {
          params = nextParams;
          return this;
        },
        async all<T>() {
          const result = await pool.query(
            convertQuestionMarkParams(query),
            params,
          );
          return {
            results: result.rows as T[],
          };
        },
      };
    },
  };
}

export async function assertPostgresInitialized(pool: Pool): Promise<void> {
  const result = await pool.query<{
    has_site: string | null;
    has_site_setting: string | null;
  }>(`
    SELECT
      to_regclass('public.site') AS has_site,
      to_regclass('public.site_setting') AS has_site_setting
  `);

  const row = result.rows[0];
  if (!row?.has_site || !row.has_site_setting) {
    throw new Error(
      "Database is not initialized. Run `jant migrate` before `jant start`.",
    );
  }
}

export async function createNodePgDatabase(
  databaseUrl: string,
  options?: { requireInitialized?: boolean },
): Promise<{
  db: Database;
  pool: Pool;
  rawQuery: RawQueryClient;
}> {
  const pool = new Pool({
    connectionString: databaseUrl,
  });

  try {
    await pool.query("SELECT 1");
    if (options?.requireInitialized) {
      await assertPostgresInitialized(pool);
    }

    return {
      db: drizzle(pool, { schema: pgSchemaBundle }) as unknown as Database,
      pool,
      rawQuery: createNodePgRawQuery(pool),
    };
  } catch (error) {
    await pool.end().catch(() => undefined);
    throw wrapPostgresConnectionError(error, databaseUrl, "connect");
  }
}

export async function migrateNodePgDatabase(
  databaseUrl: string,
  migrationsFolder: string,
): Promise<void> {
  const pool = new Pool({
    connectionString: databaseUrl,
  });

  try {
    const db = drizzle(pool, { schema: pgSchemaBundle });
    await drizzleMigrate(db, { migrationsFolder });
  } catch (error) {
    throw wrapPostgresConnectionError(error, databaseUrl, "migrate");
  } finally {
    await pool.end();
  }
}
