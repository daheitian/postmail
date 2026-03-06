/**
 * Test App Helper
 *
 * Creates a minimal Hono app with services wired up for route testing.
 */

import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { createTestDatabase } from "./db.js";
import { createPostService } from "../../services/post.js";
import { createSettingsService } from "../../services/settings.js";
import { createCustomUrlService } from "../../services/custom-url.js";
import { createMediaService } from "../../services/media.js";
import { createCollectionService } from "../../services/collection.js";
import { createSearchService } from "../../services/search.js";
import { createNavItemService } from "../../services/navigation.js";
import { createAuthService } from "../../services/auth.js";
import type { Database } from "../../db/index.js";
import type BetterSqlite3 from "better-sqlite3";
import { errorHandler } from "../../middleware/error-handler.js";
import { createI18n } from "../../i18n/i18n.js";
import { resolveConfig } from "../../lib/resolve-config.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

interface TestAppOptions {
  /** If true, all requests are treated as authenticated */
  authenticated?: boolean;
  /** Enable FTS for search tests */
  fts?: boolean;
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

  const settingsService = createSettingsService(db);
  const services = {
    posts: createPostService(db, { slugIdLength: 5 }),
    settings: settingsService,
    customUrls: createCustomUrlService(db),
    media: createMediaService(db),
    collections: createCollectionService(db),
    search: createSearchService(mockD1),
    navItems: createNavItemService(db),
    auth: createAuthService(db, settingsService),
  };

  const app = new Hono<Env>();

  // Global error handler: maps DomainError → HTTP responses
  app.onError(errorHandler);

  // Inject env bindings and services middleware
  app.use("*", async (c, next) => {
    // Provide mock env bindings so c.env.* works in route handlers
    c.env = {
      SITE_URL: "http://localhost:9020",
    } as AppVariables["services"] extends never ? never : Bindings;

    c.set("services", services as AppVariables["services"]);
    const allSettings = await services.settings.getAll();
    c.set("allSettings", allSettings);
    c.set("appConfig", resolveConfig(c.env, allSettings));
    c.set("storage", null);

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
