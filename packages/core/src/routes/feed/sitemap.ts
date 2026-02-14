/**
 * Sitemap Routes
 */

import { Hono } from "hono";
import type { Bindings, SitemapData } from "../../types.js";
import type { AppVariables } from "../../app.js";
import { defaultSitemapRenderer } from "../../lib/feed.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const sitemapRoutes = new Hono<Env>();

// XML Sitemap
sitemapRoutes.get("/sitemap.xml", async (c) => {
  const siteUrl = c.env.SITE_URL;

  const posts = await c.var.services.posts.list({
    visibility: ["featured", "quiet"],
    limit: 1000,
  });

  const sitemapData: SitemapData = { siteUrl, posts };

  const renderer = c.var.config.theme?.feed?.sitemap ?? defaultSitemapRenderer;
  const xml = renderer(sitemapData);

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
