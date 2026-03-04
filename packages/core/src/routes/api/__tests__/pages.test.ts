import { describe, it, expect } from "vitest";
import { createTestApp } from "../../../__tests__/helpers/app.js";
import { pagesApiRoutes } from "../pages.js";
import { toUid } from "../../../lib/uid.js";

describe("Pages API Routes", () => {
  describe("GET /api/pages", () => {
    it("returns empty list when no pages exist", async () => {
      const { app } = createTestApp();
      app.route("/api/pages", pagesApiRoutes);

      const res = await app.request("/api/pages");
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.pages).toEqual([]);
    });

    it("returns pages list", async () => {
      const { app, services } = createTestApp();
      app.route("/api/pages", pagesApiRoutes);

      await services.pages.create({ slug: "about", title: "About" });
      await services.pages.create({ slug: "contact", title: "Contact" });

      const res = await app.request("/api/pages");
      const body = await res.json();

      expect(body.pages).toHaveLength(2);
    });
  });

  describe("GET /api/pages/:id", () => {
    it("returns a page by id", async () => {
      const { app, services } = createTestApp();
      app.route("/api/pages", pagesApiRoutes);

      const page = await services.pages.create({
        slug: "about",
        title: "About Us",
      });

      const res = await app.request(`/api/pages/${toUid(page.id)}`);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.title).toBe("About Us");
      expect(body.slug).toBe("about");
    });

    it("returns 400 for invalid id", async () => {
      const { app } = createTestApp();
      app.route("/api/pages", pagesApiRoutes);

      const res = await app.request("/api/pages/!!invalid!!");
      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent page", async () => {
      const { app } = createTestApp();
      app.route("/api/pages", pagesApiRoutes);

      const res = await app.request(
        `/api/pages/${toUid("00000000-0000-0000-0000-000000009999")}`,
      );
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/pages", () => {
    it("returns 401 when not authenticated", async () => {
      const { app } = createTestApp({ authenticated: false });
      app.route("/api/pages", pagesApiRoutes);

      const res = await app.request("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: "about", title: "About" }),
      });

      expect(res.status).toBe(401);
    });

    it("creates a page when authenticated", async () => {
      const { app } = createTestApp({ authenticated: true });
      app.route("/api/pages", pagesApiRoutes);

      const res = await app.request("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: "about",
          title: "About Us",
          body: "We are Jant.",
          status: "published",
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.slug).toBe("about");
      expect(body.title).toBe("About Us");
    });

    it("returns 400 for missing slug", async () => {
      const { app } = createTestApp({ authenticated: true });
      app.route("/api/pages", pagesApiRoutes);

      const res = await app.request("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "No Slug" }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe("PUT /api/pages/:id", () => {
    it("returns 401 when not authenticated", async () => {
      const { app, services } = createTestApp({ authenticated: false });
      app.route("/api/pages", pagesApiRoutes);

      const page = await services.pages.create({
        slug: "about",
        title: "About",
      });

      const res = await app.request(`/api/pages/${toUid(page.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated" }),
      });

      expect(res.status).toBe(401);
    });

    it("updates a page when authenticated", async () => {
      const { app, services } = createTestApp({ authenticated: true });
      app.route("/api/pages", pagesApiRoutes);

      const page = await services.pages.create({
        slug: "about",
        title: "About",
      });

      const res = await app.request(`/api/pages/${toUid(page.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated About" }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.title).toBe("Updated About");
    });

    it("returns 404 for non-existent page", async () => {
      const { app } = createTestApp({ authenticated: true });
      app.route("/api/pages", pagesApiRoutes);

      const res = await app.request(
        `/api/pages/${toUid("00000000-0000-0000-0000-000000009999")}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "test" }),
        },
      );

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/pages/:id", () => {
    it("returns 401 when not authenticated", async () => {
      const { app, services } = createTestApp({ authenticated: false });
      app.route("/api/pages", pagesApiRoutes);

      const page = await services.pages.create({
        slug: "about",
        title: "About",
      });

      const res = await app.request(`/api/pages/${toUid(page.id)}`, {
        method: "DELETE",
      });

      expect(res.status).toBe(401);
    });

    it("deletes a page when authenticated", async () => {
      const { app, services } = createTestApp({ authenticated: true });
      app.route("/api/pages", pagesApiRoutes);

      const page = await services.pages.create({
        slug: "about",
        title: "About",
      });

      const res = await app.request(`/api/pages/${toUid(page.id)}`, {
        method: "DELETE",
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);

      const found = await services.pages.getById(page.id);
      expect(found).toBeNull();
    });

    it("returns 404 for non-existent page", async () => {
      const { app } = createTestApp({ authenticated: true });
      app.route("/api/pages", pagesApiRoutes);

      const res = await app.request(
        `/api/pages/${toUid("00000000-0000-0000-0000-000000009999")}`,
        {
          method: "DELETE",
        },
      );

      expect(res.status).toBe(404);
    });
  });
});
