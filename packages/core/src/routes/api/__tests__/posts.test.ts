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
        type: "note",
        content: "Hello world",
        visibility: "featured",
      });

      const res = await app.request("/api/posts");
      const body = await res.json();

      expect(body.posts).toHaveLength(1);
      expect(body.posts[0].content).toBe("Hello world");
      expect(body.posts[0].sqid).toBeTruthy();
    });

    it("filters by visibility", async () => {
      const { app, services } = createTestApp();
      app.route("/api/posts", postsApiRoutes);

      await services.posts.create({
        type: "note",
        content: "featured",
        visibility: "featured",
      });
      await services.posts.create({
        type: "note",
        content: "draft",
        visibility: "draft",
      });

      const res = await app.request("/api/posts?visibility=draft");
      const body = await res.json();

      expect(body.posts).toHaveLength(1);
      expect(body.posts[0].visibility).toBe("draft");
    });

    it("supports limit parameter", async () => {
      const { app, services } = createTestApp();
      app.route("/api/posts", postsApiRoutes);

      for (let i = 0; i < 5; i++) {
        await services.posts.create({
          type: "note",
          content: `post ${i}`,
          visibility: "featured",
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
        type: "note",
        content: "test post",
        visibility: "featured",
      });
      const id = sqid.encode(post.id);

      const res = await app.request(`/api/posts/${id}`);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.content).toBe("test post");
      expect(body.sqid).toBe(id);
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
          type: "note",
          content: "test",
          visibility: "quiet",
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
          type: "note",
          content: "Hello from API",
          visibility: "quiet",
        }),
      });

      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.content).toBe("Hello from API");
      expect(body.sqid).toBeTruthy();
    });

    it("returns 400 for invalid body", async () => {
      const { app } = createTestApp({ authenticated: true });
      app.route("/api/posts", postsApiRoutes);

      const res = await app.request("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "invalid-type" }),
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
        type: "note",
        content: "original",
      });

      const res = await app.request(`/api/posts/${sqid.encode(post.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "updated" }),
      });

      expect(res.status).toBe(401);
    });

    it("updates a post when authenticated", async () => {
      const { app, services } = createTestApp({ authenticated: true });
      app.route("/api/posts", postsApiRoutes);

      const post = await services.posts.create({
        type: "note",
        content: "original",
      });

      const res = await app.request(`/api/posts/${sqid.encode(post.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "updated" }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.content).toBe("updated");
    });

    it("returns 404 for non-existent post", async () => {
      const { app } = createTestApp({ authenticated: true });
      app.route("/api/posts", postsApiRoutes);

      const res = await app.request(`/api/posts/${sqid.encode(9999)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "test" }),
      });

      expect(res.status).toBe(404);
    });

    it("returns 400 for invalid update data", async () => {
      const { app, services } = createTestApp({ authenticated: true });
      app.route("/api/posts", postsApiRoutes);

      const post = await services.posts.create({
        type: "note",
        content: "test",
      });

      const res = await app.request(`/api/posts/${sqid.encode(post.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "invalid-type" }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /api/posts/:id", () => {
    it("returns 401 when not authenticated", async () => {
      const { app, services } = createTestApp({ authenticated: false });
      app.route("/api/posts", postsApiRoutes);

      const post = await services.posts.create({
        type: "note",
        content: "test",
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
        type: "note",
        content: "to be deleted",
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
