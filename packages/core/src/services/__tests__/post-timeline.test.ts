import { describe, it, expect, beforeEach } from "vitest";
import { createTestDatabase } from "../../__tests__/helpers/db.js";
import { createPostService } from "../post.js";
import type { Database } from "../../db/index.js";

describe("PostService - Timeline features", () => {
  let db: Database;
  let postService: ReturnType<typeof createPostService>;

  beforeEach(() => {
    const testDb = createTestDatabase();
    db = testDb.db as unknown as Database;
    postService = createPostService(db, { slugIdLength: 5 });
  });

  describe("format filter", () => {
    it("filters by format", async () => {
      await postService.create({ format: "note", body: "a note" });
      await postService.create({
        format: "link",
        body: "a link",
        url: "https://example.com",
      });
      await postService.create({
        format: "quote",
        body: "a quote",
        quoteText: "something wise",
      });

      const posts = await postService.list({ format: "note" });
      expect(posts).toHaveLength(1);
      expect(posts[0]?.format).toBe("note");
    });

    it("combines format and status filters", async () => {
      await postService.create({
        format: "note",
        body: "published note",
        status: "published",
      });
      await postService.create({
        format: "note",
        body: "draft note",
        status: "draft",
      });
      await postService.create({
        format: "link",
        body: "published link",
        status: "published",
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
        body: "root",
      });
      await postService.create({
        format: "note",
        body: "reply 1",
        replyToId: root.id,
      });
      await postService.create({
        format: "note",
        body: "reply 2",
        replyToId: root.id,
      });

      const previews = await postService.getThreadPreviews([root.id]);
      const replies = previews.get(root.id);
      expect(replies).toBeDefined();
      expect(replies).toHaveLength(2);
      expect(replies?.[0]?.body).toBe("reply 1");
      expect(replies?.[1]?.body).toBe("reply 2");
    });

    it("limits preview replies to previewCount", async () => {
      const root = await postService.create({
        format: "note",
        body: "root",
      });
      for (let i = 0; i < 5; i++) {
        await postService.create({
          format: "note",
          body: `reply ${i}`,
          replyToId: root.id,
        });
      }

      const previews = await postService.getThreadPreviews([root.id], 2);
      const replies = previews.get(root.id);
      expect(replies).toHaveLength(2);
      expect(replies?.[0]?.body).toBe("reply 0");
      expect(replies?.[1]?.body).toBe("reply 1");
    });

    it("defaults to 3 preview replies", async () => {
      const root = await postService.create({
        format: "note",
        body: "root",
      });
      for (let i = 0; i < 5; i++) {
        await postService.create({
          format: "note",
          body: `reply ${i}`,
          replyToId: root.id,
        });
      }

      const previews = await postService.getThreadPreviews([root.id]);
      const replies = previews.get(root.id);
      expect(replies).toHaveLength(3);
    });

    it("handles multiple thread roots", async () => {
      const root1 = await postService.create({
        format: "note",
        body: "root 1",
      });
      const root2 = await postService.create({
        format: "note",
        body: "root 2",
      });
      await postService.create({
        format: "note",
        body: "reply to root 1",
        replyToId: root1.id,
      });
      await postService.create({
        format: "note",
        body: "reply to root 2",
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
        body: "root",
      });
      const reply1 = await postService.create({
        format: "note",
        body: "reply 1",
        replyToId: root.id,
      });
      await postService.create({
        format: "note",
        body: "reply 2",
        replyToId: root.id,
      });

      await postService.delete(reply1.id);

      const previews = await postService.getThreadPreviews([root.id]);
      const replies = previews.get(root.id);
      expect(replies).toHaveLength(1);
      expect(replies?.[0]?.body).toBe("reply 2");
    });

    it("returns empty for roots with no replies", async () => {
      const root = await postService.create({
        format: "note",
        body: "root with no replies",
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

    it("returns latestReply with no parentReply for a 2-post thread", async () => {
      const root = await postService.create({
        format: "note",
        body: "root",
      });
      const reply = await postService.create({
        format: "note",
        body: "only reply",
        replyToId: root.id,
      });

      const result = await postService.getThreadTimelineContext([root.id]);
      const ctx = result.get(root.id);
      expect(ctx).toBeDefined();
      expect(ctx?.latestReply.id).toBe(reply.id);
      expect(ctx?.parentReply).toBeNull();
      expect(ctx?.totalReplyCount).toBe(1);
    });

    it("returns latestReply + parentReply for a 3-post thread", async () => {
      const root = await postService.create({
        format: "note",
        body: "root",
      });
      const reply1 = await postService.create({
        format: "note",
        body: "reply 1",
        replyToId: root.id,
      });
      const reply2 = await postService.create({
        format: "note",
        body: "reply 2",
        replyToId: reply1.id,
      });

      const result = await postService.getThreadTimelineContext([root.id]);
      const ctx = result.get(root.id);
      expect(ctx).toBeDefined();
      expect(ctx?.latestReply.id).toBe(reply2.id);
      expect(ctx?.parentReply?.id).toBe(reply1.id);
      expect(ctx?.totalReplyCount).toBe(2);
    });

    it("returns correct totalReplyCount for 4+ post thread", async () => {
      const root = await postService.create({
        format: "note",
        body: "root",
      });
      let prev = root;
      for (let i = 0; i < 5; i++) {
        prev = await postService.create({
          format: "note",
          body: `reply ${i}`,
          replyToId: prev.id,
        });
      }

      const result = await postService.getThreadTimelineContext([root.id]);
      const ctx = result.get(root.id);
      expect(ctx).toBeDefined();
      expect(ctx?.latestReply.body).toBe("reply 4");
      expect(ctx?.parentReply?.body).toBe("reply 3");
      expect(ctx?.totalReplyCount).toBe(5);
    });

    it("excludes deleted replies", async () => {
      const root = await postService.create({
        format: "note",
        body: "root",
      });
      const reply1 = await postService.create({
        format: "note",
        body: "reply 1",
        replyToId: root.id,
      });
      const reply2 = await postService.create({
        format: "note",
        body: "reply 2",
        replyToId: reply1.id,
      });

      // Delete the latest reply — reply1 should become the latest
      await postService.delete(reply2.id);

      const result = await postService.getThreadTimelineContext([root.id]);
      const ctx = result.get(root.id);
      expect(ctx).toBeDefined();
      expect(ctx?.latestReply.id).toBe(reply1.id);
      expect(ctx?.totalReplyCount).toBe(1);
    });

    it("handles multiple roots in batch", async () => {
      const root1 = await postService.create({
        format: "note",
        body: "root 1",
      });
      const root2 = await postService.create({
        format: "note",
        body: "root 2",
      });
      const r1Reply = await postService.create({
        format: "note",
        body: "reply to root 1",
        replyToId: root1.id,
      });
      const r2Reply = await postService.create({
        format: "note",
        body: "reply to root 2",
        replyToId: root2.id,
      });

      const result = await postService.getThreadTimelineContext([
        root1.id,
        root2.id,
      ]);
      expect(result.size).toBe(2);
      expect(result.get(root1.id)?.latestReply.id).toBe(r1Reply.id);
      expect(result.get(root2.id)?.latestReply.id).toBe(r2Reply.id);
    });
  });

  describe("timeline assembly", () => {
    it("fetches published non-reply posts for the timeline", async () => {
      const root = await postService.create({
        format: "note",
        body: "a published note",
        status: "published",
      });
      await postService.create({
        format: "note",
        body: "a reply",
        status: "published",
        replyToId: root.id,
      });
      await postService.create({
        format: "note",
        body: "a draft",
        status: "draft",
      });

      const posts = await postService.list({
        status: "published",
        excludeReplies: true,
        limit: 21,
      });

      expect(posts).toHaveLength(1);
      expect(posts[0]?.body).toBe("a published note");
    });
  });
});
