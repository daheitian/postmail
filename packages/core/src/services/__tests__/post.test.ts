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
    postService = createPostService(db, { slugIdLength: 5 });
  });

  describe("create", () => {
    it("creates a note post with required fields", async () => {
      const body = JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Hello world" }],
          },
        ],
      });
      const post = await postService.create({
        format: "note",
        body,
      });

      expect(typeof post.id).toBe("string");
      expect(post.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
      expect(post.format).toBe("note");
      expect(post.body).toBe(body);
      expect(post.status).toBe("published"); // default
      expect(post.visibility).toBe("public");
      expect(post.pinned).toBe(0);
      expect(post.bodyHtml).toContain("<p>Hello world</p>");
      expect(post.deletedAt).toBeNull();
    });

    it("creates a post with all fields", async () => {
      const body = JSON.stringify({
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 1 },
            content: [{ type: "text", text: "Introduction" }],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "Some content." }],
          },
        ],
      });
      const post = await postService.create({
        format: "link",
        title: "My Link",
        body,
        status: "published",
        visibility: "featured",
        pinned: true,
        slug: "my-link",
        url: "https://example.com/source",
        quoteText: "A notable quote",
        rating: 5,
      });

      expect(post.format).toBe("link");
      expect(post.title).toBe("My Link");
      expect(post.status).toBe("published");
      expect(post.visibility).toBe("featured");
      expect(post.pinned).toBe(1);
      expect(post.slug).toBe("my-link");
      expect(post.url).toBe("https://example.com/source");
      expect(post.quoteText).toBe("A notable quote");
      expect(post.rating).toBe(5);
      expect(post.bodyHtml).toContain("<h1>");
    });

    it("renders Tiptap JSON body to HTML", async () => {
      const body = JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "This is " },
              {
                type: "text",
                marks: [{ type: "bold" }],
                text: "bold",
              },
              { type: "text", text: " text" },
            ],
          },
        ],
      });
      const post = await postService.create({
        format: "note",
        body,
      });

      expect(post.bodyHtml).toContain("<strong>bold</strong>");
    });

    it("sets publishedAt and timestamps", async () => {
      const post = await postService.create({
        format: "note",
        body: "test",
      });

      expect(post.publishedAt).toBeGreaterThan(0);
      expect(post.createdAt).toBeGreaterThan(0);
      expect(post.updatedAt).toBeGreaterThan(0);
    });

    it("allows custom publishedAt", async () => {
      const customTime = 1706745600;
      const post = await postService.create({
        format: "note",
        body: "test",
        publishedAt: customTime,
      });

      expect(post.publishedAt).toBe(customTime);
    });

    it("creates unique UUIDv7 IDs that sort chronologically", async () => {
      const post1 = await postService.create({
        format: "note",
        body: "first",
      });
      const post2 = await postService.create({
        format: "note",
        body: "second",
      });

      expect(post1.id).not.toBe(post2.id);
      // UUIDv7 strings sort chronologically
      expect(post2.id > post1.id).toBe(true);
    });

    it("creates a quote post", async () => {
      const post = await postService.create({
        format: "quote",
        quoteText: "To be or not to be",
        body: "Shakespeare's famous line",
        url: "https://example.com/hamlet",
      });

      expect(post.format).toBe("quote");
      expect(post.quoteText).toBe("To be or not to be");
      expect(post.url).toBe("https://example.com/hamlet");
    });

    it("creates a draft post", async () => {
      const post = await postService.create({
        format: "note",
        body: "draft content",
        status: "draft",
      });

      expect(post.status).toBe("draft");
    });
  });

  describe("getById", () => {
    it("returns a post by ID", async () => {
      const created = await postService.create({
        format: "note",
        body: "test",
      });

      const found = await postService.getById(created.id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.body).toBe("test");
    });

    it("returns null for non-existent ID", async () => {
      const found = await postService.getById(9999);
      expect(found).toBeNull();
    });

    it("excludes soft-deleted posts", async () => {
      const post = await postService.create({
        format: "note",
        body: "test",
      });
      await postService.delete(post.id);

      const found = await postService.getById(post.id);
      expect(found).toBeNull();
    });
  });

  describe("getBySlug", () => {
    it("returns a post by slug", async () => {
      await postService.create({
        format: "note",
        body: "About page",
        slug: "about",
      });

      const found = await postService.getBySlug("about");
      expect(found).not.toBeNull();
      expect(found?.slug).toBe("about");
    });

    it("returns null for non-existent slug", async () => {
      const found = await postService.getBySlug("nonexistent");
      expect(found).toBeNull();
    });

    it("excludes soft-deleted posts", async () => {
      const post = await postService.create({
        format: "note",
        body: "test",
        slug: "test-page",
      });
      await postService.delete(post.id);

      const found = await postService.getBySlug("test-page");
      expect(found).toBeNull();
    });
  });

  describe("list", () => {
    it("returns empty array when no posts exist", async () => {
      const posts = await postService.list();
      expect(posts).toEqual([]);
    });

    it("returns all non-deleted posts", async () => {
      await postService.create({ format: "note", body: "first" });
      await postService.create({ format: "note", body: "second" });
      await postService.create({ format: "note", body: "third" });

      const posts = await postService.list();
      expect(posts).toHaveLength(3);
    });

    it("orders by publishedAt descending", async () => {
      await postService.create({
        format: "note",
        body: "old",
        publishedAt: 1000,
      });
      await postService.create({
        format: "note",
        body: "new",
        publishedAt: 2000,
      });

      const posts = await postService.list();
      expect(posts[0]?.body).toBe("new");
      expect(posts[1]?.body).toBe("old");
    });

    it("filters by format", async () => {
      await postService.create({ format: "note", body: "a note" });
      await postService.create({
        format: "link",
        body: "a link",
        title: "Link",
        url: "https://example.com",
      });

      const notes = await postService.list({ format: "note" });
      expect(notes).toHaveLength(1);
      expect(notes[0]?.format).toBe("note");
    });

    it("filters by status", async () => {
      await postService.create({
        format: "note",
        body: "published post",
        status: "published",
      });
      await postService.create({
        format: "note",
        body: "draft post",
        status: "draft",
      });

      const published = await postService.list({ status: "published" });
      expect(published).toHaveLength(1);
      expect(published[0]?.status).toBe("published");
    });

    it("filters by visibility", async () => {
      await postService.create({
        format: "note",
        body: "featured post",
        visibility: "featured",
      });
      await postService.create({
        format: "note",
        body: "normal post",
      });
      await postService.create({
        format: "note",
        body: "unlisted post",
        visibility: "unlisted",
      });

      const featured = await postService.list({ visibility: "featured" });
      expect(featured).toHaveLength(1);
      expect(featured[0]?.visibility).toBe("featured");
      expect(featured[0]?.body).toBe("featured post");

      const publicPosts = await postService.list({ visibility: "public" });
      expect(publicPosts).toHaveLength(1);
      expect(publicPosts[0]?.visibility).toBe("public");
      expect(publicPosts[0]?.body).toBe("normal post");

      const unlisted = await postService.list({ visibility: "unlisted" });
      expect(unlisted).toHaveLength(1);
      expect(unlisted[0]?.visibility).toBe("unlisted");
      expect(unlisted[0]?.body).toBe("unlisted post");
    });

    it("excludes unlisted posts when requested", async () => {
      await postService.create({
        format: "note",
        body: "public post",
      });
      await postService.create({
        format: "note",
        body: "unlisted post",
        visibility: "unlisted",
      });
      await postService.create({
        format: "note",
        body: "featured post",
        visibility: "featured",
      });

      const posts = await postService.list({ excludeUnlisted: true });
      expect(posts).toHaveLength(2);
      expect(posts.map((p) => p.body).sort()).toEqual([
        "featured post",
        "public post",
      ]);
    });

    it("filters by pinned", async () => {
      await postService.create({
        format: "note",
        body: "pinned post",
        pinned: true,
      });
      await postService.create({
        format: "note",
        body: "normal post",
      });

      const pinned = await postService.list({ pinned: true });
      expect(pinned).toHaveLength(1);
      expect(pinned[0]?.pinned).toBe(1);
      expect(pinned[0]?.body).toBe("pinned post");

      const notPinned = await postService.list({ pinned: false });
      expect(notPinned).toHaveLength(1);
      expect(notPinned[0]?.pinned).toBe(0);
      expect(notPinned[0]?.body).toBe("normal post");
    });

    it("excludes deleted posts by default", async () => {
      const post = await postService.create({
        format: "note",
        body: "test",
      });
      await postService.create({ format: "note", body: "kept" });
      await postService.delete(post.id);

      const posts = await postService.list();
      expect(posts).toHaveLength(1);
      expect(posts[0]?.body).toBe("kept");
    });

    it("includes deleted posts when requested", async () => {
      const post = await postService.create({
        format: "note",
        body: "test",
      });
      await postService.delete(post.id);

      const posts = await postService.list({ includeDeleted: true });
      expect(posts).toHaveLength(1);
    });

    it("supports limit", async () => {
      for (let i = 0; i < 5; i++) {
        await postService.create({ format: "note", body: `post ${i}` });
      }

      const posts = await postService.list({ limit: 2 });
      expect(posts).toHaveLength(2);
    });

    it("supports cursor pagination", async () => {
      const created = [];
      for (let i = 0; i < 5; i++) {
        created.push(
          await postService.create({
            format: "note",
            body: `post ${i}`,
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
        format: "note",
        body: "root post",
      });
      await postService.create({
        format: "note",
        body: "reply",
        replyToId: root.id,
      });

      const posts = await postService.list({ excludeReplies: true });
      expect(posts).toHaveLength(1);
      expect(posts[0]?.body).toBe("root post");
    });

    it("supports offset pagination", async () => {
      for (let i = 0; i < 5; i++) {
        await postService.create({
          format: "note",
          body: `post ${i}`,
          publishedAt: 1000 + i,
        });
      }

      // Skip the first 2 posts (newest), get 2 more
      const posts = await postService.list({ limit: 2, offset: 2 });
      expect(posts).toHaveLength(2);
      expect(posts[0]?.body).toBe("post 2");
      expect(posts[1]?.body).toBe("post 1");
    });
  });

  describe("count", () => {
    it("returns 0 when no posts exist", async () => {
      const count = await postService.count();
      expect(count).toBe(0);
    });

    it("counts all non-deleted posts", async () => {
      await postService.create({ format: "note", body: "first" });
      await postService.create({ format: "note", body: "second" });
      await postService.create({ format: "note", body: "third" });

      const count = await postService.count();
      expect(count).toBe(3);
    });

    it("filters by status", async () => {
      await postService.create({
        format: "note",
        body: "published",
        status: "published",
      });
      await postService.create({
        format: "note",
        body: "draft",
        status: "draft",
      });

      const count = await postService.count({ status: "published" });
      expect(count).toBe(1);
    });

    it("filters by visibility", async () => {
      await postService.create({
        format: "note",
        body: "featured",
        visibility: "featured",
      });
      await postService.create({ format: "note", body: "normal" });

      const count = await postService.count({ visibility: "featured" });
      expect(count).toBe(1);
    });

    it("excludes deleted posts by default", async () => {
      const post = await postService.create({
        format: "note",
        body: "to delete",
      });
      await postService.create({ format: "note", body: "keep" });
      await postService.delete(post.id);

      const count = await postService.count();
      expect(count).toBe(1);
    });

    it("excludes replies when requested", async () => {
      const root = await postService.create({
        format: "note",
        body: "root",
      });
      await postService.create({
        format: "note",
        body: "reply",
        replyToId: root.id,
      });

      const count = await postService.count({ excludeReplies: true });
      expect(count).toBe(1);
    });
  });

  describe("update", () => {
    it("updates post body", async () => {
      const post = await postService.create({
        format: "note",
        body: JSON.stringify({
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "original" }],
            },
          ],
        }),
      });

      const updatedBody = JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "updated content" }],
          },
        ],
      });
      const updated = await postService.update(post.id, {
        body: updatedBody,
      });

      expect(updated).not.toBeNull();
      expect(updated?.body).toBe(updatedBody);
      expect(updated?.bodyHtml).toContain("updated content");
    });

    it("updates post title", async () => {
      const post = await postService.create({
        format: "link",
        body: "body",
        title: "Original Title",
        url: "https://example.com",
      });

      const updated = await postService.update(post.id, {
        title: "New Title",
      });

      expect(updated?.title).toBe("New Title");
    });

    it("updates post url", async () => {
      const post = await postService.create({
        format: "link",
        body: "link post",
        url: "https://old.com",
      });

      const updated = await postService.update(post.id, {
        url: "https://new-source.com/path",
      });

      expect(updated?.url).toBe("https://new-source.com/path");
    });

    it("clears url when set to null", async () => {
      const post = await postService.create({
        format: "link",
        body: "test",
        url: "https://example.com",
      });

      const updated = await postService.update(post.id, {
        url: null,
      });

      expect(updated?.url).toBeNull();
    });

    it("returns null for non-existent post", async () => {
      const result = await postService.update(9999, { body: "test" });
      expect(result).toBeNull();
    });

    it("updates updatedAt timestamp", async () => {
      const post = await postService.create({
        format: "note",
        body: "test",
      });
      const originalUpdatedAt = post.updatedAt;

      // Small delay to ensure different timestamp
      await new Promise((r) => setTimeout(r, 1100));

      const updated = await postService.update(post.id, {
        body: "modified",
      });

      expect(updated?.updatedAt).toBeGreaterThanOrEqual(originalUpdatedAt);
    });

    it("updates visibility", async () => {
      const post = await postService.create({
        format: "note",
        body: "test",
      });

      expect(post.visibility).toBe("public");

      const updated = await postService.update(post.id, {
        visibility: "featured",
      });

      expect(updated?.visibility).toBe("featured");
    });

    it("updates pinned flag", async () => {
      const post = await postService.create({
        format: "note",
        body: "test",
      });

      expect(post.pinned).toBe(0);

      const updated = await postService.update(post.id, {
        pinned: true,
      });

      expect(updated?.pinned).toBe(1);
    });

    it("updates slug", async () => {
      const post = await postService.create({
        format: "note",
        body: "test",
        slug: "old-slug",
      });

      const updated = await postService.update(post.id, {
        slug: "new-slug",
      });

      expect(updated?.slug).toBe("new-slug");
    });

    it("updates quoteText and rating", async () => {
      const post = await postService.create({
        format: "quote",
        quoteText: "Original quote",
        rating: 3,
      });

      const updated = await postService.update(post.id, {
        quoteText: "Updated quote",
        rating: 5,
      });

      expect(updated?.quoteText).toBe("Updated quote");
      expect(updated?.rating).toBe(5);
    });
  });

  describe("delete (soft delete)", () => {
    it("soft-deletes a post", async () => {
      const post = await postService.create({
        format: "note",
        body: "test",
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
        format: "note",
        body: "root",
      });
      const reply = await postService.create({
        format: "note",
        body: "reply",
        replyToId: root.id,
      });

      await postService.delete(root.id);

      // Both root and reply should be soft-deleted
      expect(await postService.getById(root.id)).toBeNull();
      expect(await postService.getById(reply.id)).toBeNull();
    });

    it("only deletes single post when deleting a reply", async () => {
      const root = await postService.create({
        format: "note",
        body: "root",
      });
      const reply1 = await postService.create({
        format: "note",
        body: "reply1",
        replyToId: root.id,
      });
      await postService.create({
        format: "note",
        body: "reply2",
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
        format: "note",
        body: "root",
      });
      const reply = await postService.create({
        format: "note",
        body: "reply",
        replyToId: root.id,
      });

      expect(reply.threadId).toBe(root.id);
      expect(reply.replyToId).toBe(root.id);
    });

    it("inherits threadId from parent in nested replies", async () => {
      const root = await postService.create({
        format: "note",
        body: "root",
      });
      const reply1 = await postService.create({
        format: "note",
        body: "reply1",
        replyToId: root.id,
      });
      const reply2 = await postService.create({
        format: "note",
        body: "reply2",
        replyToId: reply1.id,
      });

      // Both replies point to the root's thread
      expect(reply1.threadId).toBe(root.id);
      expect(reply2.threadId).toBe(root.id);
    });

    it("inherits status from root post", async () => {
      const root = await postService.create({
        format: "note",
        body: "root",
        status: "draft",
      });
      const reply = await postService.create({
        format: "note",
        body: "reply",
        replyToId: root.id,
      });

      expect(reply.status).toBe("draft");
    });

    it("preserves draft status when reply explicitly requests it", async () => {
      const root = await postService.create({
        format: "note",
        body: "root",
        status: "published",
      });
      const reply = await postService.create({
        format: "note",
        body: "reply",
        status: "draft",
        replyToId: root.id,
      });

      expect(reply.status).toBe("draft");
      expect(reply.threadId).toBe(root.id);
    });

    it("inherits visibility from root post", async () => {
      const root = await postService.create({
        format: "note",
        body: "root",
        visibility: "featured",
      });
      const reply = await postService.create({
        format: "note",
        body: "reply",
        replyToId: root.id,
      });

      expect(reply.visibility).toBe("featured");
    });

    it("getThread returns all posts in a thread", async () => {
      const root = await postService.create({
        format: "note",
        body: "root",
      });
      await postService.create({
        format: "note",
        body: "reply1",
        replyToId: root.id,
      });
      await postService.create({
        format: "note",
        body: "reply2",
        replyToId: root.id,
      });

      const thread = await postService.getThread(root.id);
      expect(thread).toHaveLength(3);
      // Ordered by createdAt
      expect(thread[0]?.body).toBe("root");
    });

    it("getThread excludes deleted posts", async () => {
      const root = await postService.create({
        format: "note",
        body: "root",
      });
      const reply = await postService.create({
        format: "note",
        body: "reply",
        replyToId: root.id,
      });

      await postService.delete(reply.id);

      const thread = await postService.getThread(root.id);
      expect(thread).toHaveLength(1);
    });

    it("cascades status changes from root to thread", async () => {
      const root = await postService.create({
        format: "note",
        body: "root",
        status: "published",
      });
      await postService.create({
        format: "note",
        body: "reply",
        replyToId: root.id,
      });

      await postService.update(root.id, { status: "draft" });

      const thread = await postService.getThread(root.id);
      for (const post of thread) {
        expect(post.status).toBe("draft");
      }
    });

    it("cascades visibility changes from root to thread", async () => {
      const root = await postService.create({
        format: "note",
        body: "root",
      });
      await postService.create({
        format: "note",
        body: "reply",
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
        format: "note",
        body: "root",
      });
      await postService.create({
        format: "note",
        body: "reply1",
        replyToId: root.id,
      });
      await postService.create({
        format: "note",
        body: "reply2",
        replyToId: root.id,
      });

      const counts = await postService.getReplyCounts([root.id]);
      expect(counts.get(root.id)).toBe(2);
    });

    it("returns 0 (missing) for posts without replies", async () => {
      const post = await postService.create({
        format: "note",
        body: "no replies",
      });

      const counts = await postService.getReplyCounts([post.id]);
      expect(counts.get(post.id)).toBeUndefined();
    });

    it("excludes deleted replies from count", async () => {
      const root = await postService.create({
        format: "note",
        body: "root",
      });
      const reply = await postService.create({
        format: "note",
        body: "reply",
        replyToId: root.id,
      });
      await postService.create({
        format: "note",
        body: "reply2",
        replyToId: root.id,
      });

      await postService.delete(reply.id);

      const counts = await postService.getReplyCounts([root.id]);
      expect(counts.get(root.id)).toBe(1);
    });
  });
});
