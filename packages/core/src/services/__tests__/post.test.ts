import { describe, it, expect, beforeEach } from "vitest";
import { createTestDatabase } from "../../__tests__/helpers/db.js";
import { createPostService } from "../post.js";
import type { Database } from "../../db/index.js";

describe("PostService", () => {
  let db: Database;
  let postService: ReturnType<typeof createPostService>;

  beforeEach(() => {
    const testDb = createTestDatabase();
    db = testDb.db as unknown as Database;
    postService = createPostService(db);
  });

  describe("create", () => {
    it("creates a note post with required fields", async () => {
      const post = await postService.create({
        type: "note",
        content: "Hello world",
      });

      expect(post.id).toBe(1);
      expect(post.type).toBe("note");
      expect(post.content).toBe("Hello world");
      expect(post.visibility).toBe("quiet"); // default
      expect(post.contentHtml).toContain("<p>Hello world</p>");
      expect(post.deletedAt).toBeNull();
    });

    it("creates a post with all fields", async () => {
      const post = await postService.create({
        type: "article",
        title: "My Article",
        content: "# Introduction\n\nSome content.",
        visibility: "featured",
        path: "my-article",
        sourceUrl: "https://example.com/source",
        sourceName: "Example",
      });

      expect(post.type).toBe("article");
      expect(post.title).toBe("My Article");
      expect(post.visibility).toBe("featured");
      expect(post.path).toBe("my-article");
      expect(post.sourceUrl).toBe("https://example.com/source");
      expect(post.sourceName).toBe("Example");
      expect(post.sourceDomain).toBe("example.com");
      expect(post.contentHtml).toContain("<h1>");
    });

    it("renders markdown content to HTML", async () => {
      const post = await postService.create({
        type: "note",
        content: "This is **bold** text",
      });

      expect(post.contentHtml).toContain("<strong>bold</strong>");
    });

    it("extracts domain from source URL", async () => {
      const post = await postService.create({
        type: "link",
        content: "Check this out",
        sourceUrl: "https://blog.example.org/article",
      });

      expect(post.sourceDomain).toBe("blog.example.org");
    });

    it("sets publishedAt and timestamps", async () => {
      const post = await postService.create({
        type: "note",
        content: "test",
      });

      expect(post.publishedAt).toBeGreaterThan(0);
      expect(post.createdAt).toBeGreaterThan(0);
      expect(post.updatedAt).toBeGreaterThan(0);
    });

    it("allows custom publishedAt", async () => {
      const customTime = 1706745600;
      const post = await postService.create({
        type: "note",
        content: "test",
        publishedAt: customTime,
      });

      expect(post.publishedAt).toBe(customTime);
    });

    it("creates incrementing IDs", async () => {
      const post1 = await postService.create({
        type: "note",
        content: "first",
      });
      const post2 = await postService.create({
        type: "note",
        content: "second",
      });

      expect(post2.id).toBeGreaterThan(post1.id);
    });
  });

  describe("getById", () => {
    it("returns a post by ID", async () => {
      const created = await postService.create({
        type: "note",
        content: "test",
      });

      const found = await postService.getById(created.id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.content).toBe("test");
    });

    it("returns null for non-existent ID", async () => {
      const found = await postService.getById(9999);
      expect(found).toBeNull();
    });

    it("excludes soft-deleted posts", async () => {
      const post = await postService.create({
        type: "note",
        content: "test",
      });
      await postService.delete(post.id);

      const found = await postService.getById(post.id);
      expect(found).toBeNull();
    });
  });

  describe("getByPath", () => {
    it("returns a post by path", async () => {
      await postService.create({
        type: "page",
        content: "About page",
        path: "about",
      });

      const found = await postService.getByPath("about");
      expect(found).not.toBeNull();
      expect(found?.path).toBe("about");
    });

    it("returns null for non-existent path", async () => {
      const found = await postService.getByPath("nonexistent");
      expect(found).toBeNull();
    });

    it("excludes soft-deleted posts", async () => {
      const post = await postService.create({
        type: "page",
        content: "test",
        path: "test-page",
      });
      await postService.delete(post.id);

      const found = await postService.getByPath("test-page");
      expect(found).toBeNull();
    });
  });

  describe("list", () => {
    it("returns empty array when no posts exist", async () => {
      const posts = await postService.list();
      expect(posts).toEqual([]);
    });

    it("returns all non-deleted posts", async () => {
      await postService.create({ type: "note", content: "first" });
      await postService.create({ type: "note", content: "second" });
      await postService.create({ type: "note", content: "third" });

      const posts = await postService.list();
      expect(posts).toHaveLength(3);
    });

    it("orders by publishedAt descending", async () => {
      await postService.create({
        type: "note",
        content: "old",
        publishedAt: 1000,
      });
      await postService.create({
        type: "note",
        content: "new",
        publishedAt: 2000,
      });

      const posts = await postService.list();
      expect(posts[0]?.content).toBe("new");
      expect(posts[1]?.content).toBe("old");
    });

    it("filters by type", async () => {
      await postService.create({ type: "note", content: "a note" });
      await postService.create({
        type: "article",
        content: "an article",
        title: "Article",
      });

      const notes = await postService.list({ type: "note" });
      expect(notes).toHaveLength(1);
      expect(notes[0]?.type).toBe("note");
    });

    it("filters by single visibility", async () => {
      await postService.create({
        type: "note",
        content: "featured",
        visibility: "featured",
      });
      await postService.create({
        type: "note",
        content: "draft",
        visibility: "draft",
      });

      const featured = await postService.list({ visibility: "featured" });
      expect(featured).toHaveLength(1);
      expect(featured[0]?.visibility).toBe("featured");
    });

    it("filters by multiple visibility levels", async () => {
      await postService.create({
        type: "note",
        content: "featured",
        visibility: "featured",
      });
      await postService.create({
        type: "note",
        content: "quiet",
        visibility: "quiet",
      });
      await postService.create({
        type: "note",
        content: "draft",
        visibility: "draft",
      });

      const publicPosts = await postService.list({
        visibility: ["featured", "quiet"],
      });
      expect(publicPosts).toHaveLength(2);
    });

    it("excludes deleted posts by default", async () => {
      const post = await postService.create({
        type: "note",
        content: "test",
      });
      await postService.create({ type: "note", content: "kept" });
      await postService.delete(post.id);

      const posts = await postService.list();
      expect(posts).toHaveLength(1);
      expect(posts[0]?.content).toBe("kept");
    });

    it("includes deleted posts when requested", async () => {
      const post = await postService.create({
        type: "note",
        content: "test",
      });
      await postService.delete(post.id);

      const posts = await postService.list({ includeDeleted: true });
      expect(posts).toHaveLength(1);
    });

    it("supports limit", async () => {
      for (let i = 0; i < 5; i++) {
        await postService.create({ type: "note", content: `post ${i}` });
      }

      const posts = await postService.list({ limit: 2 });
      expect(posts).toHaveLength(2);
    });

    it("supports cursor pagination", async () => {
      const created = [];
      for (let i = 0; i < 5; i++) {
        created.push(
          await postService.create({
            type: "note",
            content: `post ${i}`,
            publishedAt: 1000 + i,
          }),
        );
      }

      // Get posts with ID less than the 3rd post
      const thirdPostId = created[2]?.id ?? 0;
      const posts = await postService.list({ cursor: thirdPostId });
      expect(posts.every((p) => p.id < thirdPostId)).toBe(true);
    });

    it("excludes replies when requested", async () => {
      const root = await postService.create({
        type: "note",
        content: "root post",
      });
      await postService.create({
        type: "note",
        content: "reply",
        replyToId: root.id,
      });

      const posts = await postService.list({ excludeReplies: true });
      expect(posts).toHaveLength(1);
      expect(posts[0]?.content).toBe("root post");
    });
  });

  describe("update", () => {
    it("updates post content", async () => {
      const post = await postService.create({
        type: "note",
        content: "original",
      });

      const updated = await postService.update(post.id, {
        content: "updated content",
      });

      expect(updated).not.toBeNull();
      expect(updated?.content).toBe("updated content");
      expect(updated?.contentHtml).toContain("updated content");
    });

    it("updates post title", async () => {
      const post = await postService.create({
        type: "article",
        content: "body",
        title: "Original Title",
      });

      const updated = await postService.update(post.id, {
        title: "New Title",
      });

      expect(updated?.title).toBe("New Title");
    });

    it("updates source URL and extracts domain", async () => {
      const post = await postService.create({
        type: "link",
        content: "link post",
      });

      const updated = await postService.update(post.id, {
        sourceUrl: "https://new-source.com/path",
      });

      expect(updated?.sourceUrl).toBe("https://new-source.com/path");
      expect(updated?.sourceDomain).toBe("new-source.com");
    });

    it("clears source domain when URL cleared", async () => {
      const post = await postService.create({
        type: "link",
        content: "test",
        sourceUrl: "https://example.com",
      });

      const updated = await postService.update(post.id, {
        sourceUrl: null,
      });

      expect(updated?.sourceUrl).toBeNull();
      expect(updated?.sourceDomain).toBeNull();
    });

    it("returns null for non-existent post", async () => {
      const result = await postService.update(9999, { content: "test" });
      expect(result).toBeNull();
    });

    it("updates updatedAt timestamp", async () => {
      const post = await postService.create({
        type: "note",
        content: "test",
      });
      const originalUpdatedAt = post.updatedAt;

      // Small delay to ensure different timestamp
      await new Promise((r) => setTimeout(r, 1100));

      const updated = await postService.update(post.id, {
        content: "modified",
      });

      expect(updated?.updatedAt).toBeGreaterThanOrEqual(originalUpdatedAt);
    });
  });

  describe("delete (soft delete)", () => {
    it("soft-deletes a post", async () => {
      const post = await postService.create({
        type: "note",
        content: "test",
      });

      const result = await postService.delete(post.id);
      expect(result).toBe(true);

      // Should not appear in regular queries
      const found = await postService.getById(post.id);
      expect(found).toBeNull();
    });

    it("returns false for non-existent post", async () => {
      const result = await postService.delete(9999);
      expect(result).toBe(false);
    });

    it("cascade deletes thread when deleting root post", async () => {
      const root = await postService.create({
        type: "note",
        content: "root",
      });
      const reply = await postService.create({
        type: "note",
        content: "reply",
        replyToId: root.id,
      });

      await postService.delete(root.id);

      // Both root and reply should be soft-deleted
      expect(await postService.getById(root.id)).toBeNull();
      expect(await postService.getById(reply.id)).toBeNull();
    });

    it("only deletes single post when deleting a reply", async () => {
      const root = await postService.create({
        type: "note",
        content: "root",
      });
      const reply1 = await postService.create({
        type: "note",
        content: "reply1",
        replyToId: root.id,
      });
      await postService.create({
        type: "note",
        content: "reply2",
        replyToId: root.id,
      });

      await postService.delete(reply1.id);

      // Root should still exist
      expect(await postService.getById(root.id)).not.toBeNull();
      // reply1 should be deleted
      expect(await postService.getById(reply1.id)).toBeNull();
    });
  });

  describe("threads", () => {
    it("sets threadId on reply to a root post", async () => {
      const root = await postService.create({
        type: "note",
        content: "root",
      });
      const reply = await postService.create({
        type: "note",
        content: "reply",
        replyToId: root.id,
      });

      expect(reply.threadId).toBe(root.id);
      expect(reply.replyToId).toBe(root.id);
    });

    it("inherits threadId from parent in nested replies", async () => {
      const root = await postService.create({
        type: "note",
        content: "root",
      });
      const reply1 = await postService.create({
        type: "note",
        content: "reply1",
        replyToId: root.id,
      });
      const reply2 = await postService.create({
        type: "note",
        content: "reply2",
        replyToId: reply1.id,
      });

      // Both replies point to the root's thread
      expect(reply1.threadId).toBe(root.id);
      expect(reply2.threadId).toBe(root.id);
    });

    it("inherits visibility from root post", async () => {
      const root = await postService.create({
        type: "note",
        content: "root",
        visibility: "featured",
      });
      const reply = await postService.create({
        type: "note",
        content: "reply",
        replyToId: root.id,
      });

      expect(reply.visibility).toBe("featured");
    });

    it("getThread returns all posts in a thread", async () => {
      const root = await postService.create({
        type: "note",
        content: "root",
      });
      await postService.create({
        type: "note",
        content: "reply1",
        replyToId: root.id,
      });
      await postService.create({
        type: "note",
        content: "reply2",
        replyToId: root.id,
      });

      const thread = await postService.getThread(root.id);
      expect(thread).toHaveLength(3);
      // Ordered by createdAt
      expect(thread[0]?.content).toBe("root");
    });

    it("getThread excludes deleted posts", async () => {
      const root = await postService.create({
        type: "note",
        content: "root",
      });
      const reply = await postService.create({
        type: "note",
        content: "reply",
        replyToId: root.id,
      });

      await postService.delete(reply.id);

      const thread = await postService.getThread(root.id);
      expect(thread).toHaveLength(1);
    });

    it("cascades visibility changes from root to thread", async () => {
      const root = await postService.create({
        type: "note",
        content: "root",
        visibility: "quiet",
      });
      await postService.create({
        type: "note",
        content: "reply",
        replyToId: root.id,
      });

      await postService.update(root.id, { visibility: "featured" });

      const thread = await postService.getThread(root.id);
      for (const post of thread) {
        expect(post.visibility).toBe("featured");
      }
    });
  });

  describe("getReplyCounts", () => {
    it("returns empty map for empty input", async () => {
      const counts = await postService.getReplyCounts([]);
      expect(counts.size).toBe(0);
    });

    it("returns reply counts for posts", async () => {
      const root = await postService.create({
        type: "note",
        content: "root",
      });
      await postService.create({
        type: "note",
        content: "reply1",
        replyToId: root.id,
      });
      await postService.create({
        type: "note",
        content: "reply2",
        replyToId: root.id,
      });

      const counts = await postService.getReplyCounts([root.id]);
      expect(counts.get(root.id)).toBe(2);
    });

    it("returns 0 (missing) for posts without replies", async () => {
      const post = await postService.create({
        type: "note",
        content: "no replies",
      });

      const counts = await postService.getReplyCounts([post.id]);
      expect(counts.get(post.id)).toBeUndefined();
    });

    it("excludes deleted replies from count", async () => {
      const root = await postService.create({
        type: "note",
        content: "root",
      });
      const reply = await postService.create({
        type: "note",
        content: "reply",
        replyToId: root.id,
      });
      await postService.create({
        type: "note",
        content: "reply2",
        replyToId: root.id,
      });

      await postService.delete(reply.id);

      const counts = await postService.getReplyCounts([root.id]);
      expect(counts.get(root.id)).toBe(1);
    });
  });
});
