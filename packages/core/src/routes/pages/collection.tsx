/**
 * Collection Page Route
 */

import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../app.js";
import { CollectionPage } from "../../ui/pages/CollectionPage.js";
import { getNavigationData } from "../../lib/navigation.js";
import { renderPublicPage } from "../../lib/render.js";
import {
  createMediaContext,
  toPostViewsFromPosts,
  toPostViews,
} from "../../lib/view.js";
import { defaultRssRenderer } from "../../lib/feed.js";
import { getSiteLanguage } from "../../lib/config.js";
import { buildMediaMap } from "../../lib/media-helpers.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const collectionRoutes = new Hono<Env>();

collectionRoutes.get("/:slug", async (c) => {
  const slug = c.req.param("slug");

  const collection = await c.var.services.collections.getBySlug(slug);
  if (!collection) return c.notFound();

  // Fetch posts in this collection
  const posts = await c.var.services.posts.list({
    collectionId: collection.id,
    status: "published",
    excludeReplies: true,
  });

  const navData = await getNavigationData(c);

  // Transform to View Models
  const mediaCtx = createMediaContext(c);
  const postViews = toPostViewsFromPosts(posts, mediaCtx);

  return renderPublicPage(c, {
    title: `${collection.title} - ${navData.siteName}`,
    description: collection.description ?? undefined,
    navData,
    content: (
      <CollectionPage
        collection={collection}
        posts={postViews}
        hasMore={false}
      />
    ),
  });
});

// Collection RSS feed
collectionRoutes.get("/:slug/feed", async (c) => {
  const slug = c.req.param("slug");

  const collection = await c.var.services.collections.getBySlug(slug);
  if (!collection) return c.notFound();

  const all = await c.var.services.settings.getAll();
  const siteName = all["SITE_NAME"] ?? "Jant";
  const siteUrl = c.env.SITE_URL;
  const siteLanguage = await getSiteLanguage(c);

  const feedLimit = parseInt(c.env.RSS_FEED_LIMIT ?? "50", 10) || 50;

  const posts = await c.var.services.posts.list({
    collectionId: collection.id,
    status: "published",
    excludeReplies: true,
    limit: feedLimit,
  });

  // Batch load media for enclosures
  const postIds = posts.map((p) => p.id);
  const rawMediaMap = await c.var.services.media.getByPostIds(postIds);
  const mediaCtx = createMediaContext(c);
  const mediaMap = buildMediaMap(
    rawMediaMap,
    mediaCtx.r2PublicUrl,
    mediaCtx.imageTransformUrl,
    mediaCtx.s3PublicUrl,
  );

  const postViews = toPostViews(
    posts.map((p) => ({
      ...p,
      mediaAttachments: mediaMap.get(p.id) ?? [],
    })),
    mediaCtx,
  );

  const renderer = c.var.config.feed?.rss ?? defaultRssRenderer;
  const xml = renderer({
    siteName: `${collection.title} - ${siteName}`,
    siteDescription: collection.description ?? "",
    siteUrl,
    siteLanguage,
    posts: postViews,
  });

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
});
