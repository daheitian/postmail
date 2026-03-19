import type { CollectionSortOrder } from "../types.js";

/**
 * Returns true when the sort order depends on post ratings.
 *
 * @param sortOrder - Candidate sort order
 * @returns Whether the sort order is rating-based
 *
 * @example
 * ```ts
 * isRatingSortOrder("rating_desc");
 * ```
 */
export function isRatingSortOrder(
  sortOrder: CollectionSortOrder | null | undefined,
): boolean {
  return sortOrder === "rating_desc";
}

/**
 * Returns true when a collection has enough rated posts to make rating sort useful.
 *
 * @param ratedPostCount - Number of posts in the collection with a rating
 * @returns Whether rating sort should be shown to readers
 *
 * @example
 * ```ts
 * supportsCollectionRatingSort(2);
 * ```
 */
export function supportsCollectionRatingSort(ratedPostCount: number): boolean {
  return ratedPostCount > 1;
}

/**
 * Resolves the sort order for a collection page, falling back when rating
 * sorting is requested but the collection does not have enough rated posts.
 *
 * @param requestedSort - Sort order from the request query
 * @param defaultSort - Collection default sort order
 * @param supportsRatingSort - Whether rating sort should be available
 * @returns Effective sort order for the page
 *
 * @example
 * ```ts
 * resolveCollectionSortOrder(undefined, "oldest", false);
 * ```
 */
export function resolveCollectionSortOrder(
  requestedSort: CollectionSortOrder | undefined,
  defaultSort: CollectionSortOrder,
  supportsRatingSort: boolean,
): CollectionSortOrder {
  const candidate = requestedSort ?? defaultSort;

  if (supportsRatingSort || !isRatingSortOrder(candidate)) {
    return candidate;
  }

  return "newest";
}
