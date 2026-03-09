/**
 * Tests for the collections listing page data logic.
 *
 * Note: Route handler tests that import JSX components with @lingui/react/macro
 * cannot run in vitest (requires SWC plugin). These tests verify the service
 * layer operations that the collections route orchestrates.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createTestDatabase } from "../../../__tests__/helpers/db.js";
import { createCollectionService } from "../../../services/collection.js";
import { createPostService } from "../../../services/post.js";
import type { Database } from "../../../db/index.js";

describe("Collections Listing Page - Data Logic", () => {
  let db: Database;
  let collectionService: ReturnType<typeof createCollectionService>;
  let postService: ReturnType<typeof createPostService>;

  beforeEach(() => {
    const testDb = createTestDatabase();
    db = testDb.db as unknown as Database;
    collectionService = createCollectionService(db);
    postService = createPostService(db, { slugIdLength: 5 });
  });

  it("returns collections with post counts", async () => {
    const recipes = await collectionService.create({
      slug: "recipes",
      title: "Recipes",
    });
    await collectionService.create({
      slug: "travel",
      title: "Travel",
    });

    // Add posts to recipes collection via junction table
    const p1 = await postService.create({
      format: "note",
      bodyMarkdown: "Recipe 1",
    });
    const p2 = await postService.create({
      format: "note",
      bodyMarkdown: "Recipe 2",
    });
    await collectionService.addPost(recipes.id, p1.id);
    await collectionService.addPost(recipes.id, p2.id);

    // Simulate route handler logic
    const [allCollections, postCounts] = await Promise.all([
      collectionService.list(),
      collectionService.getPostCounts(),
    ]);

    const collections = allCollections.map((col) => ({
      ...col,
      postCount: postCounts.get(col.id) ?? 0,
    }));

    expect(collections).toHaveLength(2);
    const recipesResult = collections.find((c) => c.slug === "recipes");
    const travelResult = collections.find((c) => c.slug === "travel");
    expect(recipesResult?.postCount).toBe(2);
    expect(travelResult?.postCount).toBe(0);
  });

  it("returns empty list when no collections exist", async () => {
    const allCollections = await collectionService.list();
    expect(allCollections).toHaveLength(0);
  });

  it("does not count soft-deleted posts", async () => {
    const col = await collectionService.create({
      slug: "test",
      title: "Test",
    });

    const post = await postService.create({
      format: "note",
      bodyMarkdown: "Will be deleted",
    });
    const post2 = await postService.create({
      format: "note",
      bodyMarkdown: "Will remain",
    });

    await collectionService.addPost(col.id, post.id);
    await collectionService.addPost(col.id, post2.id);

    await postService.delete(post.id);

    const postCounts = await collectionService.getPostCounts();
    expect(postCounts.get(col.id)).toBe(1);
  });
});
