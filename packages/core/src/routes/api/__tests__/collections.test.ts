import { describe, it, expect } from "vitest";
import { createTestApp } from "../../../__tests__/helpers/app.js";
import { collectionsApiRoutes } from "../collections.js";

describe("Collections API Routes", () => {
  describe("GET /api/collections", () => {
    it("returns empty list when no collections exist", async () => {
      const { app } = createTestApp();
      app.route("/api/collections", collectionsApiRoutes);

      const res = await app.request("/api/collections");
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.collections).toEqual([]);
    });

    it("returns collections with post counts", async () => {
      const { app, services } = createTestApp();
      app.route("/api/collections", collectionsApiRoutes);

      const col = await services.collections.create({
        slug: "tech",
        title: "Tech",
      });
      await services.posts.create({
        format: "note",
        body: "tech post",
        collectionId: col.id,
      });

      const res = await app.request("/api/collections");
      const body = await res.json();

      expect(body.collections).toHaveLength(1);
      expect(body.collections[0].slug).toBe("tech");
      expect(body.collections[0].postCount).toBe(1);
    });
  });

  describe("GET /api/collections/:id", () => {
    it("returns a collection by id", async () => {
      const { app, services } = createTestApp();
      app.route("/api/collections", collectionsApiRoutes);

      const col = await services.collections.create({
        slug: "tech",
        title: "Tech Articles",
      });

      const res = await app.request(`/api/collections/${col.id}`);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.title).toBe("Tech Articles");
      expect(body.slug).toBe("tech");
    });

    it("returns 400 for invalid id", async () => {
      const { app } = createTestApp();
      app.route("/api/collections", collectionsApiRoutes);

      const res = await app.request("/api/collections/abc");
      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent collection", async () => {
      const { app } = createTestApp();
      app.route("/api/collections", collectionsApiRoutes);

      const res = await app.request("/api/collections/9999");
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/collections", () => {
    it("returns 401 when not authenticated", async () => {
      const { app } = createTestApp({ authenticated: false });
      app.route("/api/collections", collectionsApiRoutes);

      const res = await app.request("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: "tech", title: "Tech" }),
      });

      expect(res.status).toBe(401);
    });

    it("creates a collection when authenticated", async () => {
      const { app } = createTestApp({ authenticated: true });
      app.route("/api/collections", collectionsApiRoutes);

      const res = await app.request("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: "tech",
          title: "Tech",
          description: "Tech articles",
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.slug).toBe("tech");
      expect(body.title).toBe("Tech");
      expect(body.description).toBe("Tech articles");
    });

    it("returns 400 for missing required fields", async () => {
      const { app } = createTestApp({ authenticated: true });
      app.route("/api/collections", collectionsApiRoutes);

      const res = await app.request("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: "tech" }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe("PUT /api/collections/reorder", () => {
    it("returns 401 when not authenticated", async () => {
      const { app } = createTestApp({ authenticated: false });
      app.route("/api/collections", collectionsApiRoutes);

      const res = await app.request("/api/collections/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [1, 2] }),
      });

      expect(res.status).toBe(401);
    });

    it("reorders collections when authenticated", async () => {
      const { app, services } = createTestApp({ authenticated: true });
      app.route("/api/collections", collectionsApiRoutes);

      const col1 = await services.collections.create({
        slug: "first",
        title: "First",
      });
      const col2 = await services.collections.create({
        slug: "second",
        title: "Second",
      });

      const res = await app.request("/api/collections/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [col2.id, col1.id] }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.collections[0].slug).toBe("second");
      expect(body.collections[1].slug).toBe("first");
    });
  });

  describe("PUT /api/collections/:id", () => {
    it("updates a collection when authenticated", async () => {
      const { app, services } = createTestApp({ authenticated: true });
      app.route("/api/collections", collectionsApiRoutes);

      const col = await services.collections.create({
        slug: "tech",
        title: "Tech",
      });

      const res = await app.request(`/api/collections/${col.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Technology" }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.title).toBe("Technology");
    });

    it("returns 404 for non-existent collection", async () => {
      const { app } = createTestApp({ authenticated: true });
      app.route("/api/collections", collectionsApiRoutes);

      const res = await app.request("/api/collections/9999", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "test" }),
      });

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/collections/:id", () => {
    it("returns 401 when not authenticated", async () => {
      const { app, services } = createTestApp({ authenticated: false });
      app.route("/api/collections", collectionsApiRoutes);

      const col = await services.collections.create({
        slug: "tech",
        title: "Tech",
      });

      const res = await app.request(`/api/collections/${col.id}`, {
        method: "DELETE",
      });

      expect(res.status).toBe(401);
    });

    it("deletes a collection when authenticated", async () => {
      const { app, services } = createTestApp({ authenticated: true });
      app.route("/api/collections", collectionsApiRoutes);

      const col = await services.collections.create({
        slug: "tech",
        title: "Tech",
      });

      const res = await app.request(`/api/collections/${col.id}`, {
        method: "DELETE",
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);

      const found = await services.collections.getById(col.id);
      expect(found).toBeNull();
    });

    it("returns 404 for non-existent collection", async () => {
      const { app } = createTestApp({ authenticated: true });
      app.route("/api/collections", collectionsApiRoutes);

      const res = await app.request("/api/collections/9999", {
        method: "DELETE",
      });

      expect(res.status).toBe(404);
    });
  });
});
