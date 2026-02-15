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
    postService = createPostService(db);
    mediaService = createMediaService(db);
  });

  it("assembles timeline items with media attachments", async () => {
    const post = await postService.create({
      type: "note",
      content: "Hello",
      visibility: "featured",
    });

    const posts = await postService.list({
      visibility: ["featured", "quiet"],
      excludeReplies: true,
      excludeTypes: ["page"],
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
      type: "note",
      content: "Thread root",
      visibility: "featured",
    });
    await postService.create({
      type: "note",
      content: "Reply 1",
      replyToId: root.id,
    });
    await postService.create({
      type: "note",
      content: "Reply 2",
      replyToId: root.id,
    });

    const posts = await postService.list({
      visibility: ["featured", "quiet"],
      excludeReplies: true,
      excludeTypes: ["page"],
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
    expect(replies?.[0]?.content).toBe("Reply 1");

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

  it("excludes pages from timeline", async () => {
    await postService.create({
      type: "note",
      content: "A note",
      visibility: "quiet",
    });
    await postService.create({
      type: "page",
      content: "A page",
      visibility: "quiet",
    });

    const posts = await postService.list({
      visibility: ["featured", "quiet"],
      excludeReplies: true,
      excludeTypes: ["page"],
      limit: 21,
    });

    expect(posts).toHaveLength(1);
    expect(posts[0]?.type).toBe("note");
  });

  it("excludes replies from top-level list", async () => {
    const root = await postService.create({
      type: "note",
      content: "Root",
      visibility: "quiet",
    });
    await postService.create({
      type: "note",
      content: "Reply",
      replyToId: root.id,
    });

    const posts = await postService.list({
      visibility: ["featured", "quiet"],
      excludeReplies: true,
      excludeTypes: ["page"],
      limit: 21,
    });

    expect(posts).toHaveLength(1);
    expect(posts[0]?.content).toBe("Root");
  });

  it("supports cursor pagination for load more", async () => {
    const posts = [];
    for (let i = 0; i < 5; i++) {
      posts.push(
        await postService.create({
          type: "note",
          content: `Post ${i}`,
          visibility: "quiet",
          publishedAt: 1000 + i,
        }),
      );
    }

    // First page
    const page1 = await postService.list({
      visibility: ["featured", "quiet"],
      excludeReplies: true,
      excludeTypes: ["page"],
      limit: 3,
    });
    expect(page1).toHaveLength(3);

    // Second page using cursor
    const lastPost = page1[page1.length - 1];
    expect(lastPost).toBeDefined();
    const page2 = await postService.list({
      visibility: ["featured", "quiet"],
      excludeReplies: true,
      excludeTypes: ["page"],
      limit: 3,
      cursor: lastPost?.id,
    });
    expect(page2).toHaveLength(2);
    expect(page2.every((p) => p.id < (lastPost?.id ?? 0))).toBe(true);
  });

  it("correctly determines hasMore flag", async () => {
    for (let i = 0; i < 3; i++) {
      await postService.create({
        type: "note",
        content: `Post ${i}`,
        visibility: "quiet",
      });
    }

    // Request limit + 1 to check for more
    const pageSize = 2;
    const posts = await postService.list({
      visibility: ["featured", "quiet"],
      excludeReplies: true,
      excludeTypes: ["page"],
      limit: pageSize + 1,
    });

    const hasMore = posts.length > pageSize;
    expect(hasMore).toBe(true);

    const displayPosts = posts.slice(0, pageSize);
    expect(displayPosts).toHaveLength(2);
  });
});
