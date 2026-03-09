/**
 * Shared Zod schemas for validation (v2)
 *
 * These schemas ensure type-safe validation of user input
 * from forms, API requests, and other external sources.
 *
 * IMPORTANT: Types are defined in types.ts as the single source of truth.
 * This file only defines Zod validation schemas based on those types.
 */

import { z } from "zod";
import {
  FORMATS,
  STATUSES,
  VISIBILITIES,
  SORT_ORDERS,
  NAV_ITEM_TYPES,
  MAX_MEDIA_ATTACHMENTS,
} from "../types.js";
import { ValidationError } from "./errors.js";
import { sanitizeUrl } from "./url.js";

/**
 * Post format enum schema
 * Based on FORMATS from types.ts
 */
export const FormatSchema = z.enum(FORMATS);

/**
 * Post status enum schema
 * Based on STATUSES from types.ts
 */
export const StatusSchema = z.enum(STATUSES);

/**
 * Collection sort order enum schema
 */
export const SortOrderSchema = z.enum(SORT_ORDERS);

/**
 * Navigation item type enum schema
 */
export const NavItemTypeSchema = z.enum(NAV_ITEM_TYPES);

/**
 * Redirect type enum schema
 * Form input validation for redirect type (stored as number in DB)
 */
export const RedirectTypeSchema = z.enum(["301", "302"]);

/**
 * Custom URL target type enum schema
 */
export const CustomUrlTargetTypeSchema = z.enum([
  "post",
  "collection",
  "redirect",
]);

/**
 * Rating schema (1-5 integer)
 */
export const RatingSchema = z.coerce
  .number()
  .int()
  .min(0)
  .max(5)
  .optional()
  .or(z.literal("").transform(() => undefined))
  .transform((v) => (v === 0 ? undefined : v));

/**
 * Base post fields (shared between create and update schemas)
 */
const PostFieldsSchema = z.object({
  format: FormatSchema,
  slug: z
    .string()
    .min(1)
    .transform(normalizeSlug)
    .pipe(
      z
        .string()
        .min(1)
        .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/),
    )
    .optional()
    .or(z.literal("").transform(() => undefined)),
  title: z.string().optional(),
  body: z.string().optional(),
  bodyMarkdown: z.string().optional(),
  status: StatusSchema.optional(),
  visibility: z.enum(VISIBILITIES).optional(),
  pinned: z
    .union([z.boolean(), z.literal("on").transform(() => true)])
    .optional(),
  featured: z.boolean().optional(),
  url: z
    .url()
    .refine((val) => sanitizeUrl(val) !== "", {
      message: "URL must use http:, https:, or mailto: protocol",
    })
    .optional()
    .or(z.literal("")),
  quoteText: z.string().optional(),
  rating: RatingSchema,
  collectionIds: z
    .array(z.string().min(1))
    .optional()
    .or(z.literal("").transform(() => undefined)),
  replyToId: z.string().optional(),
  publishedAt: z.number().int().positive().optional(),
  mediaIds: z.array(z.string()).max(MAX_MEDIA_ATTACHMENTS).optional(),
  mediaAlts: z.record(z.string(), z.string()).optional(),
});

/** Mutual exclusivity: body and bodyMarkdown cannot both be provided */
function refineBodyExclusivity<
  T extends { body?: string; bodyMarkdown?: string },
>(schema: z.ZodType<T>) {
  return schema.refine((data) => !(data.body && data.bodyMarkdown), {
    message: "Provide either body or bodyMarkdown, not both",
    path: ["bodyMarkdown"],
  });
}

/**
 * API request body schema for creating a post
 */
export const CreatePostSchema = refineBodyExclusivity(PostFieldsSchema);

/**
 * API request body schema for updating a post
 */
export const UpdatePostSchema = refineBodyExclusivity(
  PostFieldsSchema.partial(),
);

/**
 * API request body schema for creating a navigation item
 */
export const CreateNavItemSchema = z.object({
  type: NavItemTypeSchema,
  label: z.string().min(1),
  url: z
    .string()
    .min(1)
    .refine((val) => sanitizeUrl(val) !== "", {
      message: "URL must use http:, https:, or mailto: protocol",
    }),
});

/**
 * API request body schema for updating a navigation item
 */
export const UpdateNavItemSchema = CreateNavItemSchema.partial();

/**
 * API request body schema for creating a collection
 */
export const CreateCollectionSchema = z.object({
  slug: z
    .string()
    .min(1)
    .transform(normalizeSlug)
    .pipe(
      z
        .string()
        .min(1)
        .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/),
    ),
  title: z.string().min(1),
  description: z.string().optional(),
  icon: z.string().optional(),
  sortOrder: SortOrderSchema.optional(),
});

/**
 * API request body schema for updating a collection
 */
export const UpdateCollectionSchema = CreateCollectionSchema.partial();

/**
 * API request body schema for creating a custom URL
 */
export const CreateCustomUrlSchema = z.object({
  path: z.string().min(1),
  targetType: CustomUrlTargetTypeSchema,
  targetId: z.string().optional(),
  toPath: z.string().optional(),
  redirectType: RedirectTypeSchema.optional(),
});

// =============================================================================
// Auth Schemas
// =============================================================================

/**
 * Setup form validation schema
 */
export const SetupSchema = z.object({
  siteName: z.string().min(1, "Site name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

/**
 * Sign-in form validation schema
 */
export const SigninSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

/**
 * Password reset form validation schema
 */
export const ResetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1),
    token: z.string().min(1),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// =============================================================================
// Slug Normalization
// =============================================================================

/**
 * Normalize a string into a valid slug format.
 * Lowercases, replaces non-alphanumeric characters with dashes,
 * collapses consecutive dashes, and trims leading/trailing dashes.
 *
 * @param s - Raw input string
 * @returns Normalized slug
 * @example
 * ```ts
 * normalizeSlug("My Cool Page!") // "my-cool-page"
 * normalizeSlug("  hello  world  ") // "hello-world"
 * ```
 */
export function normalizeSlug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

// =============================================================================
// Form Data Helpers
// =============================================================================

/**
 * Form data helper: safely parse a FormData value with a schema
 *
 * @example
 * ```ts
 * const format = parseFormData(formData, "format", FormatSchema);
 * // format is Format, throws if invalid
 * ```
 */
export function parseFormData<T>(
  formData: FormData,
  key: string,
  schema: z.ZodSchema<T>,
): T {
  const value = formData.get(key);
  if (value === null) {
    throw new ValidationError(`Missing required field: ${key}`);
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
 * Validates media attachment count for a post.
 * All formats allow 0-20 media attachments.
 *
 * @param mediaIds - Array of media IDs to attach
 * @returns null if valid, error string if invalid
 */
export function validateMediaCount(mediaIds: string[]): string | null {
  if (mediaIds.length > MAX_MEDIA_ATTACHMENTS) {
    return `Posts allow at most ${MAX_MEDIA_ATTACHMENTS} media attachments`;
  }
  return null;
}

/**
 * Parse and validate data against a Zod schema, throwing ValidationError on failure.
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validated data
 * @example
 * ```ts
 * const body = parseValidated(CreatePostSchema, await c.req.json());
 * ```
 */
export function parseValidated<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const firstMessage = result.error.issues[0]?.message ?? "Validation failed";
    throw new ValidationError(firstMessage, result.error.flatten());
  }
  return result.data;
}
