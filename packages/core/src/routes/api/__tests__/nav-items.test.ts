import { describe, it, expect } from "vitest";
import { createTestApp } from "../../../__tests__/helpers/app.js";
import { navItemsApiRoutes } from "../nav-items.js";

describe("Nav Items API Routes", () => {
  describe("GET /api/nav-items", () => {
    it("returns empty list when no nav items exist", async () => {
      const { app } = createTestApp();
      app.route("/api/nav-items", navItemsApiRoutes);

      const res = await app.request("/api/nav-items");
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.navItems).toEqual([]);
    });

    it("returns nav items ordered by position", async () => {
      const { app, services } = createTestApp();
      app.route("/api/nav-items", navItemsApiRoutes);

      await services.navItems.create({
        type: "link",
        label: "Home",
        url: "/",
      });
      await services.navItems.create({
        type: "link",
        label: "Blog",
        url: "/blog",
      });

      const res = await app.request("/api/nav-items");
      const body = await res.json();

      expect(body.navItems).toHaveLength(2);
      expect(body.navItems[0].label).toBe("Home");
      expect(body.navItems[1].label).toBe("Blog");
    });
  });

  describe("POST /api/nav-items", () => {
    it("returns 401 when not authenticated", async () => {
      const { app } = createTestApp({ authenticated: false });
      app.route("/api/nav-items", navItemsApiRoutes);

      const res = await app.request("/api/nav-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "link",
          label: "Home",
          url: "/",
        }),
      });

      expect(res.status).toBe(401);
    });

    it("creates a nav item when authenticated", async () => {
      const { app } = createTestApp({ authenticated: true });
      app.route("/api/nav-items", navItemsApiRoutes);

      const res = await app.request("/api/nav-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "link",
          label: "GitHub",
          url: "https://github.com",
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.label).toBe("GitHub");
      expect(body.url).toBe("https://github.com");
      expect(body.type).toBe("link");
    });

    it("creates a system nav item when authenticated", async () => {
      const { app } = createTestApp({ authenticated: true });
      app.route("/api/nav-items", navItemsApiRoutes);

      const res = await app.request("/api/nav-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "system",
          systemKey: "archive",
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.type).toBe("system");
      expect(body.systemKey).toBe("archive");
      expect(body.url).toBe("/archive");
      expect(body.label).toBe("Archive");
    });

    it("returns 400 for missing required fields", async () => {
      const { app } = createTestApp({ authenticated: true });
      app.route("/api/nav-items", navItemsApiRoutes);

      const res = await app.request("/api/nav-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "link" }),
      });

      expect(res.status).toBe(400);
    });

    it("returns 400 for duplicate system nav items", async () => {
      const { app } = createTestApp({ authenticated: true });
      app.route("/api/nav-items", navItemsApiRoutes);

      await app.request("/api/nav-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "system",
          systemKey: "archive",
        }),
      });

      const res = await app.request("/api/nav-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "system",
          systemKey: "archive",
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe("PUT /api/nav-items/:id/move", () => {
    it("moves a nav item between two others", async () => {
      const { app, services } = createTestApp({ authenticated: true });
      app.route("/api/nav-items", navItemsApiRoutes);

      const item1 = await services.navItems.create({
        type: "link",
        label: "First",
        url: "/first",
      });
      const item2 = await services.navItems.create({
        type: "link",
        label: "Second",
        url: "/second",
      });
      const item3 = await services.navItems.create({
        type: "link",
        label: "Third",
        url: "/third",
      });

      // Move Third between First and Second
      const res = await app.request(`/api/nav-items/${item3.id}/move`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          after: item1.id,
          before: item2.id,
        }),
      });

      expect(res.status).toBe(200);

      const items = await services.navItems.list();
      expect(items[0]?.label).toBe("First");
      expect(items[1]?.label).toBe("Third");
      expect(items[2]?.label).toBe("Second");
    });

    it("returns 404 for non-existent item", async () => {
      const { app } = createTestApp({ authenticated: true });
      app.route("/api/nav-items", navItemsApiRoutes);

      const res = await app.request(
        `/api/nav-items/${"00000000-0000-0000-0000-000000009999"}/move`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ after: null, before: null }),
        },
      );

      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/nav-items/:id", () => {
    it("updates a nav item when authenticated", async () => {
      const { app, services } = createTestApp({ authenticated: true });
      app.route("/api/nav-items", navItemsApiRoutes);

      const item = await services.navItems.create({
        type: "link",
        label: "Old Label",
        url: "/old",
      });

      const res = await app.request(`/api/nav-items/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: "New Label" }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.label).toBe("New Label");
    });

    it("returns 404 for non-existent item", async () => {
      const { app } = createTestApp({ authenticated: true });
      app.route("/api/nav-items", navItemsApiRoutes);

      const res = await app.request(
        `/api/nav-items/${"00000000-0000-0000-0000-000000009999"}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label: "test" }),
        },
      );

      expect(res.status).toBe(404);
    });

    it("rejects editing built-in system labels", async () => {
      const { app, services } = createTestApp({ authenticated: true });
      app.route("/api/nav-items", navItemsApiRoutes);

      const item = await services.navItems.create({
        type: "system",
        systemKey: "settings",
      });

      const res = await app.request(`/api/nav-items/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: "Admin" }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /api/nav-items/:id", () => {
    it("returns 401 when not authenticated", async () => {
      const { app, services } = createTestApp({ authenticated: false });
      app.route("/api/nav-items", navItemsApiRoutes);

      const item = await services.navItems.create({
        type: "link",
        label: "Delete Me",
        url: "/delete",
      });

      const res = await app.request(`/api/nav-items/${item.id}`, {
        method: "DELETE",
      });

      expect(res.status).toBe(401);
    });

    it("deletes a nav item when authenticated", async () => {
      const { app, services } = createTestApp({ authenticated: true });
      app.route("/api/nav-items", navItemsApiRoutes);

      const item = await services.navItems.create({
        type: "link",
        label: "Delete Me",
        url: "/delete",
      });

      const res = await app.request(`/api/nav-items/${item.id}`, {
        method: "DELETE",
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it("returns 404 for non-existent item", async () => {
      const { app } = createTestApp({ authenticated: true });
      app.route("/api/nav-items", navItemsApiRoutes);

      const res = await app.request(
        `/api/nav-items/${"00000000-0000-0000-0000-000000009999"}`,
        { method: "DELETE" },
      );

      expect(res.status).toBe(404);
    });
  });
});
