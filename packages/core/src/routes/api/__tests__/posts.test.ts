import { describe, it, expect } from "vitest";
import { createTestApp } from "../../../__tests__/helpers/app.js";
import { postsApiRoutes } from "../posts.js";
import * as sqid from "../../../lib/sqid.js";

describe("Posts API Routes", () => {
  describe("GET /api/posts", () => {
    it("returns empty list when no posts exist", async () => {
      const { app } = createTestApp();
      app.route("/api/posts", postsApiRoutes);

      const res = await app.request("/api/posts");
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.posts).toEqual([]);
      expect(body.nextCursor).toBeNull();
    });

    it("returns posts with sqids", async () => {
      const { app, services } = createTestApp();
      app.route("/api/posts", postsApiRoutes);

      await services.posts.create({
        format: "note",
        body: "Hello world",
      });

      const res = await app.request("/api/posts");
      const body = await res.json();

      expect(body.posts).toHaveLength(1);
      expect(body.posts[0].body).toBe("Hello world");
      expect(body.posts[0].sqid).toBeTruthy();
    });

    it("includes mediaAttachments in list response", async () => {
      const { app, services } = createTestApp();
      app.route("/api/posts", postsApiRoutes);

      const post = await services.posts.create({
        format: "note",
        body: "with media",
      });

      const media = await services.media.create({
        filename: "test.jpg",
        originalName: "test.jpg",
        mimeType: "image/jpeg",
        size: 1024,
        storageKey: "media/2025/01/test.jpg",
        width: 800,
        height: 600,
      });

      await services.media.attachToPost(post.id, [media.id]);

      const res = await app.request("/api/posts");
      const body = await res.json();

      expect(body.posts[0].mediaAttachments).toHaveLength(1);
      expect(body.posts[0].mediaAttachments[0].id).toBe(media.id);
      expect(body.posts[0].mediaAttachments[0].mimeType).toBe("image/jpeg");
      expect(body.posts[0].mediaAttachments[0].url).toBeTruthy();
      expect(body.posts[0].mediaAttachments[0].previewUrl).toBeTruthy();
      expect(body.posts[0].mediaAttachments[0].position).toBe(0);
    });

    it("filters by status", async () => {
      const { app, services } = createTestApp();
      app.route("/api/posts", postsApiRoutes);

      await services.posts.create({
        format: "note",
        body: "published post",
      });
      await services.posts.create({
        format: "note",
        body: "draft post",
        status: "draft",
      });

      const res = await app.request("/api/posts?status=draft");
      const body = await res.json();

      expect(body.posts).toHaveLength(1);
      expect(body.posts[0].status).toBe("draft");
    });

    it("supports limit parameter", async () => {
      const { app, services } = createTestApp();
      app.route("/api/posts", postsApiRoutes);

      for (let i = 0; i < 5; i++) {
        await services.posts.create({
          format: "note",
          body: `post ${i}`,
        });
      }

      const res = await app.request("/api/posts?limit=2");
      const body = await res.json();

      expect(body.posts).toHaveLength(2);
      expect(body.nextCursor).toBeTruthy();
    });
  });

  describe("GET /api/posts/:id", () => {
    it("returns a post by sqid", async () => {
      const { app, services } = createTestApp();
      app.route("/api/posts", postsApiRoutes);

      const post = await services.posts.create({
        format: "note",
        body: "test post",
      });
      const id = sqid.encode(post.id);

      const res = await app.request(`/api/posts/${id}`);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.body).toBe("test post");
      expect(body.sqid).toBe(id);
    });

    it("includes mediaAttachments in single post response", async () => {
      const { app, services } = createTestApp();
      app.route("/api/posts", postsApiRoutes);

      const post = await services.posts.create({
        format: "note",
        body: "with media",
      });

      const media = await services.media.create({
        filename: "test.jpg",
        originalName: "test.jpg",
        mimeType: "image/jpeg",
        size: 1024,
        storageKey: "media/2025/01/test.jpg",
      });

      await services.media.attachToPost(post.id, [media.id]);

      const res = await app.request(`/api/posts/${sqid.encode(post.id)}`);
      const body = await res.json();

      expect(body.mediaAttachments).toHaveLength(1);
      expect(body.mediaAttachments[0].id).toBe(media.id);
    });

    it("returns 400 for invalid sqid", async () => {
      const { app } = createTestApp();
      app.route("/api/posts", postsApiRoutes);

      const res = await app.request("/api/posts/!!invalid!!");
      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent post", async () => {
      const { app } = createTestApp();
      app.route("/api/posts", postsApiRoutes);

      const res = await app.request(`/api/posts/${sqid.encode(9999)}`);
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/posts", () => {
    it("returns 401 when not authenticated", async () => {
      const { app } = createTestApp({ authenticated: false });
      app.route("/api/posts", postsApiRoutes);

      const res = await app.request("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: "note",
          body: "test",
        }),
      });

      expect(res.status).toBe(401);
    });

    it("creates a post when authenticated", async () => {
      const { app } = createTestApp({ authenticated: true });
      app.route("/api/posts", postsApiRoutes);

      const res = await app.request("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: "note",
          body: "Hello from API",
        }),
      });

      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.body).toBe("Hello from API");
      expect(body.sqid).toBeTruthy();
      expect(body.mediaAttachments).toEqual([]);
    });

    it("creates a post with mediaIds and attaches them", async () => {
      const { app, services } = createTestApp({ authenticated: true });
      app.route("/api/posts", postsApiRoutes);

      const m1 = await services.media.create({
        filename: "a.jpg",
        originalName: "a.jpg",
        mimeType: "image/jpeg",
        size: 1024,
        storageKey: "media/2025/01/a.jpg",
      });
      const m2 = await services.media.create({
        filename: "b.jpg",
        originalName: "b.jpg",
        mimeType: "image/jpeg",
        size: 2048,
        storageKey: "media/2025/01/b.jpg",
      });

      const res = await app.request("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: "note",
          body: "with images",
          mediaIds: [m1.id, m2.id],
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.mediaAttachments).toHaveLength(2);
      expect(body.mediaAttachments[0].id).toBe(m1.id);
      expect(body.mediaAttachments[0].position).toBe(0);
      expect(body.mediaAttachments[1].id).toBe(m2.id);
      expect(body.mediaAttachments[1].position).toBe(1);
    });

    it("returns 400 for invalid media IDs", async () => {
      const { app } = createTestApp({ authenticated: true });
      app.route("/api/posts", postsApiRoutes);

      const res = await app.request("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: "note",
          body: "test",
          mediaIds: ["nonexistent-id"],
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("media IDs are invalid");
    });

    it("returns 400 for invalid body", async () => {
      const { app } = createTestApp({ authenticated: true });
      app.route("/api/posts", postsApiRoutes);

      const res = await app.request("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "invalid-type" }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Validation failed");
    });

    it("returns 400 for missing required fields", async () => {
      const { app } = createTestApp({ authenticated: true });
      app.route("/api/posts", postsApiRoutes);

      const res = await app.request("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });
  });

  describe("PUT /api/posts/:id", () => {
    it("returns 401 when not authenticated", async () => {
      const { app, services } = createTestApp({ authenticated: false });
      app.route("/api/posts", postsApiRoutes);

      const post = await services.posts.create({
        format: "note",
        body: "original",
      });

      const res = await app.request(`/api/posts/${sqid.encode(post.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: "updated" }),
      });

      expect(res.status).toBe(401);
    });

    it("updates a post when authenticated", async () => {
      const { app, services } = createTestApp({ authenticated: true });
      app.route("/api/posts", postsApiRoutes);

      const post = await services.posts.create({
        format: "note",
        body: "original",
      });

      const res = await app.request(`/api/posts/${sqid.encode(post.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: "updated" }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.body).toBe("updated");
      expect(body.mediaAttachments).toEqual([]);
    });

    it("updates post with mediaIds to replace attachments", async () => {
      const { app, services } = createTestApp({ authenticated: true });
      app.route("/api/posts", postsApiRoutes);

      const post = await services.posts.create({
        format: "note",
        body: "test",
      });

      const m1 = await services.media.create({
        filename: "a.jpg",
        originalName: "a.jpg",
        mimeType: "image/jpeg",
        size: 1024,
        storageKey: "media/2025/01/a.jpg",
      });

      await services.media.attachToPost(post.id, [m1.id]);

      const m2 = await services.media.create({
        filename: "b.jpg",
        originalName: "b.jpg",
        mimeType: "image/jpeg",
        size: 2048,
        storageKey: "media/2025/01/b.jpg",
      });

      const res = await app.request(`/api/posts/${sqid.encode(post.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaIds: [m2.id] }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.mediaAttachments).toHaveLength(1);
      expect(body.mediaAttachments[0].id).toBe(m2.id);
    });

    it("preserves existing attachments when mediaIds is omitted", async () => {
      const { app, services } = createTestApp({ authenticated: true });
      app.route("/api/posts", postsApiRoutes);

      const post = await services.posts.create({
        format: "note",
        body: "test",
      });

      const m1 = await services.media.create({
        filename: "a.jpg",
        originalName: "a.jpg",
        mimeType: "image/jpeg",
        size: 1024,
        storageKey: "media/2025/01/a.jpg",
      });

      await services.media.attachToPost(post.id, [m1.id]);

      const res = await app.request(`/api/posts/${sqid.encode(post.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: "updated content" }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.mediaAttachments).toHaveLength(1);
      expect(body.mediaAttachments[0].id).toBe(m1.id);
    });

    it("returns 404 for non-existent post", async () => {
      const { app } = createTestApp({ authenticated: true });
      app.route("/api/posts", postsApiRoutes);

      const res = await app.request(`/api/posts/${sqid.encode(9999)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: "test" }),
      });

      expect(res.status).toBe(404);
    });

    it("returns 400 for invalid update data", async () => {
      const { app, services } = createTestApp({ authenticated: true });
      app.route("/api/posts", postsApiRoutes);

      const post = await services.posts.create({
        format: "note",
        body: "test",
      });

      const res = await app.request(`/api/posts/${sqid.encode(post.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "invalid-type" }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /api/posts/:id", () => {
    it("returns 401 when not authenticated", async () => {
      const { app, services } = createTestApp({ authenticated: false });
      app.route("/api/posts", postsApiRoutes);

      const post = await services.posts.create({
        format: "note",
        body: "test",
      });

      const res = await app.request(`/api/posts/${sqid.encode(post.id)}`, {
        method: "DELETE",
      });

      expect(res.status).toBe(401);
    });

    it("deletes a post when authenticated", async () => {
      const { app, services } = createTestApp({ authenticated: true });
      app.route("/api/posts", postsApiRoutes);

      const post = await services.posts.create({
        format: "note",
        body: "to be deleted",
      });

      const res = await app.request(`/api/posts/${sqid.encode(post.id)}`, {
        method: "DELETE",
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);

      // Verify post is deleted
      const found = await services.posts.getById(post.id);
      expect(found).toBeNull();
    });

    it("returns 404 for non-existent post", async () => {
      const { app } = createTestApp({ authenticated: true });
      app.route("/api/posts", postsApiRoutes);

      const res = await app.request(`/api/posts/${sqid.encode(9999)}`, {
        method: "DELETE",
      });

      expect(res.status).toBe(404);
    });
  });
});
