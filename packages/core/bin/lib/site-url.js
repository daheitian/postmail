import { resolveWranglerVarString } from "./wrangler-config.js";

export function normalizeSitePathPrefix(siteUrl) {
  const trimmed = siteUrl.trim();
  if (!trimmed) {
    return "";
  }

  const parsed = new URL(trimmed);
  if (parsed.pathname === "/" || parsed.pathname === "") {
    return "";
  }

  const normalized = parsed.pathname.replace(/\/+$/, "");
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

export function resolveSiteUrl(options = {}) {
  const explicitSiteUrl = options.siteUrl?.trim();
  if (explicitSiteUrl) {
    return explicitSiteUrl;
  }

  const envSiteUrl = process.env.SITE_URL?.trim();
  if (envSiteUrl) {
    return envSiteUrl;
  }

  return (
    resolveWranglerVarString({
      configPath: options.config,
      env: options.env,
      key: "SITE_URL",
    }) ?? ""
  );
}
