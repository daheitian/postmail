/**
 * Unified Configuration System
 *
 * Provides a flexible configuration system with two priority modes:
 * - User-configurable (envOnly: false): Database > Environment > Default
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
 * Generic configuration getter that respects priority settings
 *
 * @param c - Hono context
 * @param key - Configuration key from CONFIG_FIELDS
 * @returns Configuration value following the defined priority
 *
 * @example
 * ```typescript
 * // For user-configurable configs (SITE_NAME):
 * // Returns: (DB: SITE_NAME) ?? c.env.SITE_NAME ?? "Jant"
 *
 * // For environment-only configs (SITE_URL):
 * // Returns: c.env.SITE_URL ?? ""
 * ```
 */
export async function getConfig(c: Context, key: ConfigKey): Promise<string> {
  const field = CONFIG_FIELDS[key];

  if (!field.envOnly) {
    // User-configurable: DB > ENV > Default
    // 1. Check database setting first
    const dbValue = await c.var.services.settings.get(key);
    if (dbValue) {
      return dbValue;
    }
  }

  // ENV > Default
  // 2. Check environment variable
  const envValue = c.env[key as keyof typeof c.env];
  if (envValue && typeof envValue === "string") {
    return envValue;
  }

  // 3. Default value
  return field.defaultValue;
}

/**
 * Get site name with fallback chain: DB > ENV > Default
 *
 * @param c - Hono context
 * @returns Site name
 *
 * @example
 * ```typescript
 * const siteName = await getSiteName(c);
 * // Returns: (DB: SITE_NAME) ?? c.env.SITE_NAME ?? "Jant"
 * ```
 */
export async function getSiteName(c: Context): Promise<string> {
  return getConfig(c, "SITE_NAME");
}

/**
 * Get site description with fallback chain: DB > ENV > Default
 *
 * @param c - Hono context
 * @returns Site description
 *
 * @example
 * ```typescript
 * const description = await getSiteDescription(c);
 * // Returns: (DB: SITE_DESCRIPTION) ?? c.env.SITE_DESCRIPTION ?? "A microblog powered by Jant"
 * ```
 */
export async function getSiteDescription(c: Context): Promise<string> {
  return getConfig(c, "SITE_DESCRIPTION");
}

/**
 * Get site language with fallback chain: DB > ENV > Default
 *
 * @param c - Hono context
 * @returns Site language code
 *
 * @example
 * ```typescript
 * const lang = await getSiteLanguage(c);
 * // Returns: (DB: SITE_LANGUAGE) ?? c.env.SITE_LANGUAGE ?? "en"
 * ```
 */
export async function getSiteLanguage(c: Context): Promise<string> {
  return getConfig(c, "SITE_LANGUAGE");
}
