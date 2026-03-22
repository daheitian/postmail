import type { Database } from "../db/index.js";
import {
  sqliteSchemaBundle,
  type DatabaseSchema,
} from "../db/schema-bundle.js";
import { getSiteResolutionMode, getSiteUrl } from "../lib/env.js";
import { getSitePathPrefix, normalizeSiteUrl } from "../lib/url.js";
import {
  createSiteService,
  createTransientSite,
  type EnsureSingleSiteOptions,
  type SiteLookupResult,
  TRANSIENT_SINGLE_SITE_ID,
} from "../services/site.js";
import { NotFoundError } from "../lib/errors.js";
import type { Bindings } from "../types/bindings.js";

export function getSingleSiteBootstrapOptions(
  env: Bindings,
): EnsureSingleSiteOptions | undefined {
  const configuredSiteUrl = getSiteUrl(env).trim();
  if (!configuredSiteUrl) {
    return undefined;
  }

  const parsed = new URL(normalizeSiteUrl(configuredSiteUrl));
  return {
    host: parsed.host,
    pathPrefix: getSitePathPrefix(parsed.toString()) || null,
  };
}

export async function resolveRequestSite(
  db: Database,
  env: Bindings,
  publicRequestUrl: string,
  databaseSchema: DatabaseSchema = sqliteSchemaBundle,
): Promise<SiteLookupResult> {
  const siteService = createSiteService(db, databaseSchema);
  const resolutionMode = getSiteResolutionMode(env);
  const requestUrl = new URL(publicRequestUrl);

  if (resolutionMode === "single-site") {
    return siteService.resolveSingleSite({
      ...getSingleSiteBootstrapOptions(env),
      createIfMissing: false,
    });
  }

  const resolved = await siteService.resolveByHost(requestUrl.host);
  if (!resolved) {
    if (requestUrl.pathname.startsWith("/api/internal/")) {
      return {
        site: createTransientSite("internal"),
        domain: null,
      };
    }
    throw new NotFoundError("Site");
  }
  return resolved;
}

export async function resolveCliSite(
  db: Database,
  env: Bindings,
  databaseSchema: DatabaseSchema = sqliteSchemaBundle,
): Promise<SiteLookupResult> {
  const siteService = createSiteService(db, databaseSchema);
  const resolutionMode = getSiteResolutionMode(env);

  if (resolutionMode === "single-site") {
    const resolved = await siteService.resolveSingleSite({
      ...getSingleSiteBootstrapOptions(env),
      createIfMissing: false,
    });

    if (resolved.site.id === TRANSIENT_SINGLE_SITE_ID) {
      throw new Error(
        "No site is configured for this instance yet. Finish /setup before running this command.",
      );
    }

    return resolved;
  }

  const onlySite = await siteService.getOnlySite();
  if (!onlySite) {
    throw new Error(
      "CLI site selection for host-based mode is not implemented yet.",
    );
  }

  return {
    site: onlySite,
    domain: null,
  };
}

export function getResolvedSiteBaseUrl(
  env: Bindings,
  publicRequestUrl: string,
  pathPrefix?: string | null,
): string {
  const resolutionMode = getSiteResolutionMode(env);
  if (resolutionMode === "single-site") {
    return getSiteUrl(env) || new URL(publicRequestUrl).origin;
  }

  const requestUrl = new URL(publicRequestUrl);
  const normalizedPathPrefix = pathPrefix?.trim() || "";
  return `${requestUrl.origin}${normalizedPathPrefix}`;
}
