/**
 * Sitemap Routes
 */

import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../app.js";
import { defaultSitemapRenderer } from "../../lib/feed.js";
import { createMediaContext, toPostViewsFromPosts } from "../../lib/view.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const sitemapRoutes = new Hono<Env>();

// XML Sitemap
sitemapRoutes.get("/sitemap.xml", async (c) => {
  const siteUrl = c.env.SITE_URL;

  const posts = await c.var.services.posts.list({
    visibility: ["featured", "quiet"],
    limit: 1000,
  });

  // Transform to PostView[]
  const mediaCtx = createMediaContext(c);
  const postViews = toPostViewsFromPosts(posts, mediaCtx);

  const renderer = c.var.config.theme?.feed?.sitemap ?? defaultSitemapRenderer;
  const xml = renderer({ siteUrl, posts: postViews });

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
});

// robots.txt
sitemapRoutes.get("/robots.txt", (c) => {
  const siteUrl = c.env.SITE_URL;

  const robots = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`;

  return new Response(robots, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
});
