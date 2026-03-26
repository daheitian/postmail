import {
  getConfiguredSingleSitePathPrefix,
  getSiteResolutionMode,
} from "./env.js";

/**
 * Resolves the active public path prefix for the current request.
 *
 * @param input - Current runtime env plus any already-resolved site metadata
 * @returns The public path prefix for the active site, or an empty string
 * @example
 * getRuntimeSitePathPrefix({ env: { SITE_PATH_PREFIX: "/blog" } });
 */
export function getRuntimeSitePathPrefix(input: {
  env: object | undefined | null;
  appConfig?: { sitePathPrefix: string } | null;
  currentSiteDomain?: { pathPrefix?: string | null } | null;
}): string {
  if (input.appConfig) {
    return input.appConfig.sitePathPrefix;
  }

  if (getSiteResolutionMode(input.env) === "host-based") {
    return input.currentSiteDomain?.pathPrefix?.trim() || "";
  }

  return getConfiguredSingleSitePathPrefix(input.env);
}
