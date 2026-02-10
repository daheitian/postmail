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
    postService = createPostService(db);
  });

  describe("excludeTypes filter", () => {
    it("excludes posts of specified types", async () => {
      await postService.create({ type: "note", content: "a note" });
      await postService.create({ type: "page", content: "a page" });
      await postService.create({
        type: "article",
        content: "an article",
        title: "Article",
      });

      const posts = await postService.list({ excludeTypes: ["page"] });
      expect(posts).toHaveLength(2);
      expect(posts.every((p) => p.type !== "page")).toBe(true);
    });

    it("excludes multiple types", async () => {
      await postService.create({ type: "note", content: "a note" });
      await postService.create({ type: "page", content: "a page" });
      await postService.create({
        type: "article",
        content: "an article",
        title: "Article",
      });
      await postService.create({
        type: "link",
        content: "a link",
        sourceUrl: "https://example.com",
      });

      const posts = await postService.list({
        excludeTypes: ["page", "link"],
      });
      expect(posts).toHaveLength(2);
      expect(posts.every((p) => p.type !== "page" && p.type !== "link")).toBe(
        true,
      );
    });

    it("returns all posts when excludeTypes is empty", async () => {
      await postService.create({ type: "note", content: "a note" });
      await postService.create({ type: "page", content: "a page" });

      const posts = await postService.list({ excludeTypes: [] });
      expect(posts).toHaveLength(2);
    });

    it("works combined with other filters", async () => {
      await postService.create({
        type: "note",
        content: "featured note",
        visibility: "featured",
      });
      await postService.create({
        type: "page",
        content: "featured page",
        visibility: "featured",
      });
      await postService.create({
        type: "note",
        content: "draft note",
        visibility: "draft",
      });

      const posts = await postService.list({
        excludeTypes: ["page"],
        visibility: "featured",
      });
      expect(posts).toHaveLength(1);
      expect(posts[0]?.type).toBe("note");
      expect(posts[0]?.visibility).toBe("featured");
    });
  });

  describe("getThreadPreviews", () => {
    it("returns empty map for empty input", async () => {
      const previews = await postService.getThreadPreviews([]);
      expect(previews.size).toBe(0);
    });

    it("returns preview replies for a thread root", async () => {
      const root = await postService.create({
        type: "note",
        content: "root",
      });
      await postService.create({
        type: "note",
        content: "reply 1",
        replyToId: root.id,
      });
      await postService.create({
        type: "note",
        content: "reply 2",
        replyToId: root.id,
      });

      const previews = await postService.getThreadPreviews([root.id]);
      const replies = previews.get(root.id);
      expect(replies).toBeDefined();
      expect(replies).toHaveLength(2);
      expect(replies?.[0]?.content).toBe("reply 1");
      expect(replies?.[1]?.content).toBe("reply 2");
    });

    it("limits preview replies to previewCount", async () => {
      const root = await postService.create({
        type: "note",
        content: "root",
      });
      for (let i = 0; i < 5; i++) {
        await postService.create({
          type: "note",
          content: `reply ${i}`,
          replyToId: root.id,
        });
      }

      const previews = await postService.getThreadPreviews([root.id], 2);
      const replies = previews.get(root.id);
      expect(replies).toHaveLength(2);
      expect(replies?.[0]?.content).toBe("reply 0");
      expect(replies?.[1]?.content).toBe("reply 1");
    });

    it("defaults to 3 preview replies", async () => {
      const root = await postService.create({
        type: "note",
        content: "root",
      });
      for (let i = 0; i < 5; i++) {
        await postService.create({
          type: "note",
          content: `reply ${i}`,
          replyToId: root.id,
        });
      }

      const previews = await postService.getThreadPreviews([root.id]);
      const replies = previews.get(root.id);
      expect(replies).toHaveLength(3);
    });

    it("handles multiple thread roots", async () => {
      const root1 = await postService.create({
        type: "note",
        content: "root 1",
      });
      const root2 = await postService.create({
        type: "note",
        content: "root 2",
      });
      await postService.create({
        type: "note",
        content: "reply to root 1",
        replyToId: root1.id,
      });
      await postService.create({
        type: "note",
        content: "reply to root 2",
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
        type: "note",
        content: "root",
      });
      const reply1 = await postService.create({
        type: "note",
        content: "reply 1",
        replyToId: root.id,
      });
      await postService.create({
        type: "note",
        content: "reply 2",
        replyToId: root.id,
      });

      await postService.delete(reply1.id);

      const previews = await postService.getThreadPreviews([root.id]);
      const replies = previews.get(root.id);
      expect(replies).toHaveLength(1);
      expect(replies?.[0]?.content).toBe("reply 2");
    });

    it("returns empty for roots with no replies", async () => {
      const root = await postService.create({
        type: "note",
        content: "root with no replies",
      });

      const previews = await postService.getThreadPreviews([root.id]);
      expect(previews.get(root.id)).toBeUndefined();
    });
  });
});
