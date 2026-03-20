import type BetterSqlite3 from "better-sqlite3";
import { createNodeDatabase, type Database } from "../db/index.js";
import type { RawQueryClient, RawQueryStatement } from "../db/raw-query.js";
import { createAuth, type Auth } from "../auth.js";
import {
  getAuthSecret,
  getEnvString,
  getSiteUrl,
  shouldUseSecureCookies,
} from "../lib/env.js";
import { createStorageDriver, type StorageDriver } from "../lib/storage.js";
import { createServices, type Services } from "../services/index.js";
import type { Bindings } from "../types/bindings.js";

export interface NodeRequestRuntime {
  auth: Auth;
  db: Database;
  services: Services;
  storage: StorageDriver | null;
}

export interface NodeCliRuntime {
  db: Database;
  services: Services;
  storage: StorageDriver | null;
}

function createBetterSqliteRawQuery(
  sqlite: BetterSqlite3.Database,
): RawQueryClient {
  return {
    prepare(query: string): RawQueryStatement {
      let params: unknown[] = [];

      return {
        bind(...nextParams: unknown[]) {
          params = nextParams;
          return this;
        },
        async all<T>() {
          const stmt = sqlite.prepare(query);
          return {
            results: stmt.all(...params) as T[],
          };
        },
      };
    },
  };
}

/**
 * Builds the per-request runtime objects for the Node path.
 *
 * The SQLite connection itself is created at process startup and attached to
 * the bindings as `NODE_SQLITE`.
 */
export async function createNodeRequestRuntime(
  env: Bindings,
  publicRequestUrl: string,
): Promise<NodeRequestRuntime> {
  const sqlite = env.NODE_SQLITE;
  if (!sqlite) {
    throw new Error("Node runtime requires NODE_SQLITE.");
  }

  const authSecret = getAuthSecret(env);
  if (!authSecret) {
    throw new Error("AUTH_SECRET should be set after startup validation.");
  }

  const db = createNodeDatabase(sqlite);
  const slugIdLength =
    parseInt(getEnvString(env, "SLUG_ID_LENGTH") ?? "5", 10) || 5;
  const requestUrl = new URL(publicRequestUrl);
  const baseURL = getSiteUrl(env) || requestUrl.origin;

  return {
    db,
    services: createServices(db, createBetterSqliteRawQuery(sqlite), {
      slugIdLength,
    }),
    storage: createStorageDriver(env),
    auth: createAuth(db, {
      secret: authSecret,
      baseURL,
      useSecureCookies: shouldUseSecureCookies(env, publicRequestUrl),
    }),
  };
}

/**
 * Builds the runtime objects needed by local CLI commands.
 *
 * Unlike the request runtime, this path does not require auth configuration.
 */
export async function createNodeCliRuntime(
  env: Bindings,
): Promise<NodeCliRuntime> {
  const sqlite = env.NODE_SQLITE;
  if (!sqlite) {
    throw new Error("Node CLI runtime requires NODE_SQLITE.");
  }

  const db = createNodeDatabase(sqlite);
  const slugIdLength =
    parseInt(getEnvString(env, "SLUG_ID_LENGTH") ?? "5", 10) || 5;

  return {
    db,
    services: createServices(db, createBetterSqliteRawQuery(sqlite), {
      slugIdLength,
    }),
    storage: createStorageDriver(env),
  };
}
