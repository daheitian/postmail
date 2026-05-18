/**
 * Tests for the `<title>` tag on post pages.
 *
 * Post pages compose `<title>` as "Post Title - Site Name" so the site
 * name is visible in browser tabs, bookmarks, and SEO snippets, matching
 * the convention used by Settings, Search, Archive, and Collection pages.
 */

import { describe, expect, it } from "vitest";
import { createTestApp } from "../../../__tests__/helpers/app.js";
import { pageRoutes } from "../page.js";

function createPageTestApp() {
  const testApp = createTestApp();
  const { app } = testApp;

  app.use("*", async (c, next) => {
    c.set("publicPath", c.req.path);
    c.set("publicRequestUrl", c.req.url);
    await next();
  });

  app.route("/", pageRoutes);

  return testApp;
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title>([^<]*)<\/title>/i);
  return match?.[1] ?? null;
}

describe("Post page <title>", () => {
  it("appends the site name to the post title", async () => {
    const { app, services } = createPageTestApp();
    await services.settings.set("SITE_NAME", "Owen");

    const post = await services.posts.create({
      format: "note",
      title: "Hello world",
      bodyMarkdown: "Body",
      status: "published",
    });

    const res = await app.request(`/${post.slug}`);
    expect(res.status).toBe(200);

    const html = await res.text();
    expect(extractTitle(html)).toBe("Hello world - Owen");
  });

  it("falls back to derived meta title when post has no title", async () => {
    const { app, services } = createPageTestApp();
    await services.settings.set("SITE_NAME", "Owen");

    const post = await services.posts.create({
      format: "note",
      bodyMarkdown: "First sentence of the body.",
      status: "published",
    });

    const res = await app.request(`/${post.slug}`);
    expect(res.status).toBe(200);

    const html = await res.text();
    const title = extractTitle(html);
    expect(title).toMatch(/- Owen$/);
    expect(title).toContain("First sentence");
  });
});
