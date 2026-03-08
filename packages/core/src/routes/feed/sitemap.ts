/**
 * Sitemap Routes
 */

import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { defaultSitemapRenderer } from "../../lib/feed.js";
import { createMediaContext, toPostViewsFromPosts } from "../../lib/view.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const sitemapRoutes = new Hono<Env>();

// XML Sitemap
sitemapRoutes.get("/sitemap.xml", async (c) => {
  const { appConfig } = c.var;
  const siteUrl = appConfig.siteUrl;

  const posts = await c.var.services.posts.list({
    status: "published",
    excludeReplies: true,
    excludePrivate: true,
    limit: 1000,
  });

  // Transform to View Models
  const mediaCtx = createMediaContext(appConfig);
  const postViews = toPostViewsFromPosts(posts, mediaCtx);

  const xml = defaultSitemapRenderer({
    siteUrl,
    posts: postViews,
  });

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
});

// robots.txt
sitemapRoutes.get("/robots.txt", async (c) => {
  const { appConfig } = c.var;
  const siteUrl = appConfig.siteUrl;
  const noindex = appConfig.noindex;

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
