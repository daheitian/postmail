/**
 * Shared Zod schemas for validation
 *
 * These schemas ensure type-safe validation of user input
 * from forms, API requests, and other external sources.
 *
 * IMPORTANT: Types are defined in types.ts as the single source of truth.
 * This file only defines Zod validation schemas based on those types.
 */

import { z } from "zod";
import {
  POST_TYPES,
  VISIBILITY_LEVELS,
  MAX_MEDIA_ATTACHMENTS,
  POST_TYPE_MEDIA_RULES,
} from "../types.js";
import type { PostType } from "../types.js";

/**
 * Post type enum schema
 * Based on POST_TYPES from types.ts
 */
export const PostTypeSchema = z.enum(POST_TYPES);

/**
 * Visibility enum schema
 * Based on VISIBILITY_LEVELS from types.ts
 */
export const VisibilitySchema = z.enum(VISIBILITY_LEVELS);

/**
 * Redirect type enum schema
 * Form input validation for redirect type (stored as number in DB)
 */
export const RedirectTypeSchema = z.enum(["301", "302"]);

/**
 * API request body schema for creating a post
 */
export const CreatePostSchema = z.object({
  type: PostTypeSchema,
  title: z.string().optional(),
  content: z.string(),
  visibility: VisibilitySchema,
  sourceUrl: z.url().optional().or(z.literal("")),
  sourceName: z.string().optional(),
  path: z
    .string()
    .regex(/^[a-z0-9-]*$/)
    .optional()
    .or(z.literal("")),
  replyToId: z.string().optional(), // Sqid format
  publishedAt: z.number().int().positive().optional(),
  mediaIds: z.array(z.string()).max(MAX_MEDIA_ATTACHMENTS).optional(),
});

/**
 * API request body schema for updating a post
 */
export const UpdatePostSchema = CreatePostSchema.partial();

/**
 * Form data helper: safely parse a FormData value with a schema
 *
 * @example
 * ```ts
 * const type = parseFormData(formData, "type", PostTypeSchema);
 * // type is PostType, throws if invalid
 * ```
 */
export function parseFormData<T>(
  formData: FormData,
  key: string,
  schema: z.ZodSchema<T>,
): T {
  const value = formData.get(key);
  if (value === null) {
    throw new Error(`Missing required field: ${key}`);
  }
  return schema.parse(value);
}

/**
 * Form data helper: safely parse optional FormData value with a schema
 *
 * @example
 * ```ts
 * const slug = parseFormDataOptional(formData, "slug", z.string());
 * // slug is string | undefined
 * ```
 */
export function parseFormDataOptional<T>(
  formData: FormData,
  key: string,
  schema: z.ZodSchema<T>,
): T | undefined {
  const value = formData.get(key);
  if (value === null || value === "") {
    return undefined;
  }
  return schema.parse(value);
}

/**
 * Validates media attachment count against post type rules.
 *
 * @param type - The post type to validate against
 * @param mediaIds - Array of media IDs to attach
 * @returns null if valid, error string if invalid
 *
 * @example
 * ```ts
 * const error = validateMediaForPostType("image", []);
 * // Returns: "image posts require at least 1 media attachment"
 * ```
 */
export function validateMediaForPostType(
  type: PostType,
  mediaIds: string[],
): string | null {
  const rules = POST_TYPE_MEDIA_RULES[type];

  if (rules === null) {
    if (mediaIds.length > 0) {
      return `${type} posts do not allow media attachments`;
    }
    return null;
  }

  const [min, max] = rules;

  if (mediaIds.length < min) {
    return `${type} posts require at least ${min} media attachment${min !== 1 ? "s" : ""}`;
  }

  if (mediaIds.length > max) {
    return `${type} posts allow at most ${max} media attachment${max !== 1 ? "s" : ""}`;
  }

  return null;
}
