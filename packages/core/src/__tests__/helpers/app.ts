/**
 * Test App Helper
 *
 * Creates a minimal Hono app with services wired up for route testing.
 */

import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { createTestDatabase, DEFAULT_TEST_SITE_ID } from "./db.js";
import type { Database } from "../../db/index.js";
import type BetterSqlite3 from "better-sqlite3";
import { errorHandler } from "../../middleware/error-handler.js";
import { createI18n } from "../../i18n/i18n.js";
import { DEFAULT_APP_PORT } from "../../lib/env.js";
import { resolveConfig } from "../../lib/resolve-config.js";
import type { StorageDriver } from "../../lib/storage.js";
import { createServices } from "../../services/index.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

interface TestAppOptions {
  /** If true, all requests are treated as authenticated */
  authenticated?: boolean;
  /** Enable FTS for search tests */
  fts?: boolean;
  /** Enable public demo restrictions in appConfig */
  demoMode?: boolean;
  /** Optional storage driver for upload/settings route tests */
  storage?: StorageDriver | null;
  /** Optional internal admin token for internal API route tests */
  internalAdminToken?: string;
  /** Optional site resolution mode override */
  siteResolutionMode?: "single-site" | "host-based";
}

/**
 * Creates a test Hono app with real services backed by in-memory SQLite.
 * Returns the app and service instances for assertions.
 */
export function createTestApp(options: TestAppOptions = {}) {
  const testDb = createTestDatabase({ fts: options.fts });
  const db = testDb.db as unknown as Database;
  const sqlite = testDb.sqlite;

  // Create a mock D1 for search service
  const mockD1 = createMockD1(sqlite);

  const services = createServices(db, mockD1, DEFAULT_TEST_SITE_ID, {
    slugIdLength: 5,
  });

  const app = new Hono<Env>();

  // Global error handler: maps DomainError → HTTP responses
  app.onError(errorHandler);

  // Inject env bindings and services middleware
  app.use("*", async (c, next) => {
    // Provide mock env bindings so c.env.* works in route handlers
    c.env = {
      SITE_URL: `http://localhost:${DEFAULT_APP_PORT}`,
      DEMO_MODE: options.demoMode ? "true" : "false",
      INTERNAL_ADMIN_TOKEN: options.internalAdminToken,
      SITE_RESOLUTION_MODE: options.siteResolutionMode,
    } as AppVariables["services"] extends never ? never : Bindings;

    c.set("services", services as AppVariables["services"]);
    c.set("currentSite", {
      id: DEFAULT_TEST_SITE_ID,
      key: "default",
      status: "active",
      createdAt: 0,
      updatedAt: 0,
    });
    c.set("currentSiteDomain", null);
    const allSettings = await services.settings.getAll();
    c.set("allSettings", allSettings);
    c.set("appConfig", resolveConfig(c.env, allSettings));
    c.set("storage", options.storage ?? null);

    // i18n (English default for tests)
    const i18n = createI18n("en");
    c.set("lang", "en");
    c.set("i18n", i18n);

    if (options.authenticated) {
      // Mock auth that always returns a session
      c.set("auth", {
        api: {
          getSession: async () => ({
            user: { id: "test-user", email: "test@test.com", name: "Test" },
            session: { id: "test-session" },
          }),
        },
      } as AppVariables["auth"]);
    } else {
      c.set("auth", {
        api: {
          getSession: async () => null,
        },
      } as AppVariables["auth"]);
    }

    await next();
  });

  return { app, services, db, sqlite };
}

function createMockD1(sqliteDb: BetterSqlite3.Database) {
  return {
    prepare(query: string) {
      return {
        bind(...params: unknown[]) {
          return {
            async all<T>() {
              const stmt = sqliteDb.prepare(query);
              const rows = stmt.all(...(params as never[])) as T[];
              return { results: rows };
            },
          };
        },
      };
    },
  } as unknown as D1Database;
}
