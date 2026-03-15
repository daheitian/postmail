/**
 * Collection Page Route
 */

import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { CollectionPage } from "../../ui/pages/CollectionPage.js";
import { getNavigationData } from "../../lib/navigation.js";
import { formatPageLabel, parsePageNumber } from "../../lib/pagination.js";
import { buildPageTitle } from "../../lib/page-title.js";
import { renderPublicPage } from "../../lib/render.js";
import { SortOrderSchema } from "../../lib/schemas.js";
import {
  resolveCollectionSortOrder,
  supportsCollectionRatingSort,
} from "../../lib/collection-sort.js";
import { assembleCollectionTimeline } from "../../lib/timeline.js";
import { defaultRssRenderer } from "../../lib/feed.js";
import { buildMediaMap } from "../../lib/media-helpers.js";
import { createMediaContext, toPostViews } from "../../lib/view.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const collectionRoutes = new Hono<Env>();

collectionRoutes.get("/:slug", async (c) => {
  const slug = c.req.param("slug");
  const page = parsePageNumber(c.req.query("page"));
  const paginatedPageTitle = formatPageLabel(page);

  // Start navData + collection fetch in parallel
  const [collection, navData] = await Promise.all([
    c.var.services.collections.getBySlug(slug),
    getNavigationData(c),
  ]);
  if (!collection) return c.notFound();
  const sortQuery = c.req.query("sort");
  const requestedSort =
    sortQuery && SortOrderSchema.safeParse(sortQuery).success
      ? SortOrderSchema.parse(sortQuery)
      : undefined;

  const [totalCount, ratedPostCount] = await Promise.all([
    c.var.services.posts.count({
      collectionId: collection.id,
      status: "published",
      excludePrivate: !navData.isAuthenticated,
    }),
    c.var.services.posts.count({
      collectionId: collection.id,
      status: "published",
      excludePrivate: !navData.isAuthenticated,
      hasRating: true,
    }),
  ]);
  const showRatingSort = supportsCollectionRatingSort(ratedPostCount);
  const defaultSort = resolveCollectionSortOrder(
    undefined,
    collection.sortOrder,
    showRatingSort,
  );
  const currentSort = resolveCollectionSortOrder(
    requestedSort,
    defaultSort,
    showRatingSort,
  );

  const { items, totalPages } = await assembleCollectionTimeline(c, {
    collectionId: collection.id,
    page,
    isAuthenticated: navData.isAuthenticated,
    sortOrder: currentSort,
  });

  return renderPublicPage(c, {
    title:
      page > 1
        ? buildPageTitle(collection.title, paginatedPageTitle, navData.siteName)
        : buildPageTitle(collection.title, navData.siteName),
    description: collection.description ?? undefined,
    navData,
    content: (
      <CollectionPage
        collection={collection}
        items={items}
        totalCount={totalCount}
        currentPage={page}
        totalPages={totalPages}
        baseUrl={
          currentSort === defaultSort
            ? `/c/${collection.slug}`
            : `/c/${collection.slug}?sort=${currentSort}`
        }
        currentSort={currentSort}
        defaultSort={defaultSort}
        showRatingSort={showRatingSort}
        isAuthenticated={navData.isAuthenticated}
      />
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
    siteName: buildPageTitle(collection.title, siteName),
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
