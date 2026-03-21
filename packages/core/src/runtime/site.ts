import type { Database } from "../db/index.js";
import { getSiteResolutionMode, getSiteUrl } from "../lib/env.js";
import { getSitePathPrefix, normalizeSiteUrl } from "../lib/url.js";
import {
  createSiteService,
  type EnsureSingleSiteOptions,
  type SiteLookupResult,
} from "../services/site.js";
import type { Bindings } from "../types/bindings.js";

function getSingleSiteBootstrapOptions(
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
): Promise<SiteLookupResult> {
  const siteService = createSiteService(db);
  const resolutionMode = getSiteResolutionMode(env);

  if (resolutionMode === "single-site") {
    return siteService.ensureSingleSite(getSingleSiteBootstrapOptions(env));
  }

  const requestUrl = new URL(publicRequestUrl);
  const resolved = await siteService.resolveByHost(requestUrl.host);
  if (!resolved) {
    throw new Error(`No site configured for host "${requestUrl.host}".`);
  }
  return resolved;
}

export async function resolveCliSite(
  db: Database,
  env: Bindings,
): Promise<SiteLookupResult> {
  const siteService = createSiteService(db);
  const resolutionMode = getSiteResolutionMode(env);

  if (resolutionMode === "single-site") {
    return siteService.ensureSingleSite(getSingleSiteBootstrapOptions(env));
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
