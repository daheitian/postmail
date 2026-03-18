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
  SYSTEM_NAV_KEY_VALUES,
  MAX_MEDIA_ATTACHMENTS,
} from "../types.js";
import { ValidationError } from "./errors.js";
import { isCollectionIconPalette } from "./collection-icon-palette.js";
import { normalizeSlug } from "./slug-format.js";
import { sanitizeUrl, normalizePath } from "./url.js";

// =============================================================================
// Shared Transforms
// =============================================================================

/**
 * Strip C0 control characters (except HT, LF, CR) that can break rendering
 * or interfere with FTS5 highlight sentinels (STX/ETX).
 */
// eslint-disable-next-line no-control-regex -- intentionally matching C0 control characters
const CONTROL_CHAR_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/**
 * Normalize an email address for storage and lookup.
 *
 * @param email - Raw email input
 * @returns Trimmed, lowercased email
 * @example
 * ```ts
 * normalizeEmail("  User@Example.COM ");
 * // Returns: "user@example.com"
 * ```
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Trim, strip control characters, and collapse to undefined when empty. */
function sanitizeText(maxLength: number) {
  return z
    .string()
    .trim()
    .max(maxLength)
    .transform((s) => s.replace(CONTROL_CHAR_RE, "") || undefined);
}

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
export const SystemNavKeySchema = z.enum(SYSTEM_NAV_KEY_VALUES);

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
  path: z
    .string()
    .min(1)
    .transform(normalizePath)
    .pipe(z.string().min(1))
    .optional()
    .or(z.literal("").transform(() => undefined)),
  title: sanitizeText(300)
    .optional()
    .or(z.literal("").transform(() => undefined)),
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

function hasNonEmptyText(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function refineCreatePostFormatShape<
  T extends { format: string; url?: string; quoteText?: string },
>(schema: z.ZodType<T>) {
  return schema.superRefine((data, ctx) => {
    const hasUrl = hasNonEmptyText(data.url);
    const hasQuoteText = hasNonEmptyText(data.quoteText);

    if (data.format === "note") {
      if (hasUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["url"],
          message: "Notes can't include a URL.",
        });
      }
      if (hasQuoteText) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["quoteText"],
          message: "Notes can't include quoted text.",
        });
      }
    }

    if (data.format === "link") {
      if (!hasUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["url"],
          message: "Link posts need a URL.",
        });
      }
      if (hasQuoteText) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["quoteText"],
          message: "Link posts can't include quoted text.",
        });
      }
    }

    if (data.format === "quote" && !hasQuoteText) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["quoteText"],
        message: "Quote posts need quoted text.",
      });
    }
  });
}

/** Mutual exclusivity: slug and path cannot both be provided */
function refineSlugPathExclusivity<T extends { slug?: string; path?: string }>(
  schema: z.ZodType<T>,
) {
  return schema.refine((data) => !(data.slug && data.path), {
    message: "Provide either slug or path, not both",
    path: ["path"],
  });
}

/**
 * API request body schema for creating a post
 */
export const CreatePostSchema = refineSlugPathExclusivity(
  refineCreatePostFormatShape(refineBodyExclusivity(PostFieldsSchema)),
);

/**
 * API request body schema for updating a post
 */
export const UpdatePostSchema = refineSlugPathExclusivity(
  refineBodyExclusivity(PostFieldsSchema.partial()),
);

/**
 * API request body schema for creating a navigation item
 */
export const CreateNavItemSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("link"),
    label: sanitizeText(100).pipe(z.string().min(1)),
    url: z
      .string()
      .min(1)
      .refine((val) => sanitizeUrl(val) !== "", {
        message: "URL must use http:, https:, or mailto: protocol",
      }),
  }),
  z.object({
    type: z.literal("system"),
    systemKey: SystemNavKeySchema,
  }),
]);

/**
 * API request body schema for updating a navigation item
 */
export const UpdateNavItemSchema = z.object({
  label: sanitizeText(100).pipe(z.string().min(1)).optional(),
  url: z
    .string()
    .min(1)
    .refine((val) => sanitizeUrl(val) !== "", {
      message: "URL must use http:, https:, or mailto: protocol",
    })
    .optional(),
});

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
  title: sanitizeText(300).pipe(z.string().min(1)),
  description: sanitizeText(500)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  icon: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || !val.startsWith("{")) return true;
        try {
          const parsed = JSON.parse(val) as Record<string, unknown>;
          return (
            typeof parsed.name === "string" &&
            typeof parsed.svg === "string" &&
            typeof parsed.palette === "string" &&
            isCollectionIconPalette(parsed.palette)
          );
        } catch {
          return false;
        }
      },
      {
        message:
          "Icon palette must be one of Jant's built-in collection colors",
      },
    ),
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
  path: z
    .string()
    .min(1)
    .max(512)
    .regex(
      /^\/[a-z0-9][a-z0-9\-/]*$/,
      "Path must start with / and contain only lowercase alphanumeric characters, hyphens, and slashes",
    ),
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
  email: z
    .string()
    .transform(normalizeEmail)
    .pipe(z.string().email("Invalid email address")),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
});

/**
 * Sign-in form validation schema
 */
export const SigninSchema = z.object({
  email: z
    .string()
    .transform(normalizeEmail)
    .pipe(z.string().email("Invalid email address")),
  password: z.string().min(1, "Password is required").max(128),
});

/**
 * Password reset form validation schema
 */
export const ResetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128),
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

export { normalizeSlug } from "./slug-format.js";

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
