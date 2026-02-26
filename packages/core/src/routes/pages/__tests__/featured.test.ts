/**
 * Tests for the featured page data logic.
 *
 * Note: Route handler tests that import JSX components with @lingui/react/macro
 * cannot run in vitest (requires SWC plugin). These tests verify the service
 * layer operations that the featured route orchestrates.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createTestDatabase } from "../../../__tests__/helpers/db.js";
import { createPostService } from "../../../services/post.js";
import { createPathRegistryService } from "../../../services/path-registry.js";
import type { Database } from "../../../db/index.js";

describe("Featured Page - Data Logic", () => {
  let db: Database;
  let postService: ReturnType<typeof createPostService>;

  beforeEach(() => {
    const testDb = createTestDatabase();
    db = testDb.db as unknown as Database;
    postService = createPostService(db, createPathRegistryService(db));
  });

  it("returns only featured published posts", async () => {
    await postService.create({
      format: "note",
      body: "Featured post",
      visibility: "featured",
      status: "published",
    });
    await postService.create({
      format: "note",
      body: "Normal post",
      status: "published",
    });
    await postService.create({
      format: "note",
      body: "Draft featured",
      visibility: "featured",
      status: "draft",
    });

    const posts = await postService.list({
      visibility: "featured",
      status: "published",
      excludeReplies: true,
    });

    expect(posts).toHaveLength(1);
    expect(posts[0]?.body).toBe("Featured post");
  });

  it("returns empty list when no featured posts exist", async () => {
    await postService.create({
      format: "note",
      body: "Normal post",
      status: "published",
    });

    const posts = await postService.list({
      visibility: "featured",
      status: "published",
      excludeReplies: true,
    });

    expect(posts).toHaveLength(0);
  });

  it("excludes replies from featured posts", async () => {
    const root = await postService.create({
      format: "note",
      body: "Featured root",
      visibility: "featured",
      status: "published",
    });

    // Reply inherits featured from root
    await postService.create({
      format: "note",
      body: "Reply to featured",
      replyToId: root.id,
    });

    const posts = await postService.list({
      visibility: "featured",
      status: "published",
      excludeReplies: true,
    });

    expect(posts).toHaveLength(1);
    expect(posts[0]?.body).toBe("Featured root");
  });
});
