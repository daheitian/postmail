import { describe, expect, it } from "vitest";
import { createTestApp } from "../../../../__tests__/helpers/app.js";
import { publicPostsApiRoutes } from "../posts.js";

describe("Public Posts API Routes", () => {
  describe("GET /api/public/posts", () => {
    it("returns published public root posts without authentication", async () => {
      const { app, services } = createTestApp({ authenticated: false });
      app.route("/api/public/posts", publicPostsApiRoutes);

      const publicRoot = await services.posts.create({
        format: "note",
        title: "Public root",
        bodyMarkdown: "visible root",
      });

      await services.posts.create({
        format: "note",
        title: "Latest hidden root",
        bodyMarkdown: "hidden from latest",
        visibility: "latest_hidden",
      });
      await services.posts.create({
        format: "note",
        title: "Private root",
        bodyMarkdown: "private root",
        visibility: "private",
      });
      await services.posts.create({
        format: "note",
        title: "Draft root",
        bodyMarkdown: "draft root",
        status: "draft",
      });
      await services.posts.create({
        format: "note",
        bodyMarkdown: "public reply",
        replyToId: publicRoot.id,
      });

      const res = await app.request("/api/public/posts");
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.nextCursor).toBeNull();
      expect(body.posts).toHaveLength(1);
      expect(body.posts[0].slug).toBe(publicRoot.slug);
      expect(body.posts[0].title).toBe("Public root");
      expect(body.posts[0].status).toBe("published");
      expect(body.posts[0].visibility).toBe("public");
      expect(body.posts[0]).not.toHaveProperty("body");
    });

    it("supports format and limit filters", async () => {
      const { app, services } = createTestApp({ authenticated: false });
      app.route("/api/public/posts", publicPostsApiRoutes);

      await services.posts.create({
        format: "note",
        title: "Note one",
        bodyMarkdown: "first note",
      });
      await services.posts.create({
        format: "note",
        title: "Note two",
        bodyMarkdown: "second note",
      });
      await services.posts.create({
        format: "link",
        title: "Example",
        url: "https://example.com",
      });

      const res = await app.request("/api/public/posts?format=note&limit=1");
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.posts).toHaveLength(1);
      expect(body.posts[0].format).toBe("note");
      expect(body.nextCursor).toBeTruthy();
    });

    it("returns markdown instead of rendered fields when content=markdown", async () => {
      const { app, services } = createTestApp({ authenticated: false });
      app.route("/api/public/posts", publicPostsApiRoutes);

      await services.posts.create({
        format: "note",
        title: "Markdown post",
        bodyMarkdown: "# Hello\n\nBody text",
      });

      const res = await app.request("/api/public/posts?content=markdown");
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.posts).toHaveLength(1);
      expect(body.posts[0].bodyMarkdown).toBe("# Hello\n\nBody text");
      expect(body.posts[0]).not.toHaveProperty("bodyHtml");
      expect(body.posts[0]).not.toHaveProperty("bodyText");
    });
  });

  describe("GET /api/public/posts/:slug", () => {
    it("returns a public post by slug without authentication", async () => {
      const { app, services } = createTestApp({ authenticated: false });
      app.route("/api/public/posts", publicPostsApiRoutes);

      const collection = await services.collections.create({
        slug: "reading",
        title: "Reading",
      });
      const post = await services.posts.create({
        format: "note",
        title: "Public post",
        bodyMarkdown: "public body",
        collectionIds: [collection.id],
      });

      const res = await app.request(`/api/public/posts/${post.slug}`);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.id).toBe(post.id);
      expect(body.slug).toBe(post.slug);
      expect(body.permalink).toBe(`/${post.slug}`);
      expect(body.collections).toEqual([
        {
          id: collection.id,
          slug: "reading",
          title: "Reading",
          url: "/reading",
        },
      ]);
      expect(body.bodyHtml).toContain("public body");
      expect(body).not.toHaveProperty("body");
    });

    it("returns markdown instead of rendered fields when content=markdown", async () => {
      const { app, services } = createTestApp({ authenticated: false });
      app.route("/api/public/posts", publicPostsApiRoutes);

      const post = await services.posts.create({
        format: "note",
        title: "Markdown detail",
        bodyMarkdown: "Line 1\n\nLine 2",
      });

      const res = await app.request(
        `/api/public/posts/${post.slug}?content=markdown`,
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.bodyMarkdown).toBe("Line 1\n\nLine 2");
      expect(body).not.toHaveProperty("bodyHtml");
      expect(body).not.toHaveProperty("bodyText");
    });

    it("returns quote attribution as sourceName/sourceUrl", async () => {
      const { app, services } = createTestApp({ authenticated: false });
      app.route("/api/public/posts", publicPostsApiRoutes);

      const post = await services.posts.create({
        format: "quote",
        title: "Marcus Aurelius",
        url: "https://example.com/meditations",
        quoteText: "What stands in the way becomes the way.",
      });

      const res = await app.request(`/api/public/posts/${post.slug}`);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.format).toBe("quote");
      expect(body.sourceName).toBe("Marcus Aurelius");
      expect(body.sourceUrl).toBe("https://example.com/meditations");
      expect(body).not.toHaveProperty("title");
      expect(body).not.toHaveProperty("url");
    });

    it("returns latest_hidden posts for direct reads", async () => {
      const { app, services } = createTestApp({ authenticated: false });
      app.route("/api/public/posts", publicPostsApiRoutes);

      const post = await services.posts.create({
        format: "note",
        title: "Hidden from latest",
        bodyMarkdown: "still public by permalink",
        visibility: "latest_hidden",
      });

      const res = await app.request(`/api/public/posts/${post.slug}`);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.visibility).toBe("latest_hidden");
      expect(body.slug).toBe(post.slug);
    });

    it("returns 404 for draft or private posts", async () => {
      const { app, services } = createTestApp({ authenticated: false });
      app.route("/api/public/posts", publicPostsApiRoutes);

      const draft = await services.posts.create({
        format: "note",
        title: "Draft",
        bodyMarkdown: "draft body",
        status: "draft",
      });
      const privatePost = await services.posts.create({
        format: "note",
        title: "Private",
        bodyMarkdown: "private body",
        visibility: "private",
      });

      await expect(
        app.request(`/api/public/posts/${draft.slug}`),
      ).resolves.toMatchObject({ status: 404 });
      await expect(
        app.request(`/api/public/posts/${privatePost.slug}`),
      ).resolves.toMatchObject({ status: 404 });
    });
  });
});
