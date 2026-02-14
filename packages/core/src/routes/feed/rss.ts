/**
 * RSS Feed Routes
 */

import { Hono } from "hono";
import type { Context } from "hono";
import type { Bindings, FeedData } from "../../types.js";
import type { AppVariables } from "../../app.js";
import { defaultRssRenderer, defaultAtomRenderer } from "../../lib/feed.js";
import { getSiteLanguage } from "../../lib/config.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const rssRoutes = new Hono<Env>();

/**
 * Build FeedData from the Hono context.
 */
async function buildFeedData(c: Context<Env>): Promise<FeedData> {
  const all = await c.var.services.settings.getAll();
  const siteName = all["SITE_NAME"] ?? "Jant";
  const siteDescription = all["SITE_DESCRIPTION"] ?? "";
  const siteUrl = c.env.SITE_URL;
  const siteLanguage = await getSiteLanguage(c);
  const r2PublicUrl = c.env.R2_PUBLIC_URL;
  const s3PublicUrl = c.env.S3_PUBLIC_URL;

  const posts = await c.var.services.posts.list({
    visibility: ["featured", "quiet"],
    limit: 50,
  });

  // Batch load media for enclosures
  const postIds = posts.map((p) => p.id);
  const mediaMap = await c.var.services.media.getByPostIds(postIds);

  return {
    siteName,
    siteDescription,
    siteUrl,
    siteLanguage,
    posts,
    mediaMap,
    r2PublicUrl,
    s3PublicUrl,
  };
}

// RSS 2.0 Feed - main feed at /feed
rssRoutes.get("/", async (c) => {
  const feedData = await buildFeedData(c);

  const renderer = c.var.config.theme?.feed?.rss ?? defaultRssRenderer;
  const xml = renderer(feedData);

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
});

// Atom Feed
rssRoutes.get("/atom.xml", async (c) => {
  const feedData = await buildFeedData(c);

  const renderer = c.var.config.theme?.feed?.atom ?? defaultAtomRenderer;
  const xml = renderer(feedData);

  return new Response(xml, {
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
    },
  });
});
