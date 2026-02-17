/**
 * Sitemap Routes
 */

import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../app.js";
import { defaultSitemapRenderer } from "../../lib/feed.js";
import {
  createMediaContext,
  toPostViewsFromPosts,
  toPageView,
} from "../../lib/view.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const sitemapRoutes = new Hono<Env>();

// XML Sitemap
sitemapRoutes.get("/sitemap.xml", async (c) => {
  const siteUrl = c.env.SITE_URL;

  const posts = await c.var.services.posts.list({
    status: "published",
    excludeReplies: true,
    limit: 1000,
  });

  // Fetch published pages
  const allPages = await c.var.services.pages.list();
  const publishedPages = allPages.filter((p) => p.status === "published");

  // Transform to View Models
  const mediaCtx = createMediaContext(c);
  const postViews = toPostViewsFromPosts(posts, mediaCtx);
  const pageViews = publishedPages.map(toPageView);

  const renderer = c.var.config.feed?.sitemap ?? defaultSitemapRenderer;
  const xml = renderer({ siteUrl, posts: postViews, pages: pageViews });

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
});

// robots.txt
sitemapRoutes.get("/robots.txt", async (c) => {
  const siteUrl = c.env.SITE_URL;
  const noindex = (await c.var.services.settings.get("NOINDEX")) === "true";

  const directive = noindex ? "Disallow: /" : "Allow: /";
  const robots = `User-agent: *
${directive}

Sitemap: ${siteUrl}/sitemap.xml
`;

  return new Response(robots, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
});
