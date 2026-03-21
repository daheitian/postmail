/**
 * Slug Generation
 *
 * Generates URL slugs for posts with conflict resolution.
 * Handles three cases: user-provided slug, title-based slug, and random-only slug.
 */

import { slugify } from "./url.js";
import { generateRandomId } from "./nanoid.js";
import { isReservedPath } from "./constants.js";
import { ValidationError, ConflictError } from "./errors.js";

const MAX_RETRIES = 10;

export interface SlugOptions {
  /** User-provided slug (takes priority) */
  slug?: string;
  /** Post title (used for slug generation if no explicit slug) */
  title?: string;
  /** Length of random IDs */
  idLength: number;
  /** Callback to check if a slug is available (checks post slugs + path_registry paths) */
  isAvailable: (slug: string) => Promise<boolean>;
}

/**
 * Generates a post slug with conflict resolution.
 *
 * Resolution order:
 * 1. User-provided slug → validate format, check reserved, check availability
 * 2. Title exists → slugify(title), append -{randomId} if conflict
 * 3. No title → pure random ID
 *
 * @param opts - Slug generation options
 * @returns A unique, valid slug
 *
 * @example
 * ```ts
 * // User-provided
 * await generatePostSlug({ slug: "my-post", idLength: 5, isAvailable: check });
 *
 * // Title-based
 * await generatePostSlug({ title: "Hello World", idLength: 5, isAvailable: check });
 *
 * // Random
 * await generatePostSlug({ idLength: 5, isAvailable: check });
 * ```
 */
export async function generatePostSlug(opts: SlugOptions): Promise<string> {
  const { slug, title, idLength, isAvailable } = opts;

  // Case 1: User-provided slug
  if (slug) {
    if (isReservedPath(slug)) {
      throw new ValidationError(
        `Slug "${slug}" is reserved and cannot be used`,
      );
    }
    const available = await isAvailable(slug);
    if (!available) {
      throw new ConflictError(`Slug "${slug}" is already in use`);
    }
    return slug;
  }

  // Case 2: Title-based slug
  if (title) {
    const base = slugify(title);
    if (base && !isReservedPath(base)) {
      const available = await isAvailable(base);
      if (available) return base;
    }

    // Append random suffix on conflict or reserved base
    for (let i = 0; i < MAX_RETRIES; i++) {
      const candidate = `${base || generateRandomId(idLength)}-${generateRandomId(idLength)}`;
      if (!isReservedPath(candidate) && (await isAvailable(candidate))) {
        return candidate;
      }
    }
    throw new ConflictError(
      "Could not generate a unique slug after multiple attempts",
    );
  }

  // Case 3: Pure random
  for (let i = 0; i < MAX_RETRIES; i++) {
    const candidate = generateRandomId(idLength);
    if (!isReservedPath(candidate) && (await isAvailable(candidate))) {
      return candidate;
    }
  }
  throw new ConflictError(
    "Could not generate a unique slug after multiple attempts",
  );
}
