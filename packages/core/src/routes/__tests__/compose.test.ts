import { describe, it, expect } from "vitest";
import { createTestApp } from "../../__tests__/helpers/app.js";
import { composeRoutes } from "../compose.js";

describe("Compose Routes", () => {
  describe("POST /compose", () => {
    it("redirects to signin when not authenticated", async () => {
      const { app } = createTestApp({ authenticated: false });
      app.route("/compose", composeRoutes);

      const res = await app.request("/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "note", body: "Hello" }),
      });

      expect(res.status).toBe(302);
      expect(res.headers.get("Location")).toBe("/signin");
    });

    it("creates a note post and returns redirect", async () => {
      const { app, services } = createTestApp({ authenticated: true });
      app.route("/compose", composeRoutes);

      const res = await app.request("/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "note", body: "Hello world" }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("text/html");

      // Verify post was created
      const posts = await services.posts.list();
      expect(posts).toHaveLength(1);
      expect(posts[0].format).toBe("note");
      expect(posts[0].body).toBe("Hello world");
      expect(posts[0].status).toBe("published");
    });

    it("creates a link post", async () => {
      const { app, services } = createTestApp({ authenticated: true });
      app.route("/compose", composeRoutes);

      const res = await app.request("/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: "link",
          body: "Check this out",
          url: "https://example.com",
        }),
      });

      expect(res.status).toBe(200);

      const posts = await services.posts.list();
      expect(posts).toHaveLength(1);
      expect(posts[0].format).toBe("link");
      expect(posts[0].url).toBe("https://example.com");
    });

    it("creates a quote post", async () => {
      const { app, services } = createTestApp({ authenticated: true });
      app.route("/compose", composeRoutes);

      const res = await app.request("/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: "quote",
          body: "Great insight",
          quoteText: "The original quote",
          url: "https://example.com/source",
        }),
      });

      expect(res.status).toBe(200);

      const posts = await services.posts.list();
      expect(posts).toHaveLength(1);
      expect(posts[0].format).toBe("quote");
      expect(posts[0].quoteText).toBe("The original quote");
    });

    it("creates a draft when status is draft", async () => {
      const { app, services } = createTestApp({ authenticated: true });
      app.route("/compose", composeRoutes);

      const res = await app.request("/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: "note",
          body: "Draft content",
          status: "draft",
        }),
      });

      expect(res.status).toBe(200);

      const posts = await services.posts.list({ includeDrafts: true });
      expect(posts).toHaveLength(1);
      expect(posts[0].status).toBe("draft");
    });

    it("returns error for invalid format", async () => {
      const { app } = createTestApp({ authenticated: true });
      app.route("/compose", composeRoutes);

      const res = await app.request("/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "invalid", body: "Hello" }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("text/html");
      // Returns a toast error (text/html with error message)
      const text = await res.text();
      expect(text).toContain("toast-error");
    });

    it("attaches media IDs when provided", async () => {
      const { app, services } = createTestApp({ authenticated: true });
      app.route("/compose", composeRoutes);

      // Create media first
      const media = await services.media.create({
        filename: "test.jpg",
        originalName: "test.jpg",
        mimeType: "image/jpeg",
        size: 1024,
        storageKey: "media/2025/01/test.jpg",
        width: 800,
        height: 600,
      });

      const res = await app.request("/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: "note",
          body: "Post with media",
          mediaIds: [media.id],
        }),
      });

      expect(res.status).toBe(200);

      const posts = await services.posts.list();
      expect(posts).toHaveLength(1);

      // Verify media is attached
      const attachments = await services.media.getByPostId(posts[0].id);
      expect(attachments).toHaveLength(1);
      expect(attachments[0].id).toBe(media.id);
    });

    it("sets featured and pinned flags", async () => {
      const { app, services } = createTestApp({ authenticated: true });
      app.route("/compose", composeRoutes);

      const res = await app.request("/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: "note",
          body: "Featured and pinned",
          featured: true,
          pinned: true,
        }),
      });

      expect(res.status).toBe(200);

      const posts = await services.posts.list();
      expect(posts).toHaveLength(1);
      expect(posts[0].featured).toBe(1);
      expect(posts[0].pinned).toBe(1);
    });

    it("returns error when format is missing", async () => {
      const { app } = createTestApp({ authenticated: true });
      app.route("/compose", composeRoutes);

      const res = await app.request("/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: "No format" }),
      });

      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain("toast-error");
    });
  });
});
