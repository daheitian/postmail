import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDatabase } from "../../__tests__/helpers/db.js";
import { posts } from "../../db/schema.js";
import { createPostService } from "../post.js";
import type { Database } from "../../db/index.js";
import { createPathService } from "../path.js";

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
      expect(post.pinnedAt).toBeNull();
      expect(post.bodyHtml).toContain("<p>Hello world</p>");
      expect(post.deletedAt).toBeNull();
      expect(post.threadId).toBe(post.id);
    });

    it("creates a link post with commentary", async () => {
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
        visibility: "public",
        featured: true,
        pinned: true,
        slug: "my-link",
        url: "https://example.com/source",
        rating: 5,
      });

      expect(post.format).toBe("link");
      expect(post.title).toBe("My Link");
      expect(post.status).toBe("published");
      expect(post.visibility).toBe("public");
      expect(post.featuredAt).toBeTypeOf("number");
      expect(post.pinnedAt).toBeTypeOf("number");
      expect(post.slug).toBe("my-link");
      expect(post.url).toBe("https://example.com/source");
      expect(post.quoteText).toBeNull();
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
        bodyMarkdown: "test",
      });

      expect(post.publishedAt).toBeGreaterThan(0);
      expect(post.createdAt).toBeGreaterThan(0);
      expect(post.updatedAt).toBeGreaterThan(0);
    });

    it("allows custom publishedAt", async () => {
      const customTime = 1706745600;
      const post = await postService.create({
        format: "note",
        bodyMarkdown: "test",
        publishedAt: customTime,
      });

      expect(post.publishedAt).toBe(customTime);
    });

    it("creates unique UUIDv7 IDs that sort chronologically", async () => {
      const post1 = await postService.create({
        format: "note",
        bodyMarkdown: "first",
      });
      const post2 = await postService.create({
        format: "note",
        bodyMarkdown: "second",
      });

      expect(post1.id).not.toBe(post2.id);
      // UUIDv7 strings sort chronologically
      expect(post2.id > post1.id).toBe(true);
    });

    it("creates a quote post", async () => {
      const post = await postService.create({
        format: "quote",
        quoteText: "To be or not to be",
        bodyMarkdown: "Shakespeare's famous line",
        url: "https://example.com/hamlet",
      });

      expect(post.format).toBe("quote");
      expect(post.quoteText).toBe("To be or not to be");
      expect(post.url).toBe("https://example.com/hamlet");
    });

    it("creates a draft post", async () => {
      const post = await postService.create({
        format: "note",
        bodyMarkdown: "draft content",
        status: "draft",
      });

      expect(post.status).toBe("draft");
      expect(post.publishedAt).toBeNull();
    });

    it("rejects ratings outside the database range", async () => {
      await expect(
        postService.create({
          format: "note",
          bodyMarkdown: "test",
          rating: 6,
        }),
      ).rejects.toThrow();
    });

    it("rejects draft posts with an explicit publish time", async () => {
      await expect(
        postService.create({
          format: "note",
          bodyMarkdown: "draft content",
          status: "draft",
          publishedAt: 1706745600,
        }),
      ).rejects.toThrow("Drafts can't set a publish time.");
    });

    it("rejects note posts with a URL", async () => {
      await expect(
        postService.create({
          format: "note",
          url: "https://example.com",
        }),
      ).rejects.toThrow("Notes can't include a URL.");
    });

    it("rejects link posts without a URL", async () => {
      await expect(
        postService.create({
          format: "link",
          bodyMarkdown: "commentary",
        }),
      ).rejects.toThrow("Link posts need a URL.");
    });

    it("rejects link posts with quoted text", async () => {
      await expect(
        postService.create({
          format: "link",
          url: "https://example.com",
          quoteText: "A notable quote",
        }),
      ).rejects.toThrow("Link posts can't include quoted text.");
    });

    it("rejects quote posts without quoted text", async () => {
      await expect(
        postService.create({
          format: "quote",
          bodyMarkdown: "commentary",
        }),
      ).rejects.toThrow("Quote posts need quoted text.");
    });

    it("rejects replies to missing posts", async () => {
      await expect(
        postService.create({
          format: "note",
          bodyMarkdown: "reply",
          replyToId: "00000000-0000-0000-0000-000000009999",
        }),
      ).rejects.toThrow("Parent post not found");
    });

    it("rolls back the post insert when slug persistence fails inside the batch", async () => {
      await postService.create({
        format: "note",
        bodyMarkdown: "existing",
        slug: "race-condition",
      });

      const paths = createPathService(db);
      const raceyPaths = {
        ...paths,
        isPathAvailable: async () => true,
      };
      const raceyPostService = createPostService(
        db,
        { slugIdLength: 5 },
        raceyPaths,
      );

      await expect(
        raceyPostService.create({
          format: "note",
          bodyMarkdown: "test",
          slug: "race-condition",
        }),
      ).rejects.toThrow('Slug "race-condition" is already in use');

      const rows = await db.select({ id: posts.id }).from(posts);
      expect(rows).toHaveLength(1);
    });
  });

  describe("getById", () => {
    it("returns a post by ID", async () => {
      const created = await postService.create({
        format: "note",
        bodyMarkdown: "test",
      });

      const found = await postService.getById(created.id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.bodyText).toBe("test");
    });

    it("returns null for non-existent ID", async () => {
      const found = await postService.getById(9999);
      expect(found).toBeNull();
    });

    it("excludes soft-deleted posts", async () => {
      const post = await postService.create({
        format: "note",
        bodyMarkdown: "test",
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
        bodyMarkdown: "About page",
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
        bodyMarkdown: "test",
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
      await postService.create({ format: "note", bodyMarkdown: "first" });
      await postService.create({ format: "note", bodyMarkdown: "second" });
      await postService.create({ format: "note", bodyMarkdown: "third" });

      const posts = await postService.list();
      expect(posts).toHaveLength(3);
    });

    it("orders by publishedAt descending", async () => {
      await postService.create({
        format: "note",
        bodyMarkdown: "old",
        publishedAt: 1000,
      });
      await postService.create({
        format: "note",
        bodyMarkdown: "new",
        publishedAt: 2000,
      });

      const posts = await postService.list();
      expect(posts[0]?.bodyText).toBe("new");
      expect(posts[1]?.bodyText).toBe("old");
    });

    it("orders drafts by updatedAt descending", async () => {
      const older = await postService.create({
        format: "note",
        bodyMarkdown: "older draft",
        status: "draft",
      });

      await new Promise((r) => setTimeout(r, 1100));

      const newer = await postService.create({
        format: "note",
        bodyMarkdown: "newer draft",
        status: "draft",
      });

      await new Promise((r) => setTimeout(r, 1100));
      await postService.update(older.id, {
        bodyMarkdown: "older draft edited",
      });

      const drafts = await postService.list({ status: "draft" });
      expect(drafts[0]?.id).toBe(older.id);
      expect(drafts[1]?.id).toBe(newer.id);
    });

    it("filters by format", async () => {
      await postService.create({ format: "note", bodyMarkdown: "a note" });
      await postService.create({
        format: "link",
        bodyMarkdown: "a link",
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
        bodyMarkdown: "published post",
        status: "published",
      });
      await postService.create({
        format: "note",
        bodyMarkdown: "draft post",
        status: "draft",
      });

      const published = await postService.list({ status: "published" });
      expect(published).toHaveLength(1);
      expect(published[0]?.status).toBe("published");
    });

    it("filters by visibility", async () => {
      await postService.create({
        format: "note",
        bodyMarkdown: "public post",
      });
      await postService.create({
        format: "note",
        bodyMarkdown: "unlisted post",
        visibility: "unlisted",
      });
      await postService.create({
        format: "note",
        bodyMarkdown: "private post",
        visibility: "private",
      });

      const publicPosts = await postService.list({ visibility: "public" });
      expect(publicPosts).toHaveLength(1);
      expect(publicPosts[0]?.visibility).toBe("public");
      expect(publicPosts[0]?.bodyText).toBe("public post");

      const unlisted = await postService.list({ visibility: "unlisted" });
      expect(unlisted).toHaveLength(1);
      expect(unlisted[0]?.visibility).toBe("unlisted");
      expect(unlisted[0]?.bodyText).toBe("unlisted post");

      const privatePosts = await postService.list({ visibility: "private" });
      expect(privatePosts).toHaveLength(1);
      expect(privatePosts[0]?.visibility).toBe("private");
      expect(privatePosts[0]?.bodyText).toBe("private post");
    });

    it("filters by featured", async () => {
      await postService.create({
        format: "note",
        bodyMarkdown: "featured post",
        featured: true,
      });
      await postService.create({
        format: "note",
        bodyMarkdown: "normal post",
      });

      const featured = await postService.list({ featured: true });
      expect(featured).toHaveLength(1);
      expect(featured[0]?.featuredAt).toBeTypeOf("number");
      expect(featured[0]?.bodyText).toBe("featured post");

      const notFeatured = await postService.list({ featured: false });
      expect(notFeatured).toHaveLength(1);
      expect(notFeatured[0]?.featuredAt).toBeNull();
      expect(notFeatured[0]?.bodyText).toBe("normal post");
    });

    it("excludes unlisted posts when requested", async () => {
      await postService.create({
        format: "note",
        bodyMarkdown: "public post",
      });
      await postService.create({
        format: "note",
        bodyMarkdown: "unlisted post",
        visibility: "unlisted",
      });
      await postService.create({
        format: "note",
        bodyMarkdown: "featured post",
        featured: true,
      });

      const posts = await postService.list({ excludeUnlisted: true });
      expect(posts).toHaveLength(2);
      // Featured posts have visibility "public", so both public and featured appear
      expect(posts.map((p) => p.bodyText).sort()).toEqual([
        "featured post",
        "public post",
      ]);
    });

    it("excludes private posts when excludePrivate is set", async () => {
      await postService.create({
        format: "note",
        bodyMarkdown: "public post",
      });
      await postService.create({
        format: "note",
        bodyMarkdown: "private post",
        visibility: "private",
      });
      await postService.create({
        format: "note",
        bodyMarkdown: "featured post",
        featured: true,
      });

      const posts = await postService.list({ excludePrivate: true });
      expect(posts).toHaveLength(2);
      // Featured posts have visibility "public", so both public and featured appear
      expect(posts.map((p) => p.bodyText).sort()).toEqual([
        "featured post",
        "public post",
      ]);
    });

    it("filters by pinned", async () => {
      await postService.create({
        format: "note",
        bodyMarkdown: "pinned post",
        pinned: true,
      });
      await postService.create({
        format: "note",
        bodyMarkdown: "normal post",
      });

      const pinned = await postService.list({ pinned: true });
      expect(pinned).toHaveLength(1);
      expect(pinned[0]?.pinnedAt).toBeTypeOf("number");
      expect(pinned[0]?.bodyText).toBe("pinned post");

      const notPinned = await postService.list({ pinned: false });
      expect(notPinned).toHaveLength(1);
      expect(notPinned[0]?.pinnedAt).toBeNull();
      expect(notPinned[0]?.bodyText).toBe("normal post");
    });

    it("excludes deleted posts by default", async () => {
      const post = await postService.create({
        format: "note",
        bodyMarkdown: "test",
      });
      await postService.create({ format: "note", bodyMarkdown: "kept" });
      await postService.delete(post.id);

      const posts = await postService.list();
      expect(posts).toHaveLength(1);
      expect(posts[0]?.bodyText).toBe("kept");
    });

    it("includes deleted posts when requested", async () => {
      const post = await postService.create({
        format: "note",
        bodyMarkdown: "test",
      });
      await postService.delete(post.id);

      const posts = await postService.list({ includeDeleted: true });
      expect(posts).toHaveLength(1);
    });

    it("supports limit", async () => {
      for (let i = 0; i < 5; i++) {
        await postService.create({ format: "note", bodyMarkdown: `post ${i}` });
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
            bodyMarkdown: `post ${i}`,
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
        bodyMarkdown: "root post",
      });
      await postService.create({
        format: "note",
        bodyMarkdown: "reply",
        replyToId: root.id,
      });

      const posts = await postService.list({ excludeReplies: true });
      expect(posts).toHaveLength(1);
      expect(posts[0]?.bodyText).toBe("root post");
    });

    it("supports offset pagination", async () => {
      for (let i = 0; i < 5; i++) {
        await postService.create({
          format: "note",
          bodyMarkdown: `post ${i}`,
          publishedAt: 1000 + i,
        });
      }

      // Skip the first 2 posts (newest), get 2 more
      const posts = await postService.list({ limit: 2, offset: 2 });
      expect(posts).toHaveLength(2);
      expect(posts[0]?.bodyText).toBe("post 2");
      expect(posts[1]?.bodyText).toBe("post 1");
    });
  });

  describe("count", () => {
    it("returns 0 when no posts exist", async () => {
      const count = await postService.count();
      expect(count).toBe(0);
    });

    it("counts all non-deleted posts", async () => {
      await postService.create({ format: "note", bodyMarkdown: "first" });
      await postService.create({ format: "note", bodyMarkdown: "second" });
      await postService.create({ format: "note", bodyMarkdown: "third" });

      const count = await postService.count();
      expect(count).toBe(3);
    });

    it("filters by status", async () => {
      await postService.create({
        format: "note",
        bodyMarkdown: "published",
        status: "published",
      });
      await postService.create({
        format: "note",
        bodyMarkdown: "draft",
        status: "draft",
      });

      const count = await postService.count({ status: "published" });
      expect(count).toBe(1);
    });

    it("filters by visibility", async () => {
      await postService.create({
        format: "note",
        bodyMarkdown: "unlisted",
        visibility: "unlisted",
      });
      await postService.create({ format: "note", bodyMarkdown: "normal" });

      const count = await postService.count({ visibility: "unlisted" });
      expect(count).toBe(1);
    });

    it("filters by featured", async () => {
      await postService.create({
        format: "note",
        bodyMarkdown: "featured",
        featured: true,
      });
      await postService.create({ format: "note", bodyMarkdown: "normal" });

      const featuredCount = await postService.count({ featured: true });
      expect(featuredCount).toBe(1);

      const notFeaturedCount = await postService.count({ featured: false });
      expect(notFeaturedCount).toBe(1);
    });

    it("excludes deleted posts by default", async () => {
      const post = await postService.create({
        format: "note",
        bodyMarkdown: "to delete",
      });
      await postService.create({ format: "note", bodyMarkdown: "keep" });
      await postService.delete(post.id);

      const count = await postService.count();
      expect(count).toBe(1);
    });

    it("excludes replies when requested", async () => {
      const root = await postService.create({
        format: "note",
        bodyMarkdown: "root",
      });
      await postService.create({
        format: "note",
        bodyMarkdown: "reply",
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
        bodyMarkdown: "body",
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
        bodyMarkdown: "link post",
        url: "https://old.com",
      });

      const updated = await postService.update(post.id, {
        url: "https://new-source.com/path",
      });

      expect(updated?.url).toBe("https://new-source.com/path");
    });

    it("rejects clearing url from a link post", async () => {
      const post = await postService.create({
        format: "link",
        bodyMarkdown: "test",
        url: "https://example.com",
      });

      await expect(
        postService.update(post.id, {
          url: null,
        }),
      ).rejects.toThrow("Link posts need a URL.");
    });

    it("returns null for non-existent post", async () => {
      const result = await postService.update(9999, { bodyMarkdown: "test" });
      expect(result).toBeNull();
    });

    it("updates updatedAt timestamp", async () => {
      const post = await postService.create({
        format: "note",
        bodyMarkdown: "test",
      });
      const originalUpdatedAt = post.updatedAt;

      // Small delay to ensure different timestamp
      await new Promise((r) => setTimeout(r, 1100));

      const updated = await postService.update(post.id, {
        bodyMarkdown: "modified",
      });

      expect(updated?.updatedAt).toBeGreaterThanOrEqual(originalUpdatedAt);
    });

    it("sets publishedAt when publishing a draft", async () => {
      const post = await postService.create({
        format: "note",
        bodyMarkdown: "draft",
        status: "draft",
      });

      expect(post.publishedAt).toBeNull();

      await new Promise((r) => setTimeout(r, 1100));

      const published = await postService.update(post.id, {
        status: "published",
      });

      expect(published?.status).toBe("published");
      expect(published?.publishedAt).toBeTypeOf("number");
      expect((published?.publishedAt ?? 0) >= post.updatedAt).toBe(true);
    });

    it("clears publishedAt when converting a published post back to draft", async () => {
      const post = await postService.create({
        format: "note",
        bodyMarkdown: "published",
        publishedAt: 1706745600,
      });

      const draft = await postService.update(post.id, {
        status: "draft",
      });

      expect(draft?.status).toBe("draft");
      expect(draft?.publishedAt).toBeNull();
    });

    it("rejects setting publishedAt while remaining a draft", async () => {
      const post = await postService.create({
        format: "note",
        bodyMarkdown: "draft",
        status: "draft",
      });

      await expect(
        postService.update(post.id, {
          publishedAt: 1706745600,
        }),
      ).rejects.toThrow("Drafts can't set a publish time.");
    });

    it("updates visibility", async () => {
      const post = await postService.create({
        format: "note",
        bodyMarkdown: "test",
      });

      expect(post.visibility).toBe("public");

      const updated = await postService.update(post.id, {
        visibility: "unlisted",
      });

      expect(updated?.visibility).toBe("unlisted");
    });

    it("updates featured flag", async () => {
      const post = await postService.create({
        format: "note",
        bodyMarkdown: "test",
      });

      expect(post.featuredAt).toBeNull();

      const featured = await postService.update(post.id, {
        featured: true,
      });

      expect(featured?.featuredAt).toBeTypeOf("number");

      const unfeatured = await postService.update(post.id, {
        featured: false,
      });

      expect(unfeatured?.featuredAt).toBeNull();
    });

    it("updates pinned flag", async () => {
      const post = await postService.create({
        format: "note",
        bodyMarkdown: "test",
      });

      expect(post.pinnedAt).toBeNull();

      const updated = await postService.update(post.id, {
        pinned: true,
      });

      expect(updated?.pinnedAt).toBeTypeOf("number");
    });

    it("updates slug", async () => {
      const post = await postService.create({
        format: "note",
        bodyMarkdown: "test",
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

    it("rejects switching a note to link without adding a URL", async () => {
      const post = await postService.create({
        format: "note",
        bodyMarkdown: "test",
      });

      await expect(
        postService.update(post.id, {
          format: "link",
        }),
      ).rejects.toThrow("Link posts need a URL.");
    });

    it("rejects switching a link to note without clearing the URL", async () => {
      const post = await postService.create({
        format: "link",
        bodyMarkdown: "test",
        url: "https://example.com",
      });

      await expect(
        postService.update(post.id, {
          format: "note",
        }),
      ).rejects.toThrow("Notes can't include a URL.");
    });
  });

  describe("delete (soft delete)", () => {
    it("soft-deletes a post", async () => {
      const post = await postService.create({
        format: "note",
        bodyMarkdown: "test",
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
        bodyMarkdown: "root",
      });
      const reply = await postService.create({
        format: "note",
        bodyMarkdown: "reply",
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
        bodyMarkdown: "root",
      });
      const reply1 = await postService.create({
        format: "note",
        bodyMarkdown: "reply1",
        replyToId: root.id,
      });
      await postService.create({
        format: "note",
        bodyMarkdown: "reply2",
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
        bodyMarkdown: "root",
      });
      const reply = await postService.create({
        format: "note",
        bodyMarkdown: "reply",
        replyToId: root.id,
      });

      expect(reply.threadId).toBe(root.id);
      expect(reply.replyToId).toBe(root.id);
    });

    it("inherits threadId from parent in nested replies", async () => {
      const root = await postService.create({
        format: "note",
        bodyMarkdown: "root",
      });
      const reply1 = await postService.create({
        format: "note",
        bodyMarkdown: "reply1",
        replyToId: root.id,
      });
      const reply2 = await postService.create({
        format: "note",
        bodyMarkdown: "reply2",
        replyToId: reply1.id,
      });

      // Both replies point to the root's thread
      expect(reply1.threadId).toBe(root.id);
      expect(reply2.threadId).toBe(root.id);
    });

    it("inherits status from root post", async () => {
      const root = await postService.create({
        format: "note",
        bodyMarkdown: "root",
        status: "draft",
      });
      const reply = await postService.create({
        format: "note",
        bodyMarkdown: "reply",
        replyToId: root.id,
      });

      expect(reply.status).toBe("draft");
    });

    it("preserves draft status when reply explicitly requests it", async () => {
      const root = await postService.create({
        format: "note",
        bodyMarkdown: "root",
        status: "published",
      });
      const reply = await postService.create({
        format: "note",
        bodyMarkdown: "reply",
        status: "draft",
        replyToId: root.id,
      });

      expect(reply.status).toBe("draft");
      expect(reply.threadId).toBe(root.id);
    });

    it("inherits visibility from root post", async () => {
      const root = await postService.create({
        format: "note",
        bodyMarkdown: "root",
        visibility: "unlisted",
      });
      const reply = await postService.create({
        format: "note",
        bodyMarkdown: "reply",
        replyToId: root.id,
      });

      expect(reply.visibility).toBe("unlisted");
    });

    it("stores reply visibility as null and resolves it from the root", async () => {
      const root = await postService.create({
        format: "note",
        bodyMarkdown: "root",
        visibility: "private",
      });
      const reply = await postService.create({
        format: "note",
        bodyMarkdown: "reply",
        replyToId: root.id,
      });

      const rows = await db
        .select({ visibility: posts.visibility })
        .from(posts)
        .where(eq(posts.id, reply.id))
        .limit(1);

      expect(rows[0]?.visibility).toBeNull();
      expect(reply.visibility).toBe("private");
    });

    it("does not inherit featuredAt from root post", async () => {
      const root = await postService.create({
        format: "note",
        bodyMarkdown: "root",
        featured: true,
      });

      expect(root.featuredAt).toBeTypeOf("number");

      const reply = await postService.create({
        format: "note",
        bodyMarkdown: "reply",
        replyToId: root.id,
      });

      // featuredAt is an independent property — replies should NOT inherit it
      expect(reply.featuredAt).toBeNull();
    });

    it("getThread returns all posts in a thread", async () => {
      const root = await postService.create({
        format: "note",
        bodyMarkdown: "root",
      });
      await postService.create({
        format: "note",
        bodyMarkdown: "reply1",
        replyToId: root.id,
      });
      await postService.create({
        format: "note",
        bodyMarkdown: "reply2",
        replyToId: root.id,
      });

      const thread = await postService.getThread(root.id);
      expect(thread).toHaveLength(3);
      // Ordered by createdAt
      expect(thread[0]?.bodyText).toBe("root");
    });

    it("getThread excludes deleted posts", async () => {
      const root = await postService.create({
        format: "note",
        bodyMarkdown: "root",
      });
      const reply = await postService.create({
        format: "note",
        bodyMarkdown: "reply",
        replyToId: root.id,
      });

      await postService.delete(reply.id);

      const thread = await postService.getThread(root.id);
      expect(thread).toHaveLength(1);
    });

    it("cascades status changes from root to thread", async () => {
      const root = await postService.create({
        format: "note",
        bodyMarkdown: "root",
        status: "published",
      });
      await postService.create({
        format: "note",
        bodyMarkdown: "reply",
        replyToId: root.id,
      });

      await postService.update(root.id, { status: "draft" });

      const thread = await postService.getThread(root.id);
      for (const post of thread) {
        expect(post.status).toBe("draft");
        expect(post.publishedAt).toBeNull();
      }
    });

    it("publishing a draft thread stamps publishedAt on all posts", async () => {
      const root = await postService.create({
        format: "note",
        bodyMarkdown: "root",
        status: "draft",
      });
      await postService.create({
        format: "note",
        bodyMarkdown: "reply",
        replyToId: root.id,
      });

      await new Promise((r) => setTimeout(r, 1100));
      await postService.update(root.id, { status: "published" });

      const thread = await postService.getThread(root.id);
      for (const post of thread) {
        expect(post.status).toBe("published");
        expect(post.publishedAt).toBeTypeOf("number");
      }
    });

    it("cascades visibility changes from root to thread", async () => {
      const root = await postService.create({
        format: "note",
        bodyMarkdown: "root",
      });
      await postService.create({
        format: "note",
        bodyMarkdown: "reply",
        replyToId: root.id,
      });

      await postService.update(root.id, { visibility: "unlisted" });

      const thread = await postService.getThread(root.id);
      for (const post of thread) {
        expect(post.visibility).toBe("unlisted");
      }
    });

    it("filters replies by the root post visibility", async () => {
      const unlistedRoot = await postService.create({
        format: "note",
        bodyMarkdown: "root",
        visibility: "unlisted",
      });
      const unlistedReply = await postService.create({
        format: "note",
        bodyMarkdown: "reply",
        replyToId: unlistedRoot.id,
      });
      await postService.create({
        format: "note",
        bodyMarkdown: "public root",
      });

      const postsByVisibility = await postService.list({
        visibility: "unlisted",
      });

      expect(postsByVisibility.map((post) => post.id)).toEqual([
        unlistedReply.id,
        unlistedRoot.id,
      ]);
    });

    it("rejects visibility changes on thread replies", async () => {
      const root = await postService.create({
        format: "note",
        bodyMarkdown: "root",
      });
      const reply = await postService.create({
        format: "note",
        bodyMarkdown: "reply",
        replyToId: root.id,
      });

      await expect(
        postService.update(reply.id, { visibility: "unlisted" }),
      ).rejects.toThrow(
        "Cannot change visibility of a thread reply. Update the root post instead.",
      );
    });

    it("allows featuring a thread reply", async () => {
      const root = await postService.create({
        format: "note",
        bodyMarkdown: "root",
      });
      const reply = await postService.create({
        format: "note",
        bodyMarkdown: "reply",
        replyToId: root.id,
      });

      // Featured is independent of visibility — replies can be featured
      const updated = await postService.update(reply.id, { featured: true });
      expect(updated?.featuredAt).toBeTypeOf("number");

      const unfeatured = await postService.update(reply.id, {
        featured: false,
      });
      expect(unfeatured?.featuredAt).toBeNull();
    });

    it("rejects creating a pinned thread reply", async () => {
      const root = await postService.create({
        format: "note",
        bodyMarkdown: "root",
      });

      await expect(
        postService.create({
          format: "note",
          bodyMarkdown: "reply",
          replyToId: root.id,
          pinned: true,
        }),
      ).rejects.toThrow(
        "Cannot pin a thread reply. Pin the root post instead.",
      );
    });

    it("rejects pinning a thread reply", async () => {
      const root = await postService.create({
        format: "note",
        bodyMarkdown: "root",
      });
      const reply = await postService.create({
        format: "note",
        bodyMarkdown: "reply",
        replyToId: root.id,
      });

      await expect(
        postService.update(reply.id, { pinned: true }),
      ).rejects.toThrow(
        "Cannot pin a thread reply. Pin the root post instead.",
      );
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
        bodyMarkdown: "root",
      });
      await postService.create({
        format: "note",
        bodyMarkdown: "reply1",
        replyToId: root.id,
      });
      await postService.create({
        format: "note",
        bodyMarkdown: "reply2",
        replyToId: root.id,
      });

      const counts = await postService.getReplyCounts([root.id]);
      expect(counts.get(root.id)).toBe(2);
    });

    it("returns 0 (missing) for posts without replies", async () => {
      const post = await postService.create({
        format: "note",
        bodyMarkdown: "no replies",
      });

      const counts = await postService.getReplyCounts([post.id]);
      expect(counts.get(post.id)).toBeUndefined();
    });

    it("excludes deleted replies from count", async () => {
      const root = await postService.create({
        format: "note",
        bodyMarkdown: "root",
      });
      const reply = await postService.create({
        format: "note",
        bodyMarkdown: "reply",
        replyToId: root.id,
      });
      await postService.create({
        format: "note",
        bodyMarkdown: "reply2",
        replyToId: root.id,
      });

      await postService.delete(reply.id);

      const counts = await postService.getReplyCounts([root.id]);
      expect(counts.get(root.id)).toBe(1);
    });

    it("excludes draft replies from count", async () => {
      const root = await postService.create({
        format: "note",
        bodyMarkdown: "root",
      });
      await postService.create({
        format: "note",
        bodyMarkdown: "published reply",
        replyToId: root.id,
      });
      await postService.create({
        format: "note",
        bodyMarkdown: "draft reply",
        replyToId: root.id,
        status: "draft",
      });

      const counts = await postService.getReplyCounts([root.id]);
      expect(counts.get(root.id)).toBe(1);
    });
  });

  describe("lastActivityAt (thread bump-to-top)", () => {
    it("sets lastActivityAt equal to publishedAt for non-thread posts", async () => {
      const post = await postService.create({
        format: "note",
        bodyMarkdown: "standalone",
        publishedAt: 5000,
      });

      expect(post.lastActivityAt).toBe(5000);
    });

    it("updates root lastActivityAt when a reply is created", async () => {
      const root = await postService.create({
        format: "note",
        bodyMarkdown: "root",
        publishedAt: 1000,
      });
      expect(root.lastActivityAt).toBe(1000);

      await postService.create({
        format: "note",
        bodyMarkdown: "reply",
        replyToId: root.id,
        publishedAt: 9000,
      });

      const updatedRoot = await postService.getById(root.id);
      expect(updatedRoot?.lastActivityAt).toBe(9000);
    });

    it("list returns thread root bumped to top after reply", async () => {
      const oldPost = await postService.create({
        format: "note",
        bodyMarkdown: "old thread root",
        publishedAt: 1000,
      });
      await postService.create({
        format: "note",
        bodyMarkdown: "newer standalone",
        publishedAt: 5000,
      });

      // Reply to old post with a newer timestamp — should bump it above standalone
      await postService.create({
        format: "note",
        bodyMarkdown: "reply",
        replyToId: oldPost.id,
        publishedAt: 9000,
      });

      const listed = await postService.list({ excludeReplies: true });
      expect(listed[0]?.bodyText).toBe("old thread root");
      expect(listed[1]?.bodyText).toBe("newer standalone");
    });

    it("recalculates root lastActivityAt when a reply is deleted", async () => {
      const root = await postService.create({
        format: "note",
        bodyMarkdown: "root",
        publishedAt: 1000,
      });
      const reply1 = await postService.create({
        format: "note",
        bodyMarkdown: "reply1",
        replyToId: root.id,
        publishedAt: 3000,
      });
      await postService.create({
        format: "note",
        bodyMarkdown: "reply2",
        replyToId: root.id,
        publishedAt: 5000,
      });

      // Root should be bumped to latest reply
      let updatedRoot = await postService.getById(root.id);
      expect(updatedRoot?.lastActivityAt).toBe(5000);

      // Delete the latest reply — root should fall back to reply1's time
      const reply2 = (await postService.list({ threadId: root.id })).find(
        (p) => p.bodyText === "reply2",
      );
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- test setup guarantees reply2 exists
      await postService.delete(reply2!.id);

      updatedRoot = await postService.getById(root.id);
      expect(updatedRoot?.lastActivityAt).toBe(3000);

      // Delete the remaining reply — root should fall back to its own publishedAt
      await postService.delete(reply1.id);

      updatedRoot = await postService.getById(root.id);
      expect(updatedRoot?.lastActivityAt).toBe(1000);
    });
  });
});
