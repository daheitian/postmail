/**
 * Unified App Configuration
 *
 * Resolves all configuration from environment + DB settings into a single
 * immutable object. Created once per request in middleware, then accessed
 * via `c.var.appConfig` everywhere else.
 *
 * Priority: DB > ENV > Default (for user-configurable fields)
 *           ENV > Default (for envOnly fields)
 */

import type { Bindings } from "../types/bindings.js";
import type { AppConfig } from "../types/config.js";
import { CONFIG_FIELDS } from "../types/config.js";
import { ASSET_BASE_PATH } from "./asset-path.js";
import {
  getAuthSecret,
  getConfiguredStorageDriver,
  getEnvString,
  getSiteUrl,
} from "./env.js";
import { getPublicUrlForProvider, getMediaUrl } from "./image.js";
import { getSiteOrigin, getSitePathPrefix, normalizeSiteUrl } from "./url.js";

/**
 * Resolve a single config value following priority rules.
 *
 * @param key - CONFIG_FIELDS key
 * @param allSettings - DB settings map
 * @param env - Worker bindings
 * @returns Resolved string value
 */
function resolve(
  key: string,
  allSettings: Record<string, string>,
  env: Bindings,
): string {
  const field = CONFIG_FIELDS[key as keyof typeof CONFIG_FIELDS];
  if (!field) return "";
  const envKeys = "envKeys" in field ? field.envKeys : undefined;

  // User-configurable: DB > ENV > Default
  if (!field.envOnly) {
    const dbValue = allSettings[key];
    if (dbValue) return dbValue;
  }

  // ENV > Default
  const envValue = getEnvString(env, ...(envKeys ?? []));
  if (envValue) return envValue;

  return field.defaultValue;
}

/**
 * Resolve a fallback value (ENV > Default), skipping the database.
 * Used for placeholder values in forms.
 *
 * @param key - CONFIG_FIELDS key
 * @param env - Worker bindings
 * @returns Fallback value
 */
function resolveFallback(key: string, env: Bindings): string {
  const field = CONFIG_FIELDS[key as keyof typeof CONFIG_FIELDS];
  if (!field) return "";
  const envKeys = "envKeys" in field ? field.envKeys : undefined;

  const envValue = getEnvString(env, ...(envKeys ?? []));
  if (envValue) return envValue;

  return field.defaultValue;
}

/**
 * Build a complete AppConfig from environment bindings and DB settings.
 *
 * Pure function — no side effects, no DB access.
 *
 * @param env - Cloudflare Worker bindings
 * @param allSettings - All DB settings (from `services.settings.getAll()`)
 * @returns Fully resolved AppConfig
 *
 * @example
 * ```ts
 * const allSettings = await services.settings.getAll();
 * const appConfig = resolveConfig(c.env, allSettings);
 * ```
 */
export function resolveConfig(
  env: Bindings,
  allSettings: Record<string, string>,
): AppConfig {
  const siteUrl = normalizeSiteUrl(getSiteUrl(env));
  const siteOrigin = getSiteOrigin(siteUrl);
  const sitePathPrefix = getSitePathPrefix(siteUrl);
  const storageDriver = getConfiguredStorageDriver(env);
  const r2PublicUrl =
    getEnvString(env, "JANT_R2_PUBLIC_URL", "R2_PUBLIC_URL") || "";
  const s3PublicUrl =
    getEnvString(env, "JANT_S3_PUBLIC_URL", "S3_PUBLIC_URL") || "";
  const localPublicUrl =
    getEnvString(env, "JANT_LOCAL_PUBLIC_URL", "LOCAL_PUBLIC_URL") || "";
  const imageTransformUrl =
    getEnvString(env, "JANT_IMAGE_TRANSFORM_URL", "IMAGE_TRANSFORM_URL") || "";
  const demoMode = getEnvString(env, "JANT_DEMO_MODE", "DEMO_MODE") === "true";

  // Resolve avatar URL from storage key
  const siteAvatar = allSettings["SITE_AVATAR"] ?? "";
  let siteAvatarUrl = "";
  if (siteAvatar) {
    const publicUrl = getPublicUrlForProvider(
      storageDriver,
      r2PublicUrl,
      s3PublicUrl,
      localPublicUrl,
    );
    siteAvatarUrl = getMediaUrl(siteAvatar, publicUrl, sitePathPrefix);
  }

  // Description is "explicit" when set in DB or ENV (not just the default)
  const dbDescription = allSettings["SITE_DESCRIPTION"];
  const envDescription = getEnvString(
    env,
    "JANT_SITE_DESCRIPTION",
    "SITE_DESCRIPTION",
  );
  const siteDescriptionExplicit = !!(dbDescription || envDescription);

  return {
    // Site identity (DB > ENV > Default)
    siteName: resolve("SITE_NAME", allSettings, env),
    siteDescription: resolve("SITE_DESCRIPTION", allSettings, env),
    siteDescriptionExplicit,
    siteLanguage: resolve("SITE_LANGUAGE", allSettings, env),
    homeDefaultView: resolve("HOME_DEFAULT_VIEW", allSettings, env),
    mainRssFeed: resolve("MAIN_RSS_FEED", allSettings, env),
    headerNavMaxVisible: (() => {
      const parsed = parseInt(
        resolve("HEADER_NAV_MAX_VISIBLE", allSettings, env),
        10,
      );
      return Math.max(0, Math.min(5, isNaN(parsed) ? 2 : parsed));
    })(),
    timeZone: resolve("TIME_ZONE", allSettings, env),
    siteFooter: resolve("SITE_FOOTER", allSettings, env),
    showJantBrandingOnHome:
      resolve("SHOW_JANT_BRANDING_ON_HOME", allSettings, env) === "true",
    noindex: demoMode || resolve("NOINDEX", allSettings, env) === "true",

    // Infrastructure (ENV only)
    siteUrl,
    siteOrigin,
    sitePathPrefix,
    assetBasePath: ASSET_BASE_PATH,
    authConfigured: !!getAuthSecret(env),

    // Media (ENV only)
    storageDriver,
    r2PublicUrl,
    s3PublicUrl,
    localPublicUrl,
    imageTransformUrl,

    // Upload (ENV only)
    uploadMaxFileSize:
      parseInt(
        getEnvString(
          env,
          "JANT_UPLOAD_MAX_FILE_SIZE_MB",
          "UPLOAD_MAX_FILE_SIZE_MB",
        ) ?? "500",
        10,
      ) || 500,

    // Summary extraction (ENV only)
    summaryMaxParagraphs:
      parseInt(
        getEnvString(
          env,
          "JANT_SUMMARY_MAX_PARAGRAPHS",
          "SUMMARY_MAX_PARAGRAPHS",
        ) ?? "5",
        10,
      ) || 5,
    summaryMaxChars:
      parseInt(
        getEnvString(env, "JANT_SUMMARY_MAX_CHARS", "SUMMARY_MAX_CHARS") ??
          "500",
        10,
      ) || 500,

    // Slug (ENV only)
    slugIdLength:
      parseInt(
        getEnvString(env, "JANT_SLUG_ID_LENGTH", "SLUG_ID_LENGTH") ?? "5",
        10,
      ) || 5,

    // Pagination/Feed (ENV only)
    pageSize:
      parseInt(getEnvString(env, "JANT_PAGE_SIZE", "PAGE_SIZE") ?? "20", 10) ||
      20,
    rssFeedLimit:
      parseInt(
        getEnvString(env, "JANT_RSS_FEED_LIMIT", "RSS_FEED_LIMIT") ?? "50",
        10,
      ) || 50,

    // Demo (ENV only)
    demoEmail: getEnvString(env, "JANT_DEMO_EMAIL", "DEMO_EMAIL") || "",
    demoPassword:
      getEnvString(env, "JANT_DEMO_PASSWORD", "DEMO_PASSWORD") || "",
    demoMode,

    // Theme (DB internal)
    themeId: allSettings["THEME"] ?? "",
    defaultThemeId:
      getEnvString(env, "JANT_DEFAULT_THEME", "DEFAULT_THEME") ||
      CONFIG_FIELDS.DEFAULT_THEME.defaultValue,
    fontThemeId: allSettings["FONT_THEME"] ?? "",
    themeMode:
      allSettings["THEME_MODE"] === "light" ||
      allSettings["THEME_MODE"] === "dark"
        ? allSettings["THEME_MODE"]
        : "auto",
    customCSS: allSettings["CUSTOM_CSS"] ?? "",

    // Site appearance (DB internal)
    siteAvatar,
    showHeaderAvatar: allSettings["SHOW_HEADER_AVATAR"] === "true",
    siteAvatarUrl,
    faviconVersion: allSettings["SITE_FAVICON_VERSION"] ?? "",

    // Settings form placeholders (ENV > Default, without DB)
    fallbacks: {
      siteName: resolveFallback("SITE_NAME", env),
      siteDescription: resolveFallback("SITE_DESCRIPTION", env),
      defaultTheme: resolveFallback("DEFAULT_THEME", env),
    },
  };
}
