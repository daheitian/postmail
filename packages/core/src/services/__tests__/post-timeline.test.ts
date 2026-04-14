import { describe, it, expect, beforeEach } from "vitest";
import {
  createTestDatabase,
  DEFAULT_TEST_SITE_ID,
} from "../../__tests__/helpers/db.js";
import { postCollections } from "../../db/schema.js";
import { createPostService } from "../post.js";
import { createCollectionService } from "../collection.js";
import type { Database } from "../../db/index.js";

describe("PostService - Timeline features", () => {
  let db: Database;
  let postService: ReturnType<typeof createPostService>;
  let collectionService: ReturnType<typeof createCollectionService>;

  beforeEach(() => {
    const testDb = createTestDatabase();
    db = testDb.db as unknown as Database;
    postService = createPostService(
      db,
      { slugIdLength: 5 },
      DEFAULT_TEST_SITE_ID,
    );
    collectionService = createCollectionService(db, DEFAULT_TEST_SITE_ID);
  });

  describe("format filter", () => {
    it("filters by format", async () => {
      await postService.create({ format: "note", bodyMarkdown: "a note" });
      await postService.create({
        format: "link",
        bodyMarkdown: "a link",
        title: "A link",
        url: "https://example.com",
      });
      await postService.create({
        format: "quote",
        bodyMarkdown: "a quote",
        quoteText: "something wise",
      });

      const posts = await postService.list({ format: "note" });
      expect(posts).toHaveLength(1);
      expect(posts[0]?.format).toBe("note");
    });

    it("combines format and status filters", async () => {
      await postService.create({
        format: "note",
        bodyMarkdown: "published note",
        status: "published",
      });
      await postService.create({
        format: "note",
        bodyMarkdown: "draft note",
        status: "draft",
      });
      await postService.create({
        format: "link",
        bodyMarkdown: "published link",
        status: "published",
        title: "Published link",
        url: "https://example.com",
      });

      const posts = await postService.list({
        format: "note",
        status: "published",
      });
      expect(posts).toHaveLength(1);
      expect(posts[0]?.format).toBe("note");
      expect(posts[0]?.status).toBe("published");
    });
  });

  describe("getThreadPreviews", () => {
    it("returns empty map for empty input", async () => {
      const previews = await postService.getThreadPreviews([]);
      expect(previews.size).toBe(0);
    });

    it("returns preview replies for a thread root", async () => {
      const root = await postService.create({
        format: "note",
        bodyMarkdown: "root",
      });
      const reply1 = await postService.create({
        format: "note",
        bodyMarkdown: "reply 1",
        replyToId: root.id,
      });
      await postService.create({
        format: "note",
        bodyMarkdown: "reply 2",
        replyToId: reply1.id,
      });

      const previews = await postService.getThreadPreviews([root.id]);
      const replies = previews.get(root.id);
      expect(replies).toBeDefined();
      expect(replies).toHaveLength(2);
      expect(replies?.[0]?.bodyText).toBe("reply 1");
      expect(replies?.[1]?.bodyText).toBe("reply 2");
    });

    it("limits preview replies to previewCount", async () => {
      const root = await postService.create({
        format: "note",
        bodyMarkdown: "root",
      });
      let prev = root;
      for (let i = 0; i < 5; i++) {
        prev = await postService.create({
          format: "note",
          bodyMarkdown: `reply ${i}`,
          replyToId: prev.id,
        });
      }

      const previews = await postService.getThreadPreviews([root.id], 2);
      const replies = previews.get(root.id);
      expect(replies).toHaveLength(2);
      expect(replies?.[0]?.bodyText).toBe("reply 0");
      expect(replies?.[1]?.bodyText).toBe("reply 1");
    });

    it("defaults to 3 preview replies", async () => {
      const root = await postService.create({
        format: "note",
        bodyMarkdown: "root",
      });
      let prev = root;
      for (let i = 0; i < 5; i++) {
        prev = await postService.create({
          format: "note",
          bodyMarkdown: `reply ${i}`,
          replyToId: prev.id,
        });
      }

      const previews = await postService.getThreadPreviews([root.id]);
      const replies = previews.get(root.id);
      expect(replies).toHaveLength(3);
    });

    it("handles multiple thread roots", async () => {
      const root1 = await postService.create({
        format: "note",
        bodyMarkdown: "root 1",
      });
      const root2 = await postService.create({
        format: "note",
        bodyMarkdown: "root 2",
      });
      await postService.create({
        format: "note",
        bodyMarkdown: "reply to root 1",
        replyToId: root1.id,
      });
      await postService.create({
        format: "note",
        bodyMarkdown: "reply to root 2",
        replyToId: root2.id,
      });

      const previews = await postService.getThreadPreviews([
        root1.id,
        root2.id,
      ]);
      expect(previews.size).toBe(2);
      expect(previews.get(root1.id)).toHaveLength(1);
      expect(previews.get(root2.id)).toHaveLength(1);
    });

    it("excludes deleted replies", async () => {
      const root = await postService.create({
        format: "note",
        bodyMarkdown: "root",
      });
      const reply1 = await postService.create({
        format: "note",
        bodyMarkdown: "reply 1",
        replyToId: root.id,
      });
      await postService.create({
        format: "note",
        bodyMarkdown: "reply 2",
        replyToId: reply1.id,
      });

      await postService.delete(reply1.id);

      const previews = await postService.getThreadPreviews([root.id]);
      const replies = previews.get(root.id);
      expect(replies).toHaveLength(1);
      expect(replies?.[0]?.bodyText).toBe("reply 2");
    });

    it("excludes draft replies", async () => {
      const root = await postService.create({
        format: "note",
        bodyMarkdown: "root",
      });
      const publishedReply = await postService.create({
        format: "note",
        bodyMarkdown: "published reply",
        replyToId: root.id,
      });
      await postService.create({
        format: "note",
        bodyMarkdown: "draft reply",
        replyToId: publishedReply.id,
        status: "draft",
      });

      const previews = await postService.getThreadPreviews([root.id]);
      const replies = previews.get(root.id);
      expect(replies).toHaveLength(1);
      expect(replies?.[0]?.bodyText).toBe("published reply");
    });

    it("returns empty for roots with no replies", async () => {
      const root = await postService.create({
        format: "note",
        bodyMarkdown: "root with no replies",
      });

      const previews = await postService.getThreadPreviews([root.id]);
      expect(previews.get(root.id)).toBeUndefined();
    });
  });

  describe("getThreadTimelineContext", () => {
    it("returns empty map for empty input", async () => {
      const result = await postService.getThreadTimelineContext([]);
      expect(result.size).toBe(0);
    });

    it("returns second and latest as the same post for a 2-post thread", async () => {
      const root = await postService.create({
        format: "note",
        bodyMarkdown: "root",
      });
      const reply = await postService.create({
        format: "note",
        bodyMarkdown: "only reply",
        replyToId: root.id,
      });

      const result = await postService.getThreadTimelineContext([root.id]);
      const ctx = result.get(root.id);
      expect(ctx).toBeDefined();
      expect(ctx?.secondReply?.id).toBe(reply.id);
      expect(ctx?.penultimateReply).toBeNull();
      expect(ctx?.latestReply.id).toBe(reply.id);
      expect(ctx?.totalReplyCount).toBe(1);
    });

    it("returns second, penultimate, and latest slots for a 3-post thread", async () => {
      const root = await postService.create({
        format: "note",
        bodyMarkdown: "root",
      });
      const reply1 = await postService.create({
        format: "note",
        bodyMarkdown: "reply 1",
        replyToId: root.id,
      });
      const reply2 = await postService.create({
        format: "note",
        bodyMarkdown: "reply 2",
        replyToId: reply1.id,
      });

      const result = await postService.getThreadTimelineContext([root.id]);
      const ctx = result.get(root.id);
      expect(ctx).toBeDefined();
      expect(ctx?.secondReply?.id).toBe(reply1.id);
      expect(ctx?.penultimateReply?.id).toBe(reply1.id);
      expect(ctx?.latestReply.id).toBe(reply2.id);
      expect(ctx?.totalReplyCount).toBe(2);
    });

    it("returns second, penultimate, and latest slots for longer threads", async () => {
      const root = await postService.create({
        format: "note",
        bodyMarkdown: "root",
      });
      let prev = root;
      for (let i = 0; i < 5; i++) {
        prev = await postService.create({
          format: "note",
          bodyMarkdown: `reply ${i}`,
          replyToId: prev.id,
        });
      }

      const result = await postService.getThreadTimelineContext([root.id]);
      const ctx = result.get(root.id);
      expect(ctx).toBeDefined();
      expect(ctx?.secondReply?.bodyText).toBe("reply 0");
      expect(ctx?.penultimateReply?.bodyText).toBe("reply 3");
      expect(ctx?.latestReply.bodyText).toBe("reply 4");
      expect(ctx?.totalReplyCount).toBe(5);
    });

    it("excludes deleted replies", async () => {
      const root = await postService.create({
        format: "note",
        bodyMarkdown: "root",
      });
      const reply1 = await postService.create({
        format: "note",
        bodyMarkdown: "reply 1",
        replyToId: root.id,
      });
      const reply2 = await postService.create({
        format: "note",
        bodyMarkdown: "reply 2",
        replyToId: reply1.id,
      });

      // Delete the latest reply — reply1 should become the latest
      await postService.delete(reply2.id);

      const result = await postService.getThreadTimelineContext([root.id]);
      const ctx = result.get(root.id);
      expect(ctx).toBeDefined();
      expect(ctx?.secondReply?.id).toBe(reply1.id);
      expect(ctx?.latestReply.id).toBe(reply1.id);
      expect(ctx?.totalReplyCount).toBe(1);
    });

    it("excludes draft replies from thread context", async () => {
      const root = await postService.create({
        format: "note",
        bodyMarkdown: "root",
      });
      const publishedReply = await postService.create({
        format: "note",
        bodyMarkdown: "published reply",
        replyToId: root.id,
      });
      await postService.create({
        format: "note",
        bodyMarkdown: "draft reply",
        replyToId: publishedReply.id,
        status: "draft",
      });

      const result = await postService.getThreadTimelineContext([root.id]);
      const ctx = result.get(root.id);
      expect(ctx).toBeDefined();
      expect(ctx?.secondReply?.id).toBe(publishedReply.id);
      expect(ctx?.latestReply.id).toBe(publishedReply.id);
      expect(ctx?.totalReplyCount).toBe(1);
    });

    it("handles multiple roots in batch", async () => {
      const root1 = await postService.create({
        format: "note",
        bodyMarkdown: "root 1",
      });
      const root2 = await postService.create({
        format: "note",
        bodyMarkdown: "root 2",
      });
      const r1Reply = await postService.create({
        format: "note",
        bodyMarkdown: "reply to root 1",
        replyToId: root1.id,
      });
      const r2Reply = await postService.create({
        format: "note",
        bodyMarkdown: "reply to root 2",
        replyToId: root2.id,
      });

      const result = await postService.getThreadTimelineContext([
        root1.id,
        root2.id,
      ]);
      expect(result.size).toBe(2);
      expect(result.get(root1.id)?.secondReply?.id).toBe(r1Reply.id);
      expect(result.get(root2.id)?.secondReply?.id).toBe(r2Reply.id);
      expect(result.get(root1.id)?.latestReply.id).toBe(r1Reply.id);
      expect(result.get(root2.id)?.latestReply.id).toBe(r2Reply.id);
    });
  });

  describe("getLastPostIdsByThread", () => {
    it("keeps independent root threads separate", async () => {
      const root1 = await postService.create({
        format: "note",
        bodyMarkdown: "root 1",
      });
      const root2 = await postService.create({
        format: "quote",
        bodyMarkdown: "root 2",
        quoteText: "quoted",
      });

      const result = await postService.getLastPostIdsByThread([
        root1.id,
        root2.id,
      ]);

      expect(result.get(root1.id)).toBe(root1.id);
      expect(result.get(root2.id)).toBe(root2.id);
    });

    it("returns the latest published post within each thread", async () => {
      const root1 = await postService.create({
        format: "note",
        bodyMarkdown: "root 1",
      });
      const root2 = await postService.create({
        format: "note",
        bodyMarkdown: "root 2",
      });
      const reply1 = await postService.create({
        format: "note",
        bodyMarkdown: "reply 1",
        replyToId: root1.id,
      });

      const result = await postService.getLastPostIdsByThread([
        root1.id,
        root2.id,
      ]);

      expect(result.get(root1.id)).toBe(reply1.id);
      expect(result.get(root2.id)).toBe(root2.id);
    });
  });

  describe("timeline assembly", () => {
    it("fetches published non-reply posts for the timeline", async () => {
      const root = await postService.create({
        format: "note",
        bodyMarkdown: "a published note",
        status: "published",
      });
      await postService.create({
        format: "note",
        bodyMarkdown: "a reply",
        status: "published",
        replyToId: root.id,
      });
      await postService.create({
        format: "note",
        bodyMarkdown: "a draft",
        status: "draft",
      });

      const posts = await postService.list({
        status: "published",
        excludeReplies: true,
        limit: 21,
      });

      expect(posts).toHaveLength(1);
      expect(posts[0]?.bodyText).toBe("a published note");
    });
  });

  describe("listCollectionFeedEntries", () => {
    it("orders collection feeds by publishedAt and returns thread roots", async () => {
      const collection = await collectionService.create({
        slug: "reading",
        title: "Reading",
      });
      const firstRoot = await postService.create({
        format: "note",
        bodyMarkdown: "First root",
      });
      const collectedReply = await postService.create({
        format: "note",
        bodyMarkdown: "Collected reply",
        replyToId: firstRoot.id,
      });
      const secondRoot = await postService.create({
        format: "note",
        bodyMarkdown: "Second root",
      });

      await db.insert(postCollections).values([
        {
          siteId: DEFAULT_TEST_SITE_ID,
          postId: collectedReply.id,
          collectionId: collection.id,
          createdAt: 100,
        },
        {
          siteId: DEFAULT_TEST_SITE_ID,
          postId: secondRoot.id,
          collectionId: collection.id,
          createdAt: 200,
        },
      ]);

      const entries = await postService.listCollectionFeedEntries(
        collection.id,
        {
          status: "published",
        },
      );

      expect(entries).toHaveLength(2);
      expect(entries[0]?.post.id).toBe(secondRoot.id);
      expect(entries[0]?.collectedAt).toBe(200);
      expect(entries[1]?.post.id).toBe(firstRoot.id);
      expect(entries[1]?.collectedAt).toBe(100);
    });

    it("dedupes shared threads across multiple collections", async () => {
      const smart = await collectionService.create({
        slug: "smart",
        title: "Smart",
      });
      const movies = await collectionService.create({
        slug: "movies",
        title: "Movies",
      });
      const sharedRoot = await postService.create({
        format: "note",
        bodyMarkdown: "Shared root",
      });
      const sharedReply = await postService.create({
        format: "note",
        bodyMarkdown: "Shared reply",
        replyToId: sharedRoot.id,
      });
      const secondRoot = await postService.create({
        format: "note",
        bodyMarkdown: "Second root",
      });

      await db.insert(postCollections).values([
        {
          siteId: DEFAULT_TEST_SITE_ID,
          postId: sharedRoot.id,
          collectionId: smart.id,
          createdAt: 100,
        },
        {
          siteId: DEFAULT_TEST_SITE_ID,
          postId: sharedReply.id,
          collectionId: movies.id,
          createdAt: 300,
        },
        {
          siteId: DEFAULT_TEST_SITE_ID,
          postId: secondRoot.id,
          collectionId: movies.id,
          createdAt: 200,
        },
      ]);

      const entries = await postService.listCollectionFeedEntriesForCollections(
        [smart.id, movies.id],
        {
          status: "published",
        },
      );

      expect(entries).toHaveLength(2);
      // Sorted by publishedAt DESC: secondRoot created last has latest publishedAt
      expect(entries[0]?.post.id).toBe(secondRoot.id);
      expect(entries[0]?.collectedAt).toBe(200);
      expect(entries[1]?.post.id).toBe(sharedRoot.id);
      expect(entries[1]?.collectedAt).toBe(300);
    });
  });
});
