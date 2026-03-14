/**
 * Collection Page Route
 */

import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { CollectionPage } from "../../ui/pages/CollectionPage.js";
import { getNavigationData } from "../../lib/navigation.js";
import { renderPublicPage } from "../../lib/render.js";
import {
  createMediaContext,
  toPostViews,
  loadThreadRootPermalinks,
} from "../../lib/view.js";
import { defaultRssRenderer } from "../../lib/feed.js";
import { buildMediaMap } from "../../lib/media-helpers.js";
import { CollectionsSidebar } from "../../ui/shared/CollectionsSidebar.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const collectionRoutes = new Hono<Env>();

collectionRoutes.get("/:slug", async (c) => {
  const slug = c.req.param("slug");

  // Start navData + collection fetch in parallel
  const [collection, navData] = await Promise.all([
    c.var.services.collections.getBySlug(slug),
    getNavigationData(c),
  ]);
  if (!collection) return c.notFound();

  // Fetch posts, all collections, sidebar items, and post counts in parallel
  const [posts, allCollections, sidebarItems, postCounts] = await Promise.all([
    c.var.services.posts.list({
      collectionId: collection.id,
      status: "published",
      excludePrivate: !navData.isAuthenticated,
    }),
    c.var.services.collections.list(),
    c.var.services.collections.listSidebarItems(),
    c.var.services.collections.getPostCounts(),
  ]);

  // Batch-load media and thread root permalinks in parallel
  const postIds = posts.map((p) => p.id);
  const [rawMediaMap, rootPermalinkMap] = await Promise.all([
    c.var.services.media.getByPostIds(postIds),
    loadThreadRootPermalinks(
      posts,
      c.var.services.posts.getById.bind(c.var.services.posts),
    ),
  ]);
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
    rootPermalinkMap,
  );

  const items = postViews.map((post) => ({ post }));

  return renderPublicPage(c, {
    title: `${collection.title} - ${navData.siteName}`,
    description: collection.description ?? undefined,
    navData,
    sidebar: (
      <CollectionsSidebar
        collections={allCollections}
        sidebarItems={sidebarItems}
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
    excludePrivate: true,
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
      "Cache-Control": "public, max-age=180",
    },
  });
});
