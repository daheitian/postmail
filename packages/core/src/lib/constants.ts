/**
 * Application Constants
 */

/**
 * Reserved URL paths that cannot be used for pages
 */
export const RESERVED_PATHS = [
  "featured",
  "latest",
  "collections",
  "signin",
  "signout",
  "setup",
  "settings",
  "posts",
  "dash",
  "api",
  "feed",
  "search",
  "archive",
  "media",
  "pages",
  "reset",
  "c",
  "compose",
  "static",
  "assets",
  "_assets",
  "health",
] as const;

export type ReservedPath = (typeof RESERVED_PATHS)[number];

/**
 * Reserved collection slugs within the `/c/*` namespace.
 *
 * These values are valid top-level paths elsewhere but are unavailable as
 * collection slugs because they collide with dedicated collection routes.
 */
export const RESERVED_COLLECTION_SLUGS = ["new"] as const;

export type ReservedCollectionSlug = (typeof RESERVED_COLLECTION_SLUGS)[number];

/**
 * Check if a path is reserved
 */
export function isReservedPath(path: string): boolean {
  const firstSegment = path.split("/")[0]?.toLowerCase();
  return RESERVED_PATHS.includes(firstSegment as ReservedPath);
}

/**
 * Check if a collection slug is reserved within the collection namespace.
 */
export function isReservedCollectionSlug(slug: string): boolean {
  const normalized = slug.trim().toLowerCase();
  return RESERVED_COLLECTION_SLUGS.includes(
    normalized as ReservedCollectionSlug,
  );
}

/**
 * Settings keys - derived from CONFIG_FIELDS (Single Source of Truth)
 *
 * Only non-envOnly fields and internal fields are stored in DB settings.
 * Environment-only fields (SITE_ORIGIN, SITE_PATH_PREFIX, AUTH_SECRET, etc.)
 * are never in the DB.
 */
import { CONFIG_FIELDS, type ConfigKey } from "../types.js";

type SettingsFieldKey = {
  [K in ConfigKey]: (typeof CONFIG_FIELDS)[K] extends { envOnly: false }
    ? K
    : never;
}[ConfigKey];

export const SETTINGS_KEYS = Object.fromEntries(
  Object.entries(CONFIG_FIELDS)
    .filter(([, field]) => !field.envOnly || "internal" in field)
    .map(([key]) => [key, key]),
) as { [K in SettingsFieldKey]: K };

export type SettingsKey = SettingsFieldKey;

/**
 * Onboarding status values
 */
export const ONBOARDING_STATUS = {
  PENDING: "pending",
  COMPLETED: "completed",
} as const;

export type OnboardingStatus =
  (typeof ONBOARDING_STATUS)[keyof typeof ONBOARDING_STATUS];
