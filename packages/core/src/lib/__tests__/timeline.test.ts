/**
 * Timeline Data Assembly Tests
 *
 * Tests the timeline data assembly logic via the service layer.
 * The actual route handler renders JSX components which require the Lingui SWC
 * plugin (not available in vitest). We test the underlying service operations
 * that power the timeline instead.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createTestDatabase } from "../../__tests__/helpers/db.js";
import { createPostService } from "../../services/post.js";
import { createMediaService } from "../../services/media.js";
import { createPathRegistryService } from "../../services/path-registry.js";
import { buildMediaMap } from "../media-helpers.js";
import type { Database } from "../../db/index.js";
import type { PostWithMedia } from "../../types.js";

describe("Timeline data assembly", () => {
  let db: Database;
  let postService: ReturnType<typeof createPostService>;
  let mediaService: ReturnType<typeof createMediaService>;

  beforeEach(() => {
    const testDb = createTestDatabase();
    db = testDb.db as unknown as Database;
    postService = createPostService(db, createPathRegistryService(db));
    mediaService = createMediaService(db);
  });

  it("assembles timeline items with media attachments", async () => {
    const post = await postService.create({
      format: "note",
      body: "Hello",
    });

    const posts = await postService.list({
      status: "published",
      excludeReplies: true,
      limit: 21,
    });

    expect(posts).toHaveLength(1);
    expect(posts[0]?.id).toBe(post.id);

    // Build media map
    const postIds = posts.map((p) => p.id);
    const rawMediaMap = await mediaService.getByPostIds(postIds);
    const mediaMap = buildMediaMap(rawMediaMap);

    // Assemble items
    const items = posts.map((p) => ({
      post: { ...p, mediaAttachments: mediaMap.get(p.id) ?? [] },
    }));

    expect(items).toHaveLength(1);
    expect(items[0]?.post.mediaAttachments).toEqual([]);
  });

  it("identifies thread roots and builds thread previews", async () => {
    const root = await postService.create({
      format: "note",
      body: "Thread root",
    });
    await postService.create({
      format: "note",
      body: "Reply 1",
      replyToId: root.id,
    });
    await postService.create({
      format: "note",
      body: "Reply 2",
      replyToId: root.id,
    });

    const posts = await postService.list({
      status: "published",
      excludeReplies: true,
      limit: 21,
    });

    expect(posts).toHaveLength(1);

    const postIds = posts.map((p) => p.id);
    const replyCounts = await postService.getReplyCounts(postIds);
    const threadRootIds = postIds.filter(
      (id) => (replyCounts.get(id) ?? 0) > 0,
    );

    expect(threadRootIds).toEqual([root.id]);
    expect(replyCounts.get(root.id)).toBe(2);

    const threadPreviews = await postService.getThreadPreviews(threadRootIds);
    const replies = threadPreviews.get(root.id);
    expect(replies).toHaveLength(2);
    expect(replies?.[0]?.body).toBe("Reply 1");

    // Assemble items
    const rawMediaMap = await mediaService.getByPostIds(postIds);
    const mediaMap = buildMediaMap(rawMediaMap);

    const items = posts.map((post) => {
      const postWithMedia: PostWithMedia = {
        ...post,
        mediaAttachments: mediaMap.get(post.id) ?? [],
      };

      const replyCount = replyCounts.get(post.id) ?? 0;
      const previewReplies = threadPreviews.get(post.id);

      if (replyCount > 0 && previewReplies) {
        return {
          post: postWithMedia,
          threadPreview: {
            replies: previewReplies.map((r) => ({
              ...r,
              mediaAttachments: [],
            })),
            totalReplyCount: replyCount,
          },
        };
      }

      return { post: postWithMedia };
    });

    expect(items).toHaveLength(1);
    expect(items[0]?.threadPreview).toBeDefined();
    expect(items[0]?.threadPreview?.replies).toHaveLength(2);
    expect(items[0]?.threadPreview?.totalReplyCount).toBe(2);
  });

  it("excludes replies from top-level list", async () => {
    const root = await postService.create({
      format: "note",
      body: "Root",
    });
    await postService.create({
      format: "note",
      body: "Reply",
      replyToId: root.id,
    });

    const posts = await postService.list({
      status: "published",
      excludeReplies: true,
      limit: 21,
    });

    expect(posts).toHaveLength(1);
    expect(posts[0]?.body).toBe("Root");
  });

  it("supports cursor pagination for load more", async () => {
    const posts = [];
    for (let i = 0; i < 5; i++) {
      posts.push(
        await postService.create({
          format: "note",
          body: `Post ${i}`,
          publishedAt: 1000 + i,
        }),
      );
    }

    // First page
    const page1 = await postService.list({
      status: "published",
      excludeReplies: true,
      limit: 3,
    });
    expect(page1).toHaveLength(3);

    // Second page using cursor
    const lastPost = page1[page1.length - 1];
    expect(lastPost).toBeDefined();
    const page2 = await postService.list({
      status: "published",
      excludeReplies: true,
      limit: 3,
      cursor: lastPost?.id,
    });
    expect(page2).toHaveLength(2);
    expect(page2.every((p) => p.id < (lastPost?.id ?? 0))).toBe(true);
  });

  it("supports offset-based pagination for page navigation", async () => {
    for (let i = 0; i < 5; i++) {
      await postService.create({
        format: "note",
        body: `Post ${i}`,
        publishedAt: 1000 + i,
      });
    }

    const pageSize = 2;

    // Page 1
    const page1 = await postService.list({
      status: "published",
      excludeReplies: true,
      limit: pageSize,
      offset: 0,
    });
    expect(page1).toHaveLength(2);
    expect(page1[0]?.body).toBe("Post 4");
    expect(page1[1]?.body).toBe("Post 3");

    // Page 2
    const page2 = await postService.list({
      status: "published",
      excludeReplies: true,
      limit: pageSize,
      offset: 2,
    });
    expect(page2).toHaveLength(2);
    expect(page2[0]?.body).toBe("Post 2");
    expect(page2[1]?.body).toBe("Post 1");

    // Page 3 (partial)
    const page3 = await postService.list({
      status: "published",
      excludeReplies: true,
      limit: pageSize,
      offset: 4,
    });
    expect(page3).toHaveLength(1);
    expect(page3[0]?.body).toBe("Post 0");
  });

  it("computes total pages from count", async () => {
    for (let i = 0; i < 5; i++) {
      await postService.create({
        format: "note",
        body: `Post ${i}`,
      });
    }

    const pageSize = 2;
    const totalCount = await postService.count({
      status: "published",
      excludeReplies: true,
    });

    expect(totalCount).toBe(5);
    const totalPages = Math.ceil(totalCount / pageSize);
    expect(totalPages).toBe(3);
  });
});
