/**
 * Sitemap Routes
 */

import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { defaultSitemapRenderer } from "../../lib/feed.js";
import { createMediaContext, toPostViewsFromPosts } from "../../lib/view.js";
import { toAbsoluteSiteUrl } from "../../lib/url.js";

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
  const aliasesMap = await c.var.services.paths.getPostAliases(
    posts.map((p) => p.id),
  );
  const aliasMap = new Map<string, string>();
  for (const [id, aliases] of aliasesMap) {
    if (aliases[0]) aliasMap.set(id, aliases[0]);
  }
  const postViews = toPostViewsFromPosts(posts, mediaCtx, undefined, aliasMap);

  const xml = defaultSitemapRenderer({
    siteUrl,
    sitemapUrl: toAbsoluteSiteUrl(
      "/sitemap.xml",
      siteUrl,
      appConfig.sitePathPrefix,
    ),
    posts: postViews,
  });

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=180",
    },
  });
});

// robots.txt
sitemapRoutes.get("/robots.txt", async (c) => {
  const { appConfig } = c.var;
  const siteUrl = appConfig.siteUrl;
  const noindex = appConfig.noindex;

  const rules = noindex
    ? ["Disallow: /"]
    : ["Allow: /", "Disallow: /_/", "Disallow: /*/text/"];
  const robots = [
    `User-agent: *`,
    ...rules,
    "",
    `Sitemap: ${toAbsoluteSiteUrl("/sitemap.xml", siteUrl, appConfig.sitePathPrefix)}`,
    "",
  ].join("\n");

  return new Response(robots, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=180",
    },
  });
});
