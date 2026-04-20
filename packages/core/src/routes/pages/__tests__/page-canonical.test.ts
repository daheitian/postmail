/**
 * Tests for the `<link rel="canonical">` tag on post pages.
 *
 * Reply URLs render the full thread, so each reply URL would otherwise look
 * like duplicate content to crawlers. The canonical tag points every page in
 * the thread back to the thread root.
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

function extractCanonicalHref(html: string): string | null {
  const match = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"\s*\/?>/i);
  return match?.[1] ?? null;
}

describe("Post page canonical link", () => {
  it("root post canonical points at its own permalink", async () => {
    const { app, services } = createPageTestApp();

    const root = await services.posts.create({
      format: "note",
      title: "Root post",
      bodyMarkdown: "Root body",
      status: "published",
    });

    const res = await app.request(`/${root.slug}`);
    expect(res.status).toBe(200);

    const html = await res.text();
    const canonical = extractCanonicalHref(html);
    expect(canonical).not.toBeNull();
    expect(canonical).toMatch(new RegExp(`/${root.slug}$`));
  });

  it("reply canonical points back to the thread root", async () => {
    const { app, services } = createPageTestApp();

    const root = await services.posts.create({
      format: "note",
      title: "Thread root",
      bodyMarkdown: "Root body",
      status: "published",
    });
    const reply = await services.posts.create({
      format: "note",
      bodyMarkdown: "Reply body",
      replyToId: root.id,
      status: "published",
    });

    // Visiting the reply URL should canonicalize to the root URL.
    const replyRes = await app.request(`/${reply.slug}`);
    expect(replyRes.status).toBe(200);

    const replyHtml = await replyRes.text();
    const replyCanonical = extractCanonicalHref(replyHtml);
    expect(replyCanonical).not.toBeNull();
    expect(replyCanonical).toMatch(new RegExp(`/${root.slug}$`));
    expect(replyCanonical).not.toMatch(new RegExp(`/${reply.slug}$`));

    // And the root URL should canonicalize to itself.
    const rootRes = await app.request(`/${root.slug}`);
    const rootCanonical = extractCanonicalHref(await rootRes.text());
    expect(rootCanonical).toMatch(new RegExp(`/${root.slug}$`));
  });

  it("canonical is absolute when siteUrl is configured", async () => {
    const { app, services } = createPageTestApp();

    const post = await services.posts.create({
      format: "note",
      title: "Absolute test",
      bodyMarkdown: "Body",
      status: "published",
    });

    const res = await app.request(`/${post.slug}`);
    const canonical = extractCanonicalHref(await res.text());
    // SITE_ORIGIN in the test harness is http://localhost:<port>
    expect(canonical).toMatch(/^https?:\/\//);
    expect(canonical).toContain(`/${post.slug}`);
  });
});
