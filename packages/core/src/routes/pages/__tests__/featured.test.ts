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
import type { Database } from "../../../db/index.js";

describe("Featured Page - Data Logic", () => {
  let db: Database;
  let postService: ReturnType<typeof createPostService>;

  beforeEach(() => {
    const testDb = createTestDatabase();
    db = testDb.db as unknown as Database;
    postService = createPostService(db, { slugIdLength: 5 });
  });

  it("returns only featured published posts", async () => {
    await postService.create({
      format: "note",
      bodyMarkdown: "Featured post",
      featured: true,
      status: "published",
    });
    await postService.create({
      format: "note",
      bodyMarkdown: "Normal post",
      status: "published",
    });
    await postService.create({
      format: "note",
      bodyMarkdown: "Draft featured",
      featured: true,
      status: "draft",
    });

    const posts = await postService.list({
      featured: true,
      status: "published",
    });

    expect(posts).toHaveLength(1);
    expect(posts[0]?.bodyText).toBe("Featured post");
  });

  it("returns empty list when no featured posts exist", async () => {
    await postService.create({
      format: "note",
      bodyMarkdown: "Normal post",
      status: "published",
    });

    const posts = await postService.list({
      featured: true,
      status: "published",
    });

    expect(posts).toHaveLength(0);
  });

  it("includes featured reply posts", async () => {
    const root = await postService.create({
      format: "note",
      bodyMarkdown: "Root post",
      status: "published",
    });

    // Create a reply and feature it independently
    const reply = await postService.create({
      format: "note",
      bodyMarkdown: "Reply to root",
      replyToId: root.id,
    });
    await postService.update(reply.id, { featured: true });

    const posts = await postService.list({
      featured: true,
      status: "published",
    });

    expect(posts).toHaveLength(1);
    expect(posts[0]?.bodyText).toBe("Reply to root");
  });

  it("featured root and featured reply both appear", async () => {
    const root = await postService.create({
      format: "note",
      bodyMarkdown: "Featured root",
      featured: true,
      status: "published",
    });

    const reply = await postService.create({
      format: "note",
      bodyMarkdown: "Featured reply",
      replyToId: root.id,
    });
    await postService.update(reply.id, { featured: true });

    const posts = await postService.list({
      featured: true,
      status: "published",
    });

    expect(posts).toHaveLength(2);
  });
});
