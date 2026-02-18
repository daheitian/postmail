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

    it("creates a note post and returns timeline card via SSE", async () => {
      const { app, services } = createTestApp({ authenticated: true });
      app.route("/compose", composeRoutes);

      const res = await app.request("/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "note", body: "Hello world" }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("text/event-stream");

      const text = await res.text();
      // SSE prepends the card to the timeline
      expect(text).toContain("datastar-patch-elements");
      expect(text).toContain('data-format="note"');
      expect(text).toContain("selector #timeline-items");

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
      expect(res.headers.get("Content-Type")).toBe("text/event-stream");

      const text = await res.text();
      expect(text).toContain('data-format="link"');

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
      expect(res.headers.get("Content-Type")).toBe("text/event-stream");

      const text = await res.text();
      expect(text).toContain('data-format="quote"');

      const posts = await services.posts.list();
      expect(posts).toHaveLength(1);
      expect(posts[0].format).toBe("quote");
      expect(posts[0].quoteText).toBe("The original quote");
    });

    it("creates a draft and closes dialog with toast", async () => {
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
      expect(res.headers.get("Content-Type")).toBe("text/event-stream");

      const text = await res.text();
      // Should close dialog and show toast, not prepend to timeline
      expect(text).toContain("compose-dialog");
      expect(text).toContain("Draft saved");
      expect(text).not.toContain("selector #timeline-items");

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

    it("resets compose signals after publishing", async () => {
      const { app } = createTestApp({ authenticated: true });
      app.route("/compose", composeRoutes);

      const res = await app.request("/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "note", body: "Hello" }),
      });

      const text = await res.text();
      // SSE should include signal reset
      expect(text).toContain("datastar-patch-signals");
      expect(text).toContain('"_composeLoading":false');
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
