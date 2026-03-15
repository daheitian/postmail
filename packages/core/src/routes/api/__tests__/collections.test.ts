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
      expect(body.sidebarItems).toEqual([]);
    });

    it("returns collections with post counts and sidebar items", async () => {
      const { app, services } = createTestApp();
      app.route("/api/collections", collectionsApiRoutes);

      const col = await services.collections.create({
        slug: "tech",
        title: "Tech",
      });
      const post = await services.posts.create({
        format: "note",
        bodyMarkdown: "tech post",
      });
      await services.collections.addPost(col.id, post.id);

      const res = await app.request("/api/collections");
      const body = await res.json();

      expect(body.collections).toHaveLength(1);
      expect(body.collections[0].slug).toBe("tech");
      expect(body.collections[0].postCount).toBe(1);
      expect(body.collections[0].recentActivityAt).toBe(post.lastActivityAt);

      expect(body.sidebarItems).toHaveLength(1);
      expect(body.sidebarItems[0].type).toBe("collection");
      expect(body.sidebarItems[0].collectionId).toBe(col.id);
    });

    it("returns divider labels", async () => {
      const { app, services } = createTestApp({ authenticated: true });
      app.route("/api/collections", collectionsApiRoutes);

      const divider = await services.collections.createSidebarItem(
        "divider",
        undefined,
        "Notes",
      );

      const res = await app.request("/api/collections");
      const body = await res.json();

      expect(body.sidebarItems).toContainEqual(
        expect.objectContaining({
          id: divider.id,
          type: "divider",
          label: "Notes",
        }),
      );
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

      const res = await app.request("/api/collections/!!invalid!!");
      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent collection", async () => {
      const { app } = createTestApp();
      app.route("/api/collections", collectionsApiRoutes);

      const res = await app.request(
        `/api/collections/${"00000000-0000-0000-0000-000000009999"}`,
      );
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

    it("accepts structured icon payloads that use a semantic palette", async () => {
      const { app } = createTestApp({ authenticated: true });
      app.route("/api/collections", collectionsApiRoutes);

      const res = await app.request("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: "reading",
          title: "Reading",
          icon: JSON.stringify({
            name: "library",
            svg: "<svg>test</svg>",
            palette: "stone",
          }),
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.icon).toContain('"palette":"stone"');
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

    it("rejects structured icon payloads with an unknown palette", async () => {
      const { app } = createTestApp({ authenticated: true });
      app.route("/api/collections", collectionsApiRoutes);

      const res = await app.request("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: "notes",
          title: "Notes",
          icon: JSON.stringify({
            name: "library",
            svg: "<svg>test</svg>",
            palette: "electric-blue",
          }),
        }),
      });

      expect(res.status).toBe(400);
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

      const res = await app.request(
        `/api/collections/${"00000000-0000-0000-0000-000000009999"}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "test" }),
        },
      );

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

      const res = await app.request(
        `/api/collections/${"00000000-0000-0000-0000-000000009999"}`,
        { method: "DELETE" },
      );

      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/collections/sidebar-items", () => {
    it("creates a divider sidebar item", async () => {
      const { app } = createTestApp({ authenticated: true });
      app.route("/api/collections", collectionsApiRoutes);

      const res = await app.request("/api/collections/sidebar-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.type).toBe("divider");
      expect(body.collectionId).toBeNull();
    });
  });

  describe("DELETE /api/collections/sidebar-items/:id", () => {
    it("deletes a sidebar item", async () => {
      const { app, services } = createTestApp({ authenticated: true });
      app.route("/api/collections", collectionsApiRoutes);

      const item = await services.collections.createSidebarItem("divider");

      const res = await app.request(
        `/api/collections/sidebar-items/${item.id}`,
        { method: "DELETE" },
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });

  describe("PUT /api/collections/sidebar-items/:id", () => {
    it("updates a divider label", async () => {
      const { app, services } = createTestApp({ authenticated: true });
      app.route("/api/collections", collectionsApiRoutes);

      const item = await services.collections.createSidebarItem("divider");

      const res = await app.request(
        `/api/collections/sidebar-items/${item.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label: "Reading" }),
        },
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.label).toBe("Reading");
    });
  });

  describe("PUT /api/collections/sidebar-items/:id/move", () => {
    it("moves a sidebar item", async () => {
      const { app, services } = createTestApp({ authenticated: true });
      app.route("/api/collections", collectionsApiRoutes);

      await services.collections.create({ slug: "a", title: "A" });
      await services.collections.create({ slug: "b", title: "B" });
      await services.collections.create({ slug: "c", title: "C" });

      const items = await services.collections.listSidebarItems();
      expect(items).toHaveLength(3);
      const itemA = items[0];
      const itemB = items[1];
      const itemC = items[2];

      // Move C between A and B
      const res = await app.request(
        `/api/collections/sidebar-items/${itemC?.id ?? ""}/move`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            after: itemA?.id ?? "",
            before: itemB?.id ?? "",
          }),
        },
      );

      expect(res.status).toBe(200);

      const reordered = await services.collections.listSidebarItems();
      expect(reordered[0]?.id).toBe(itemA?.id);
      expect(reordered[1]?.id).toBe(itemC?.id);
      expect(reordered[2]?.id).toBe(itemB?.id);
    });
  });

  describe("POST /api/collections/:id/posts", () => {
    it("adds a post to a collection", async () => {
      const { app, services } = createTestApp({ authenticated: true });
      app.route("/api/collections", collectionsApiRoutes);

      const col = await services.collections.create({
        slug: "tech",
        title: "Tech",
      });
      const post = await services.posts.create({
        format: "note",
        bodyMarkdown: "test",
      });

      const res = await app.request(`/api/collections/${col.id}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id }),
      });

      expect(res.status).toBe(201);

      const postIds = await services.collections.getPostIds(col.id);
      expect(postIds).toContain(post.id);
    });

    it("returns 404 for non-existent collection", async () => {
      const { app, services } = createTestApp({ authenticated: true });
      app.route("/api/collections", collectionsApiRoutes);

      const post = await services.posts.create({
        format: "note",
        bodyMarkdown: "test",
      });

      const res = await app.request(
        `/api/collections/${"00000000-0000-0000-0000-000000009999"}/posts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId: post.id }),
        },
      );

      expect(res.status).toBe(404);
    });

    it("returns 401 when not authenticated", async () => {
      const { app, services } = createTestApp({ authenticated: false });
      app.route("/api/collections", collectionsApiRoutes);

      const col = await services.collections.create({
        slug: "tech",
        title: "Tech",
      });

      const res = await app.request(`/api/collections/${col.id}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: "00000000-0000-0000-0000-000000000001",
        }),
      });

      expect(res.status).toBe(401);
    });
  });

  describe("DELETE /api/collections/:id/posts/:postId", () => {
    it("removes a post from a collection", async () => {
      const { app, services } = createTestApp({ authenticated: true });
      app.route("/api/collections", collectionsApiRoutes);

      const col = await services.collections.create({
        slug: "tech",
        title: "Tech",
      });
      const post = await services.posts.create({
        format: "note",
        bodyMarkdown: "test",
      });

      await services.collections.addPost(col.id, post.id);

      const res = await app.request(
        `/api/collections/${col.id}/posts/${post.id}`,
        { method: "DELETE" },
      );

      expect(res.status).toBe(200);

      const postIds = await services.collections.getPostIds(col.id);
      expect(postIds).not.toContain(post.id);
    });
  });
});
