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
import { getPublicUrlForProvider, getMediaUrl } from "./image.js";

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

  // User-configurable: DB > ENV > Default
  if (!field.envOnly) {
    const dbValue = allSettings[key];
    if (dbValue) return dbValue;
  }

  // ENV > Default
  const envValue = env[key as keyof Bindings];
  if (envValue && typeof envValue === "string") return envValue;

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

  const envValue = env[key as keyof Bindings];
  if (envValue && typeof envValue === "string") return envValue;

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
  const storageDriver = env.STORAGE_DRIVER || "r2";
  const r2PublicUrl = env.R2_PUBLIC_URL || "";
  const s3PublicUrl = env.S3_PUBLIC_URL || "";
  const imageTransformUrl = env.IMAGE_TRANSFORM_URL || "";

  // Resolve avatar URL from storage key
  const siteAvatar = allSettings["SITE_AVATAR"] ?? "";
  let siteAvatarUrl = "";
  if (siteAvatar) {
    const publicUrl = getPublicUrlForProvider(
      storageDriver,
      r2PublicUrl,
      s3PublicUrl,
    );
    siteAvatarUrl = getMediaUrl(siteAvatar, publicUrl);
  }

  // Description is "explicit" when set in DB or ENV (not just the default)
  const dbDescription = allSettings["SITE_DESCRIPTION"];
  const envDescription = env.SITE_DESCRIPTION;
  const siteDescriptionExplicit = !!(
    dbDescription ||
    (typeof envDescription === "string" && envDescription)
  );

  return {
    // Site identity (DB > ENV > Default)
    siteName: resolve("SITE_NAME", allSettings, env),
    siteDescription: resolve("SITE_DESCRIPTION", allSettings, env),
    siteDescriptionExplicit,
    siteLanguage: resolve("SITE_LANGUAGE", allSettings, env),
    homeDefaultView: resolve("HOME_DEFAULT_VIEW", allSettings, env),
    headerNavMaxVisible: (() => {
      const parsed = parseInt(
        resolve("HEADER_NAV_MAX_VISIBLE", allSettings, env),
        10,
      );
      return Math.max(0, Math.min(5, isNaN(parsed) ? 2 : parsed));
    })(),
    timeZone: resolve("TIME_ZONE", allSettings, env),
    siteFooter: resolve("SITE_FOOTER", allSettings, env),
    noindex: resolve("NOINDEX", allSettings, env) === "true",

    // Infrastructure (ENV only)
    siteUrl: env.SITE_URL || "",
    authConfigured: !!env.AUTH_SECRET,

    // Media (ENV only)
    storageDriver,
    r2PublicUrl,
    s3PublicUrl,
    imageTransformUrl,

    // Upload (ENV only)
    uploadMaxFileSize: parseInt(env.UPLOAD_MAX_FILE_SIZE ?? "500", 10) || 500,

    // Summary extraction (ENV only)
    summaryMaxParagraphs: parseInt(env.SUMMARY_MAX_PARAGRAPHS ?? "5", 10) || 5,
    summaryMaxChars: parseInt(env.SUMMARY_MAX_CHARS ?? "500", 10) || 500,

    // Pagination/Feed (ENV only)
    pageSize: parseInt(env.PAGE_SIZE ?? "20", 10) || 20,
    rssFeedLimit: parseInt(env.RSS_FEED_LIMIT ?? "50", 10) || 50,

    // Demo (ENV only)
    demoEmail: env.DEMO_EMAIL || "",
    demoPassword: env.DEMO_PASSWORD || "",

    // Theme (DB internal)
    themeId: allSettings["THEME"] ?? "",
    defaultThemeId:
      env.DEFAULT_THEME || CONFIG_FIELDS.DEFAULT_THEME.defaultValue,
    fontThemeId: allSettings["FONT_THEME"] ?? "",
    customCSS: allSettings["CUSTOM_CSS"] ?? "",

    // Site appearance (DB internal)
    siteAvatar,
    showHeaderAvatar: allSettings["SHOW_HEADER_AVATAR"] === "true",
    siteAvatarUrl,
    faviconVersion: allSettings["SITE_FAVICON_VERSION"] ?? "",

    // Dashboard form placeholders (ENV > Default, without DB)
    fallbacks: {
      siteName: resolveFallback("SITE_NAME", env),
      siteDescription: resolveFallback("SITE_DESCRIPTION", env),
      defaultTheme: resolveFallback("DEFAULT_THEME", env),
    },
  };
}
