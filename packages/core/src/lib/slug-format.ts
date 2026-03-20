/**
 * Shared slug formatting helpers.
 *
 * These utilities are safe to use on both the client and server so slug input
 * behavior stays aligned across compose, collection forms, and request
 * validation.
 */

import { isReservedPath } from "./constants.js";

/** Slugs use lowercase ASCII letters, numbers, and single hyphen separators. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type SlugValidationIssue = "invalid" | "reserved" | "too_long";

interface SlugValidationOptions {
  maxLength?: number;
}

/**
 * Normalize a string into a valid slug format.
 * Lowercases, replaces non-alphanumeric characters with dashes,
 * collapses consecutive dashes, and trims leading/trailing dashes.
 *
 * @param value - Raw input string
 * @returns Normalized slug
 *
 * @example
 * ```ts
 * normalizeSlug("My Cool Page!"); // "my-cool-page"
 * normalizeSlug("  hello  world  "); // "hello-world"
 * ```
 */
export function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Clamp a slug to a maximum length without leaving dangling separators.
 *
 * @param value - Raw slug value
 * @param maxLength - Maximum allowed slug length
 * @returns Normalized slug trimmed to the requested limit
 */
export function truncateSlug(value: string, maxLength: number): string {
  return normalizeSlug(value.slice(0, maxLength));
}

/**
 * Validate an optional slug string entered by the user.
 *
 * Empty values are treated as valid because a slug can be auto-generated.
 *
 * @param value - Raw slug input
 * @returns Validation issue code, or `null` when valid
 */
export function getSlugValidationIssue(
  value: string,
  options: SlugValidationOptions = {},
): SlugValidationIssue | null {
  const slug = value.trim();
  if (!slug) return null;
  if (options.maxLength && slug.length > options.maxLength) return "too_long";
  if (!SLUG_PATTERN.test(slug)) return "invalid";
  if (isReservedPath(slug)) return "reserved";
  return null;
}

/**
 * Check whether an optional slug is valid.
 *
 * @param value - Raw slug input
 * @returns `true` when the slug is empty or valid
 */
export function isValidSlug(
  value: string,
  options: SlugValidationOptions = {},
): boolean {
  return getSlugValidationIssue(value, options) === null;
}
