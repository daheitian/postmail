/**
 * Unified Configuration System
 *
 * Reads from `c.var.allSettings` (populated by middleware) instead of
 * querying the database. All functions are synchronous.
 *
 * Priority modes:
 * - User-configurable (envOnly: false): allSettings > Environment > Default
 * - Environment-only (envOnly: true): Environment > Default
 *
 * All configuration fields are defined in CONFIG_FIELDS (types.ts).
 */

import type { Context } from "hono";
import { CONFIG_FIELDS, type ConfigKey } from "../types.js";

/**
 * Get the fallback value for a config key (ENV > Default), skipping the database.
 * Used for placeholder values in forms where the DB value is shown separately.
 *
 * @param c - Hono context
 * @param key - Configuration key from CONFIG_FIELDS
 * @returns Fallback value from environment or default
 *
 * @example
 * ```typescript
 * const placeholder = getConfigFallback(c, "SITE_NAME");
 * // Returns: c.env.SITE_NAME ?? "Jant"
 * ```
 */
export function getConfigFallback(c: Context, key: ConfigKey): string {
  const field = CONFIG_FIELDS[key];
  const envValue = c.env[key as keyof typeof c.env];
  if (envValue && typeof envValue === "string") return envValue;
  return field.defaultValue;
}

/**
 * Generic configuration getter that respects priority settings.
 *
 * Reads from `c.var.allSettings` (set by middleware) — no DB query.
 *
 * @param c - Hono context
 * @param key - Configuration key from CONFIG_FIELDS
 * @returns Configuration value following the defined priority
 *
 * @example
 * ```typescript
 * // For user-configurable configs (SITE_NAME):
 * // Returns: allSettings.SITE_NAME ?? c.env.SITE_NAME ?? "Jant"
 *
 * // For environment-only configs (SITE_URL):
 * // Returns: c.env.SITE_URL ?? ""
 * ```
 */
export function getConfig(c: Context, key: ConfigKey): string {
  const field = CONFIG_FIELDS[key];

  if (!field.envOnly) {
    // User-configurable: allSettings > ENV > Default
    const dbValue = c.var.allSettings[key];
    if (dbValue) {
      return dbValue;
    }
  }

  // ENV > Default
  const envValue = c.env[key as keyof typeof c.env];
  if (envValue && typeof envValue === "string") {
    return envValue;
  }

  return field.defaultValue;
}

/**
 * Get site name with fallback chain: allSettings > ENV > Default
 *
 * @param c - Hono context
 * @returns Site name
 *
 * @example
 * ```typescript
 * const siteName = getSiteName(c);
 * ```
 */
export function getSiteName(c: Context): string {
  return getConfig(c, "SITE_NAME");
}

/**
 * Get site description with fallback chain: allSettings > ENV > Default
 *
 * @param c - Hono context
 * @returns Site description
 *
 * @example
 * ```typescript
 * const description = getSiteDescription(c);
 * ```
 */
export function getSiteDescription(c: Context): string {
  return getConfig(c, "SITE_DESCRIPTION");
}

/**
 * Get site language with fallback chain: allSettings > ENV > Default
 *
 * @param c - Hono context
 * @returns Site language code
 *
 * @example
 * ```typescript
 * const lang = getSiteLanguage(c);
 * ```
 */
export function getSiteLanguage(c: Context): string {
  return getConfig(c, "SITE_LANGUAGE");
}

/**
 * Get home default view with fallback chain: allSettings > ENV > Default
 *
 * @param c - Hono context
 * @returns Home default view ("latest" or "featured")
 *
 * @example
 * ```typescript
 * const view = getHomeDefaultView(c);
 * ```
 */
export function getHomeDefaultView(c: Context): string {
  return getConfig(c, "HOME_DEFAULT_VIEW");
}

/**
 * Get timezone with fallback chain: allSettings > ENV > Default
 *
 * @param c - Hono context
 * @returns Timezone string (e.g. "Beijing", "UTC")
 */
export function getTimeZone(c: Context): string {
  return getConfig(c, "TIME_ZONE");
}

/**
 * Get site footer markdown with fallback chain: allSettings > ENV > Default
 *
 * @param c - Hono context
 * @returns Footer markdown string (empty string if not set)
 */
export function getSiteFooter(c: Context): string {
  return getConfig(c, "SITE_FOOTER");
}

/**
 * Check if search engine indexing is disabled
 *
 * @param c - Hono context
 * @returns true if NOINDEX is set to "true"
 */
export function isNoIndex(c: Context): boolean {
  return getConfig(c, "NOINDEX") === "true";
}
