import { createAuth, type Auth } from "../auth.js";
import { createDatabase, type Database } from "../db/index.js";
import {
  getAuthSecret,
  getEnvString,
  getSiteUrl,
  shouldUseSecureCookies,
} from "../lib/env.js";
import { createStorageDriver, type StorageDriver } from "../lib/storage.js";
import { createServices, type Services } from "../services/index.js";
import type { Bindings } from "../types/bindings.js";

export interface CloudflareRequestRuntime {
  auth: Auth;
  db: Database;
  services: Services;
  storage: StorageDriver | null;
}

/**
 * Builds the per-request runtime objects for the current Cloudflare path.
 *
 * This isolates the Worker-specific database/session wiring so the app factory
 * can evolve toward runtime-agnostic composition.
 */
export function createCloudflareRequestRuntime(
  env: Bindings,
  publicRequestUrl: string,
): CloudflareRequestRuntime {
  if (!env.DB) {
    throw new Error("Cloudflare runtime requires a DB binding.");
  }
  const authSecret = getAuthSecret(env);
  if (!authSecret) {
    throw new Error("JANT_AUTH_SECRET should be set after startup validation.");
  }

  // Use withSession() to enable D1 Read Replication.
  const session = env.DB.withSession();

  // Note: Drizzle ORM doesn't officially support D1DatabaseSession yet
  // (issue #2226), but it works at runtime.
  const db = createDatabase(session as unknown as D1Database);
  const slugIdLength =
    parseInt(
      getEnvString(env, "JANT_SLUG_ID_LENGTH", "SLUG_ID_LENGTH") ?? "5",
      10,
    ) || 5;
  const requestUrl = new URL(publicRequestUrl);
  const baseURL = getSiteUrl(env) || requestUrl.origin;

  return {
    db,
    services: createServices(db, session, { slugIdLength }),
    storage: createStorageDriver(env),
    auth: createAuth(db, {
      secret: authSecret,
      baseURL,
      useSecureCookies: shouldUseSecureCookies(env, publicRequestUrl),
    }),
  };
}
