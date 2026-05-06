import type { Site, SiteDomain } from "../types.js";
import type { Services } from "../services/index.js";

const CANONICAL_REDIRECT_BYPASS_PREFIXES = [
  "/.well-known/jant-verification",
  "/__dev",
  "/__sso",
  "/api/",
  "/compose",
  "/reset",
  "/settings",
  "/signin",
  "/signout",
] as const;

export function shouldBypassHostedCanonicalRedirect(pathname: string): boolean {
  return CANONICAL_REDIRECT_BYPASS_PREFIXES.some(
    (prefix) =>
      pathname === prefix ||
      pathname.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`),
  );
}

export async function getHostedCanonicalRedirect(input: {
  currentSite: Site;
  currentSiteDomain: SiteDomain | null;
  publicRequestUrl: string;
  services: Pick<Services, "site">;
}): Promise<string | null> {
  const { currentSite, currentSiteDomain, publicRequestUrl, services } = input;
  if (!currentSiteDomain || currentSiteDomain.kind !== "alias") {
    return null;
  }

  if (!currentSiteDomain.redirectToPrimary) {
    return null;
  }

  if (currentSiteDomain.pathPrefix) {
    return null;
  }

  const requestUrl = new URL(publicRequestUrl);
  if (shouldBypassHostedCanonicalRedirect(requestUrl.pathname)) {
    return null;
  }

  const primaryDomain = await services.site.getPrimaryDomainForSite(
    currentSite.id,
  );
  if (!primaryDomain || primaryDomain.pathPrefix) {
    return null;
  }

  if (primaryDomain.host === currentSiteDomain.host) {
    return null;
  }

  requestUrl.host = primaryDomain.host;
  return requestUrl.toString();
}
