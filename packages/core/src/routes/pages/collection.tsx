/**
 * Collection Page Route
 */

import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { CollectionPage } from "../../ui/pages/CollectionPage.js";
import { getNavigationData } from "../../lib/navigation.js";
import { renderPublicPage } from "../../lib/render.js";
import { createMediaContext, toPostViews } from "../../lib/view.js";
import { defaultRssRenderer } from "../../lib/feed.js";
import { buildMediaMap } from "../../lib/media-helpers.js";
import { CollectionsSidebar } from "../../ui/shared/CollectionsSidebar.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const collectionRoutes = new Hono<Env>();

collectionRoutes.get("/:slug", async (c) => {
  const slug = c.req.param("slug");

  const collection = await c.var.services.collections.getBySlug(slug);
  if (!collection) return c.notFound();

  // Fetch posts, all collections, dividers, and post counts in parallel
  const [posts, allCollections, dividers, postCounts] = await Promise.all([
    c.var.services.posts.list({
      collectionId: collection.id,
      status: "published",
      excludeReplies: true,
    }),
    c.var.services.collections.list(),
    c.var.services.collections.listDividers(),
    c.var.services.collections.getPostCounts(),
  ]);

  const navData = await getNavigationData(c);

  // Batch-load media for posts
  const postIds = posts.map((p) => p.id);
  const rawMediaMap = await c.var.services.media.getByPostIds(postIds);
  const mediaCtx = createMediaContext(c.var.appConfig);
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

  const items = postViews.map((post) => ({ post }));

  return renderPublicPage(c, {
    title: `${collection.title} - ${navData.siteName}`,
    description: collection.description ?? undefined,
    navData,
    sidebar: (
      <CollectionsSidebar
        collections={allCollections}
        dividers={dividers}
        activeSlug={slug}
        isAuthenticated={navData.isAuthenticated}
        postCounts={postCounts}
      />
    ),
    content: (
      <CollectionPage collection={collection} items={items} hasMore={false} />
    ),
  });
});

// Collection RSS feed
collectionRoutes.get("/:slug/feed", async (c) => {
  const slug = c.req.param("slug");

  const collection = await c.var.services.collections.getBySlug(slug);
  if (!collection) return c.notFound();

  const { appConfig } = c.var;
  const siteName = appConfig.siteName;
  const siteUrl = appConfig.siteUrl;
  const siteLanguage = appConfig.siteLanguage;
  const feedLimit = appConfig.rssFeedLimit;

  const posts = await c.var.services.posts.list({
    collectionId: collection.id,
    status: "published",
    excludeReplies: true,
    limit: feedLimit,
  });

  // Batch load media for enclosures
  const postIds = posts.map((p) => p.id);
  const rawMediaMap = await c.var.services.media.getByPostIds(postIds);
  const mediaCtx = createMediaContext(appConfig);
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

  const xml = defaultRssRenderer({
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
