/**
 * Timeline Data Assembly Tests
 *
 * Tests the timeline data assembly logic via the service layer.
 * The actual route handler renders JSX components which require the Lingui SWC
 * plugin (not available in vitest). We test the underlying service operations
 * that power the timeline instead.
 */

import { describe, it, expect, beforeEach } from "vitest";
import type { Context } from "hono";
import { createTestDatabase } from "../../__tests__/helpers/db.js";
import { createPostService } from "../../services/post.js";
import { createMediaService } from "../../services/media.js";
import { createPathService } from "../../services/path.js";
import { createCollectionService } from "../../services/collection.js";
import { buildMediaMap } from "../media-helpers.js";
import { assembleFeaturedTimeline, assembleTimelineItem } from "../timeline.js";
import type { Database } from "../../db/index.js";
import type { AppConfig, Bindings, PostWithMedia } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

describe("Timeline data assembly", () => {
  let db: Database;
  let postService: ReturnType<typeof createPostService>;
  let mediaService: ReturnType<typeof createMediaService>;
  let collectionService: ReturnType<typeof createCollectionService>;

  beforeEach(() => {
    const testDb = createTestDatabase();
    db = testDb.db as unknown as Database;
    const pathService = createPathService(db);
    postService = createPostService(db, { slugIdLength: 5 }, pathService);
    mediaService = createMediaService(db);
    collectionService = createCollectionService(db, pathService);
  });

  function createTimelineContext(): Context<Env> {
    return {
      var: {
        services: {
          posts: postService,
          media: mediaService,
          collections: collectionService,
        },
        appConfig: {
          pageSize: 20,
        } as unknown as AppConfig,
      },
    } as unknown as Context<Env>;
  }

  it("assembles timeline items with media attachments", async () => {
    const post = await postService.create({
      format: "note",
      bodyMarkdown: "Hello",
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

  it("identifies thread roots and builds thread context", async () => {
    const root = await postService.create({
      format: "note",
      bodyMarkdown: "Thread root",
    });
    await postService.create({
      format: "note",
      bodyMarkdown: "Reply 1",
      replyToId: root.id,
    });
    await postService.create({
      format: "note",
      bodyMarkdown: "Reply 2",
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

    const threadContexts =
      await postService.getThreadTimelineContext(threadRootIds);
    const ctx = threadContexts.get(root.id);
    expect(ctx).toBeDefined();
    expect(ctx?.latestReply.bodyText).toBe("Reply 2");
    expect(ctx?.totalReplyCount).toBe(2);

    // Assemble items
    const rawMediaMap = await mediaService.getByPostIds(postIds);
    const mediaMap = buildMediaMap(rawMediaMap);

    const items = posts.map((post) => {
      const postWithMedia: PostWithMedia = {
        ...post,
        mediaAttachments: mediaMap.get(post.id) ?? [],
      };

      const threadCtx = threadContexts.get(post.id);

      if (threadCtx) {
        return {
          post: postWithMedia,
          threadPreview: {
            latestReply: {
              ...threadCtx.latestReply,
              mediaAttachments: [],
            },
            parentReply: threadCtx.parentReply
              ? { ...threadCtx.parentReply, mediaAttachments: [] }
              : undefined,
            totalReplyCount: threadCtx.totalReplyCount,
          },
        };
      }

      return { post: postWithMedia };
    });

    expect(items).toHaveLength(1);
    expect(items[0]?.threadPreview).toBeDefined();
    expect(items[0]?.threadPreview?.latestReply.bodyText).toBe("Reply 2");
    expect(items[0]?.threadPreview?.totalReplyCount).toBe(2);
  });

  it("excludes replies from top-level list", async () => {
    const root = await postService.create({
      format: "note",
      bodyMarkdown: "Root",
    });
    await postService.create({
      format: "note",
      bodyMarkdown: "Reply",
      replyToId: root.id,
    });

    const posts = await postService.list({
      status: "published",
      excludeReplies: true,
      limit: 21,
    });

    expect(posts).toHaveLength(1);
    expect(posts[0]?.bodyText).toBe("Root");
  });

  it("supports cursor pagination for load more", async () => {
    const posts = [];
    for (let i = 0; i < 5; i++) {
      posts.push(
        await postService.create({
          format: "note",
          bodyMarkdown: `Post ${i}`,
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
        bodyMarkdown: `Post ${i}`,
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
    expect(page1[0]?.bodyText).toBe("Post 4");
    expect(page1[1]?.bodyText).toBe("Post 3");

    // Page 2
    const page2 = await postService.list({
      status: "published",
      excludeReplies: true,
      limit: pageSize,
      offset: 2,
    });
    expect(page2).toHaveLength(2);
    expect(page2[0]?.bodyText).toBe("Post 2");
    expect(page2[1]?.bodyText).toBe("Post 1");

    // Page 3 (partial)
    const page3 = await postService.list({
      status: "published",
      excludeReplies: true,
      limit: pageSize,
      offset: 4,
    });
    expect(page3).toHaveLength(1);
    expect(page3[0]?.bodyText).toBe("Post 0");
  });

  it("computes total pages from count", async () => {
    for (let i = 0; i < 5; i++) {
      await postService.create({
        format: "note",
        bodyMarkdown: `Post ${i}`,
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

  it("assembles a single timeline item for in-place thread refreshes", async () => {
    const root = await postService.create({
      format: "note",
      bodyMarkdown: "Thread root",
    });
    await postService.create({
      format: "note",
      bodyMarkdown: "Reply 1",
      replyToId: root.id,
    });
    const latestReply = await postService.create({
      format: "note",
      bodyMarkdown: "Reply 2",
      replyToId: root.id,
    });

    const item = await assembleTimelineItem(createTimelineContext(), root.id);

    expect(item?.post.id).toBe(root.id);
    expect(item?.post.isLastInThread).toBe(false);
    expect(item?.threadPreview?.latestReply.id).toBe(latestReply.id);
    expect(item?.threadPreview?.totalReplyCount).toBe(2);
  });

  it('shows an "In thread" link for featured root posts with replies', async () => {
    const root = await postService.create({
      format: "note",
      bodyMarkdown: "Featured root",
      featured: true,
    });
    await postService.create({
      format: "note",
      bodyMarkdown: "Reply",
      replyToId: root.id,
    });

    const result = await assembleFeaturedTimeline(createTimelineContext(), {
      isAuthenticated: true,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.post.id).toBe(root.id);
    expect(result.items[0]?.post.threadRootPermalink).toBe(
      result.items[0]?.post.permalink,
    );
  });

  it("omits private timeline items from unauthenticated partial refreshes", async () => {
    const root = await postService.create({
      format: "note",
      bodyMarkdown: "Private root",
      visibility: "private",
    });

    const unauthenticatedItem = await assembleTimelineItem(
      createTimelineContext(),
      root.id,
    );
    const authenticatedItem = await assembleTimelineItem(
      createTimelineContext(),
      root.id,
      { isAuthenticated: true },
    );

    expect(unauthenticatedItem).toBeNull();
    expect(authenticatedItem?.post.id).toBe(root.id);
  });
});
