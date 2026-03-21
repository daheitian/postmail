import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export function resolveDatabaseDialect(databaseUrl) {
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
    if (
      parsed.protocol === "postgres:" ||
      parsed.protocol === "postgresql:"
    ) {
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

export function resolveDatabasePath(databaseUrl, cwd = process.cwd()) {
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL must be set. Example: DATABASE_URL=file:./data/jant.sqlite",
    );
  }

  if (databaseUrl === ":memory:" || databaseUrl === "file::memory:") {
    return ":memory:";
  }

  if (resolveDatabaseDialect(databaseUrl) !== "sqlite") {
    throw new Error(
      "resolveDatabasePath() only supports SQLite DATABASE_URL values. Use a file: URL when running SQLite commands.",
    );
  }

  if (databaseUrl.startsWith("file://")) {
    return fileURLToPath(new URL(databaseUrl).href);
  }

  const rawPath = decodeURIComponent(databaseUrl.slice("file:".length));
  if (!rawPath) {
    throw new Error("DATABASE_URL points to an empty SQLite path.");
  }

  if (rawPath === ":memory:") {
    return ":memory:";
  }

  return isAbsolute(rawPath) ? rawPath : resolve(cwd, rawPath);
}

export function resolveDataDir(env = process.env, cwd = process.cwd()) {
  const configured = env.DATA_DIR;
  const candidate = configured || "data";
  return isAbsolute(candidate) ? candidate : resolve(cwd, candidate);
}

export function applyNodeRuntimeDefaults(env = process.env) {
  let dataDir;
  if (env.DATA_DIR) {
    dataDir = resolveDataDir(env);
  } else if (env.DATABASE_URL) {
    if (resolveDatabaseDialect(env.DATABASE_URL) === "sqlite") {
      const databasePath = resolveDatabasePath(env.DATABASE_URL);
      dataDir = databasePath === ":memory:" ? undefined : dirname(databasePath);
    }
  } else {
    dataDir = resolveDataDir(env);
  }

  if (dataDir && !env.DATA_DIR) {
    env.DATA_DIR = dataDir;
  }

  if (!env.DATABASE_URL && dataDir) {
    env.DATABASE_URL = pathToFileURL(join(dataDir, "jant.sqlite")).href;
  }

  if (dataDir && !env.LOCAL_STORAGE_PATH) {
    env.LOCAL_STORAGE_PATH = join(dataDir, "media");
  }
}

export function assertDatabaseInitialized(sqlite) {
  const hasSiteTable = sqlite
    .prepare(
      `
        SELECT 1
        FROM sqlite_master
        WHERE type = 'table' AND name = 'site'
        LIMIT 1
      `,
    )
    .pluck()
    .get();

  const hasSiteSettingsTable = sqlite
    .prepare(
      `
        SELECT 1
        FROM sqlite_master
        WHERE type = 'table' AND name = 'site_setting'
        LIMIT 1
      `,
    )
    .pluck()
    .get();

  if (!hasSiteTable || !hasSiteSettingsTable) {
    throw new Error(
      "Database is not initialized. Run `jant migrate` before using this command.",
    );
  }
}

export function openNodeSqlite(env = process.env, options = {}) {
  applyNodeRuntimeDefaults(env);
  const databasePath = resolveDatabasePath(env.DATABASE_URL ?? "");

  if (options.createParentDir && databasePath !== ":memory:") {
    mkdirSync(dirname(databasePath), { recursive: true });
  }

  const sqlite = new Database(databasePath, {
    readonly: options.readonly === true,
    fileMustExist: options.readonly === true && databasePath !== ":memory:",
  });

  sqlite.pragma("foreign_keys = ON");
  if (options.readonly !== true) {
    sqlite.pragma("journal_mode = WAL");
  }

  if (options.requireInitialized !== false) {
    assertDatabaseInitialized(sqlite);
  }

  return {
    databasePath,
    sqlite,
  };
}
