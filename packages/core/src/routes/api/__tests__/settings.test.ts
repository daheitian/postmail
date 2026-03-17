import { describe, it, expect } from "vitest";
import { createTestApp } from "../../../__tests__/helpers/app.js";
import { settingsApiRoutes } from "../settings.js";

describe("Settings API Routes", () => {
  describe("GET /api/settings", () => {
    it("returns 401 when not authenticated", async () => {
      const { app } = createTestApp({ authenticated: false });
      app.route("/api/settings", settingsApiRoutes);

      const res = await app.request("/api/settings");
      expect(res.status).toBe(401);
    });

    it("returns default settings when none are stored", async () => {
      const { app } = createTestApp({ authenticated: true });
      app.route("/api/settings", settingsApiRoutes);

      const res = await app.request("/api/settings");
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.settings).toBeDefined();
      expect(body.settings.SITE_NAME).toBe("Jant");
      expect(body.settings.SITE_DESCRIPTION).toBe(
        "Thoughts, links, and quotes — one post at a time",
      );
      expect(body.settings.SITE_LANGUAGE).toBe("en");
    });

    it("returns stored settings overriding defaults", async () => {
      const { app, services } = createTestApp({ authenticated: true });
      app.route("/api/settings", settingsApiRoutes);

      await services.settings.set("SITE_NAME" as never, "My Blog");

      const res = await app.request("/api/settings");
      const body = await res.json();

      expect(body.settings.SITE_NAME).toBe("My Blog");
    });

    it("does not include env-only settings", async () => {
      const { app } = createTestApp({ authenticated: true });
      app.route("/api/settings", settingsApiRoutes);

      const res = await app.request("/api/settings");
      const body = await res.json();

      // Env-only keys should not be in the response
      expect(body.settings.AUTH_SECRET).toBeUndefined();
      expect(body.settings.SITE_URL).toBeUndefined();
    });

    it("returns NOINDEX as locked on in demo mode", async () => {
      const { app } = createTestApp({ authenticated: true, demoMode: true });
      app.route("/api/settings", settingsApiRoutes);

      const res = await app.request("/api/settings");
      const body = await res.json();

      expect(body.settings.NOINDEX).toBe("true");
    });
  });

  describe("PUT /api/settings", () => {
    it("returns 401 when not authenticated", async () => {
      const { app } = createTestApp({ authenticated: false });
      app.route("/api/settings", settingsApiRoutes);

      const res = await app.request("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ SITE_NAME: "New Name" }),
      });

      expect(res.status).toBe(401);
    });

    it("updates editable settings", async () => {
      const { app } = createTestApp({ authenticated: true });
      app.route("/api/settings", settingsApiRoutes);

      const res = await app.request("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ SITE_NAME: "Updated Blog" }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.settings.SITE_NAME).toBe("Updated Blog");
    });

    it("rejects env-only keys", async () => {
      const { app } = createTestApp({ authenticated: true });
      app.route("/api/settings", settingsApiRoutes);

      const res = await app.request("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ AUTH_SECRET: "should-not-work" }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.details.rejectedKeys).toContain("AUTH_SECRET");
    });

    it("partially applies when mixing editable and env-only keys", async () => {
      const { app } = createTestApp({ authenticated: true });
      app.route("/api/settings", settingsApiRoutes);

      const res = await app.request("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          SITE_NAME: "Mixed Update",
          AUTH_SECRET: "ignored",
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.settings.SITE_NAME).toBe("Mixed Update");
      expect(body.rejectedKeys).toContain("AUTH_SECRET");
    });

    it("returns 400 for invalid body", async () => {
      const { app } = createTestApp({ authenticated: true });
      app.route("/api/settings", settingsApiRoutes);

      const res = await app.request("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("not an object"),
      });

      expect(res.status).toBe(400);
    });

    it("rejects NOINDEX updates in demo mode", async () => {
      const { app } = createTestApp({ authenticated: true, demoMode: true });
      app.route("/api/settings", settingsApiRoutes);

      const res = await app.request("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ NOINDEX: "" }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.details.rejectedKeys).toContain("NOINDEX");
    });

    it("partially applies non-demo settings while rejecting NOINDEX in demo mode", async () => {
      const { app } = createTestApp({ authenticated: true, demoMode: true });
      app.route("/api/settings", settingsApiRoutes);

      const res = await app.request("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          SITE_NAME: "Demo Blog",
          NOINDEX: "",
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.settings.SITE_NAME).toBe("Demo Blog");
      expect(body.settings.NOINDEX).toBe("true");
      expect(body.rejectedKeys).toContain("NOINDEX");
    });
  });
});
