import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import type { Bindings } from "../../../types.js";
import type { AppVariables } from "../../../types/app-context.js";
import { createTestDatabase } from "../../../__tests__/helpers/db.js";
import { createPostService } from "../../../services/post.js";
import { createSettingsService } from "../../../services/settings.js";
import { createMediaService } from "../../../services/media.js";
import { resolveConfig } from "../../../lib/resolve-config.js";
import { rssRoutes } from "../rss.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

function createFeedTestApp(envOverrides: Partial<Bindings> = {}) {
  const { db } = createTestDatabase();

  const services = {
    posts: createPostService(db as never, { slugIdLength: 5 }),
    settings: createSettingsService(db as never),
    media: createMediaService(db as never),
  };

  const app = new Hono<Env>();

  app.use("*", async (c, next) => {
    const env = {
      SITE_URL: "http://localhost:9020",
      ...envOverrides,
    } as Bindings;
    c.env = env;

    c.set("services", services as AppVariables["services"]);
    const allSettings = await services.settings.getAll();
    c.set("allSettings", allSettings);
    c.set("appConfig", resolveConfig(env, allSettings));
    await next();
  });

  app.route("/feed", rssRoutes);

  return { app, services };
}

describe("RSS Feed Routes", () => {
  describe("/feed — featured only", () => {
    it("returns only featured posts", async () => {
      const { app, services } = createFeedTestApp();

      // Create a mix of featured and non-featured posts
      await services.posts.create({
        format: "note",
        title: "Regular Post",
        body: "Not featured",
        status: "published",
      });
      await services.posts.create({
        format: "note",
        title: "Featured Post",
        body: "This is featured",
        status: "published",
        featured: true,
      });

      const res = await app.request("/feed");
      expect(res.status).toBe(200);

      const xml = await res.text();
      expect(xml).toContain("Featured Post");
      expect(xml).not.toContain("Regular Post");
    });

    it("returns empty feed when no featured posts exist", async () => {
      const { app, services } = createFeedTestApp();

      await services.posts.create({
        format: "note",
        title: "Regular Post",
        body: "Not featured",
        status: "published",
      });

      const res = await app.request("/feed");
      expect(res.status).toBe(200);

      const xml = await res.text();
      expect(xml).not.toContain("Regular Post");
    });

    it("returns RSS content type", async () => {
      const { app } = createFeedTestApp();

      const res = await app.request("/feed");
      expect(res.headers.get("Content-Type")).toBe(
        "application/rss+xml; charset=utf-8",
      );
    });
  });

  describe("/feed/atom.xml — featured only (Atom)", () => {
    it("returns only featured posts in Atom format", async () => {
      const { app, services } = createFeedTestApp();

      await services.posts.create({
        format: "note",
        title: "Regular Post",
        body: "Not featured",
        status: "published",
      });
      await services.posts.create({
        format: "note",
        title: "Featured Post",
        body: "This is featured",
        status: "published",
        featured: true,
      });

      const res = await app.request("/feed/atom.xml");
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe(
        "application/atom+xml; charset=utf-8",
      );

      const xml = await res.text();
      expect(xml).toContain("Featured Post");
      expect(xml).not.toContain("Regular Post");
    });
  });

  describe("/feed/all — all published posts", () => {
    it("returns all published posts", async () => {
      const { app, services } = createFeedTestApp();

      await services.posts.create({
        format: "note",
        title: "Regular Post",
        body: "Not featured",
        status: "published",
      });
      await services.posts.create({
        format: "note",
        title: "Featured Post",
        body: "This is featured",
        status: "published",
        featured: true,
      });
      await services.posts.create({
        format: "note",
        title: "Draft Post",
        body: "Draft",
        status: "draft",
      });

      const res = await app.request("/feed/all");
      expect(res.status).toBe(200);

      const xml = await res.text();
      expect(xml).toContain("Regular Post");
      expect(xml).toContain("Featured Post");
      expect(xml).not.toContain("Draft Post");
    });

    it("filters by format query parameter", async () => {
      const { app, services } = createFeedTestApp();

      await services.posts.create({
        format: "note",
        title: "My Note",
        body: "A note",
        status: "published",
      });
      await services.posts.create({
        format: "link",
        title: "My Link",
        url: "https://example.com",
        status: "published",
      });
      await services.posts.create({
        format: "quote",
        title: "My Quote",
        quoteText: "Something wise",
        status: "published",
      });

      const res = await app.request("/feed/all?format=note");
      expect(res.status).toBe(200);

      const xml = await res.text();
      expect(xml).toContain("My Note");
      expect(xml).not.toContain("My Link");
      expect(xml).not.toContain("My Quote");
    });

    it("ignores invalid format query parameter", async () => {
      const { app, services } = createFeedTestApp();

      await services.posts.create({
        format: "note",
        title: "My Note",
        body: "A note",
        status: "published",
      });
      await services.posts.create({
        format: "link",
        title: "My Link",
        url: "https://example.com",
        status: "published",
      });

      const res = await app.request("/feed/all?format=invalid");
      expect(res.status).toBe(200);

      const xml = await res.text();
      // Invalid format is ignored — all posts returned
      expect(xml).toContain("My Note");
      expect(xml).toContain("My Link");
    });

    it("returns RSS content type", async () => {
      const { app } = createFeedTestApp();

      const res = await app.request("/feed/all");
      expect(res.headers.get("Content-Type")).toBe(
        "application/rss+xml; charset=utf-8",
      );
    });
  });

  describe("/feed/all/atom.xml — all published posts (Atom)", () => {
    it("returns all published posts in Atom format", async () => {
      const { app, services } = createFeedTestApp();

      await services.posts.create({
        format: "note",
        title: "Regular Post",
        body: "Not featured",
        status: "published",
      });
      await services.posts.create({
        format: "note",
        title: "Featured Post",
        body: "This is featured",
        status: "published",
        featured: true,
      });

      const res = await app.request("/feed/all/atom.xml");
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe(
        "application/atom+xml; charset=utf-8",
      );

      const xml = await res.text();
      expect(xml).toContain("Regular Post");
      expect(xml).toContain("Featured Post");
    });

    it("supports format filtering", async () => {
      const { app, services } = createFeedTestApp();

      await services.posts.create({
        format: "note",
        title: "My Note",
        body: "A note",
        status: "published",
      });
      await services.posts.create({
        format: "link",
        title: "My Link",
        url: "https://example.com",
        status: "published",
      });

      const res = await app.request("/feed/all/atom.xml?format=link");
      expect(res.status).toBe(200);

      const xml = await res.text();
      expect(xml).not.toContain("My Note");
      expect(xml).toContain("My Link");
    });
  });

  describe("RSS_FEED_LIMIT env var", () => {
    it("defaults to 50 when RSS_FEED_LIMIT is not set", async () => {
      const { app, services } = createFeedTestApp();

      // Create 3 featured posts
      for (let i = 0; i < 3; i++) {
        await services.posts.create({
          format: "note",
          title: `Post ${i}`,
          body: `Body ${i}`,
          status: "published",
          featured: true,
        });
      }

      const res = await app.request("/feed");
      expect(res.status).toBe(200);

      const xml = await res.text();
      // All 3 posts should appear (under default limit of 50)
      expect(xml).toContain("Post 0");
      expect(xml).toContain("Post 1");
      expect(xml).toContain("Post 2");
    });

    it("respects RSS_FEED_LIMIT to limit the number of posts", async () => {
      const { app, services } = createFeedTestApp({
        RSS_FEED_LIMIT: "2",
      });

      // Create 5 posts on /feed/all
      for (let i = 0; i < 5; i++) {
        await services.posts.create({
          format: "note",
          title: `Post ${i}`,
          body: `Body ${i}`,
          status: "published",
        });
      }

      const res = await app.request("/feed/all");
      expect(res.status).toBe(200);

      const xml = await res.text();
      // Posts are ordered by publishedAt DESC, so the latest 2 should appear
      // With same timestamp they fall back to id DESC, so Post 4 and Post 3
      expect(xml).toContain("Post 4");
      expect(xml).toContain("Post 3");
      expect(xml).not.toContain("Post 2");
      expect(xml).not.toContain("Post 1");
      expect(xml).not.toContain("Post 0");
    });

    it("falls back to 50 for invalid RSS_FEED_LIMIT", async () => {
      const { app, services } = createFeedTestApp({
        RSS_FEED_LIMIT: "not-a-number",
      });

      // Create 2 posts on /feed/all
      for (let i = 0; i < 2; i++) {
        await services.posts.create({
          format: "note",
          title: `Post ${i}`,
          body: `Body ${i}`,
          status: "published",
        });
      }

      const res = await app.request("/feed/all");
      expect(res.status).toBe(200);

      const xml = await res.text();
      // Both posts should appear (fallback to 50)
      expect(xml).toContain("Post 0");
      expect(xml).toContain("Post 1");
    });

    it("also applies to atom feed", async () => {
      const { app, services } = createFeedTestApp({
        RSS_FEED_LIMIT: "1",
      });

      for (let i = 0; i < 3; i++) {
        await services.posts.create({
          format: "note",
          title: `Post ${i}`,
          body: `Body ${i}`,
          status: "published",
          featured: true,
        });
      }

      const res = await app.request("/feed/atom.xml");
      expect(res.status).toBe(200);

      const xml = await res.text();
      // Only the latest post should appear
      expect(xml).toContain("Post 2");
      expect(xml).not.toContain("Post 1");
      expect(xml).not.toContain("Post 0");
    });
  });
});
