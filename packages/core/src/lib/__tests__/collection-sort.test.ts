import { describe, expect, it } from "vitest";
import {
  isRatingSortOrder,
  resolveCollectionSortOrder,
  supportsCollectionRatingSort,
} from "../collection-sort.js";

describe("isRatingSortOrder", () => {
  it("returns true for rating-based sort orders", () => {
    expect(isRatingSortOrder("rating_desc")).toBe(true);
    expect(isRatingSortOrder("rating_asc")).toBe(true);
  });

  it("returns false for time-based sort orders", () => {
    expect(isRatingSortOrder("newest")).toBe(false);
    expect(isRatingSortOrder("oldest")).toBe(false);
  });
});

describe("supportsCollectionRatingSort", () => {
  it("requires at least two rated posts", () => {
    expect(supportsCollectionRatingSort(0)).toBe(false);
    expect(supportsCollectionRatingSort(1)).toBe(false);
    expect(supportsCollectionRatingSort(2)).toBe(true);
  });
});

describe("resolveCollectionSortOrder", () => {
  it("uses the collection default when no query override exists", () => {
    expect(resolveCollectionSortOrder(undefined, "oldest", false)).toBe(
      "oldest",
    );
  });

  it("keeps rating sort when the collection supports it", () => {
    expect(resolveCollectionSortOrder("rating_desc", "newest", true)).toBe(
      "rating_desc",
    );
  });

  it("falls back to newest when rating sort is unavailable", () => {
    expect(resolveCollectionSortOrder("rating_asc", "oldest", false)).toBe(
      "newest",
    );
    expect(resolveCollectionSortOrder(undefined, "rating_desc", false)).toBe(
      "newest",
    );
  });
});
