/**
 * Test App Helper
 *
 * Creates a minimal Hono app with services wired up for route testing.
 */

import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../app.js";
import { createTestDatabase } from "./db.js";
import { createPostService } from "../../services/post.js";
import { createSettingsService } from "../../services/settings.js";
import { createRedirectService } from "../../services/redirect.js";
import { createMediaService } from "../../services/media.js";
import { createCollectionService } from "../../services/collection.js";
import { createSearchService } from "../../services/search.js";
import type { Database } from "../../db/index.js";
import type BetterSqlite3 from "better-sqlite3";

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

  const services = {
    posts: createPostService(db),
    settings: createSettingsService(db),
    redirects: createRedirectService(db),
    media: createMediaService(db),
    collections: createCollectionService(db),
    search: createSearchService(mockD1),
  };

  const app = new Hono<Env>();

  // Inject services middleware
  app.use("*", async (c, next) => {
    c.set("services", services as AppVariables["services"]);
    c.set("config", {});

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
