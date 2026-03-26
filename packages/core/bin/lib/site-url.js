import { resolveWranglerVarString } from "./wrangler-config.js";

export function normalizeSitePathPrefix(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.pathname === "/" || parsed.pathname === "") {
      return "";
    }

    const normalized = parsed.pathname.replace(/\/+$/, "");
    return normalized.startsWith("/") ? normalized : `/${normalized}`;
  } catch {
    if (trimmed === "/" || trimmed === "") {
      return "";
    }

    const normalized = trimmed.replace(/\/+$/, "");
    return normalized.startsWith("/") ? normalized : `/${normalized}`;
  }
}

export function resolveSiteOrigin(options = {}) {
  const explicitSiteOrigin = options.siteOrigin?.trim();
  if (explicitSiteOrigin) {
    return new URL(explicitSiteOrigin).origin;
  }

  const envSiteOrigin = process.env.SITE_ORIGIN?.trim();
  if (envSiteOrigin) {
    return new URL(envSiteOrigin).origin;
  }

  const wranglerSiteOrigin = resolveWranglerVarString({
    configPath: options.config,
    env: options.env,
    key: "SITE_ORIGIN",
  });
  if (wranglerSiteOrigin) {
    return new URL(wranglerSiteOrigin).origin;
  }
  return "";
}

export function resolveSitePathPrefix(options = {}) {
  const explicitSitePathPrefix = options.sitePathPrefix?.trim();
  if (explicitSitePathPrefix) {
    return normalizeSitePathPrefix(explicitSitePathPrefix);
  }

  const envSitePathPrefix = process.env.SITE_PATH_PREFIX?.trim();
  if (envSitePathPrefix) {
    return normalizeSitePathPrefix(envSitePathPrefix);
  }

  const wranglerSitePathPrefix = resolveWranglerVarString({
    configPath: options.config,
    env: options.env,
    key: "SITE_PATH_PREFIX",
  });
  if (wranglerSitePathPrefix) {
    return normalizeSitePathPrefix(wranglerSitePathPrefix);
  }
  return "";
}

export function resolveSiteUrl(options = {}) {
  const explicitSiteUrl = options.url?.trim();
  if (explicitSiteUrl) {
    return explicitSiteUrl;
  }

  const siteOrigin = resolveSiteOrigin(options);
  if (!siteOrigin) {
    return "";
  }

  const sitePathPrefix = resolveSitePathPrefix(options);
  return `${siteOrigin}${sitePathPrefix}`;
}
