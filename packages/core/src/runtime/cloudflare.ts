import { createAuth, type Auth } from "../auth.js";
import { createDatabase, type Database } from "../db/index.js";
import { sqliteSchemaBundle } from "../db/schema-bundle.js";
import {
  getAuthSecret,
  getEnvString,
  getHostedAuthProviderLabel,
  getHostedAuthSsoSecret,
  getSiteResolutionMode,
  shouldUseSecureCookies,
} from "../lib/env.js";
import { createStorageDriver, type StorageDriver } from "../lib/storage.js";
import {
  createHostedHandoffService,
  type HostedHandoffService,
} from "../services/hosted-handoff.js";
import { createServices, type Services } from "../services/index.js";
import type { Bindings } from "../types/bindings.js";
import type { Site, SiteDomain } from "../types/entities.js";
import {
  getResolvedSiteBaseUrl,
  getSingleSiteBootstrapOptions,
  resolveRequestSite,
} from "./site.js";

export interface CloudflareRequestRuntime {
  auth: Auth;
  currentSite: Site;
  currentSiteDomain: SiteDomain | null;
  db: Database;
  hostedHandoff: HostedHandoffService;
  services: Services;
  storage: StorageDriver | null;
}

/**
 * Builds the per-request runtime objects for the current Cloudflare path.
 *
 * This isolates the Worker-specific database/session wiring so the app factory
 * can evolve toward runtime-agnostic composition.
 */
export async function createCloudflareRequestRuntime(
  env: Bindings,
  publicRequestUrl: string,
): Promise<CloudflareRequestRuntime> {
  if (!env.DB) {
    throw new Error("Cloudflare runtime requires a DB binding.");
  }
  const authSecret = getAuthSecret(env);
  const hostedAuthSsoSecret = getHostedAuthSsoSecret(env);
  if (!authSecret) {
    throw new Error("AUTH_SECRET should be set after startup validation.");
  }

  // Use withSession() to enable D1 Read Replication.
  const session = env.DB.withSession();

  // Note: Drizzle ORM doesn't officially support D1DatabaseSession yet
  // (issue #2226), but it works at runtime.
  const db = createDatabase(session as unknown as D1Database);
  const slugIdLength =
    parseInt(getEnvString(env, "SLUG_ID_LENGTH") ?? "5", 10) || 5;
  const siteLookup = await resolveRequestSite(db, env, publicRequestUrl);
  const baseURL = getResolvedSiteBaseUrl(
    env,
    publicRequestUrl,
    siteLookup.domain?.pathPrefix ?? null,
  );
  const auth = createAuth(db, {
    allowSystemUserProvisioning:
      Boolean(hostedAuthSsoSecret) &&
      getSiteResolutionMode(env) === "host-based",
    secret: authSecret,
    baseURL,
    databaseDialect: "sqlite",
    schema: sqliteSchemaBundle,
    useSecureCookies: shouldUseSecureCookies(env, publicRequestUrl),
  });

  return {
    auth,
    currentSite: siteLookup.site,
    currentSiteDomain: siteLookup.domain,
    db,
    hostedHandoff: createHostedHandoffService(db, auth, {
      providerLabel: getHostedAuthProviderLabel(env),
      schema: sqliteSchemaBundle,
      secret: hostedAuthSsoSecret,
    }),
    services: createServices(db, session, siteLookup.site.id, {
      databaseDialect: "sqlite",
      bootstrapSite: getSingleSiteBootstrapOptions(env),
      slugIdLength,
      schema: sqliteSchemaBundle,
    }),
    storage: createStorageDriver(env),
  };
}
