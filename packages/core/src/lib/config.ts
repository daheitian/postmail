/**
 * Unified Configuration Helpers
 *
 * Configuration priority: Environment Variables > Database > Default Values
 *
 * This follows the 12-factor app methodology where configuration is stored
 * in environment variables, while allowing runtime overrides via database.
 */

import type { Context } from "hono";

/**
 * Get site name with fallback chain: ENV > DB > Default
 *
 * @param c - Hono context
 * @returns Site name
 *
 * @example
 * ```typescript
 * const siteName = await getSiteName(c);
 * // Returns: c.env.SITE_NAME ?? (DB: SITE_NAME) ?? "Jant"
 * ```
 */
export async function getSiteName(c: Context): Promise<string> {
  // 1. Check environment variable
  if (c.env.SITE_NAME) {
    return c.env.SITE_NAME;
  }

  // 2. Check database setting
  const dbValue = await c.var.services.settings.get("SITE_NAME");
  if (dbValue) {
    return dbValue;
  }

  // 3. Default value
  return "Jant";
}

/**
 * Get site description with fallback chain: ENV > DB > Default
 *
 * @param c - Hono context
 * @returns Site description
 *
 * @example
 * ```typescript
 * const description = await getSiteDescription(c);
 * // Returns: c.env.SITE_DESCRIPTION ?? (DB: SITE_DESCRIPTION) ?? "A microblog powered by Jant"
 * ```
 */
export async function getSiteDescription(c: Context): Promise<string> {
  // 1. Check environment variable
  if (c.env.SITE_DESCRIPTION) {
    return c.env.SITE_DESCRIPTION;
  }

  // 2. Check database setting
  const dbValue = await c.var.services.settings.get("SITE_DESCRIPTION");
  if (dbValue) {
    return dbValue;
  }

  // 3. Default value
  return "A microblog powered by Jant";
}

/**
 * Get site language with fallback chain: ENV > DB > Default
 *
 * @param c - Hono context
 * @returns Site language code
 *
 * @example
 * ```typescript
 * const lang = await getSiteLanguage(c);
 * // Returns: c.env.SITE_LANGUAGE ?? (DB: SITE_LANGUAGE) ?? "en"
 * ```
 */
export async function getSiteLanguage(c: Context): Promise<string> {
  // 1. Check environment variable
  if (c.env.SITE_LANGUAGE) {
    return c.env.SITE_LANGUAGE;
  }

  // 2. Check database setting
  const dbValue = await c.var.services.settings.get("SITE_LANGUAGE");
  if (dbValue) {
    return dbValue;
  }

  // 3. Default value
  return "en";
}
