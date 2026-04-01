/**
 * Collection Page Route
 */

import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { requireAuth } from "../../middleware/auth.js";
import { CollectionPage } from "../../ui/pages/CollectionPage.js";
import { CollectionEditorPage } from "../../ui/pages/CollectionEditorPage.js";
import { getNavigationData } from "../../lib/navigation.js";
import { formatPageLabel, parsePageNumber } from "../../lib/pagination.js";
import { buildPageTitle } from "../../lib/page-title.js";
import { renderPublicPage } from "../../lib/render.js";
import { CollectionSortOrderSchema } from "../../lib/schemas.js";
import {
  resolveCollectionSortOrder,
  supportsCollectionRatingSort,
} from "../../lib/collection-sort.js";
import { assembleCollectionTimeline } from "../../lib/timeline.js";
import { defaultRssRenderer } from "../../lib/feed.js";
import { buildMediaMap } from "../../lib/media-helpers.js";
import { toISOString } from "../../lib/time.js";
import { createMediaContext, toPostViews } from "../../lib/view.js";
import { toAbsoluteSiteUrl, toPublicPath } from "../../lib/url.js";
import type { I18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { getI18n } from "../../i18n/index.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const collectionRoutes = new Hono<Env>();

function buildCollectionSelectionTitle(
  collections: { title: string }[],
  i18n: I18n,
): string {
  if (collections.length > 1) {
    return i18n._(
      msg({
        message: "Combined Collections",
        comment:
          "@context: Page title when viewing multiple collections together",
      }),
    );
  }
  return collections.map((collection) => collection.title).join(" + ");
}

function getCanonicalSelectionPath(slugExpression: string): string {
  return `/c/${slugExpression}`;
}

function resolveReturnHref(
  value: string | undefined,
  fallback: string,
): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}

collectionRoutes.use("/:slug/edit", requireAuth());

collectionRoutes.get("/:slug/edit", async (c) => {
  const slug = c.req.param("slug");
  const [collection, navData] = await Promise.all([
    c.var.services.collections.getBySlug(slug),
    getNavigationData(c),
  ]);
  if (!collection) return c.notFound();

  const defaultReturnHref = toPublicPath(
    `/c/${collection.slug}`,
    navData.sitePathPrefix,
  );
  const cancelHref = resolveReturnHref(
    c.req.query("returnTo"),
    defaultReturnHref,
  );

  return renderPublicPage(c, {
    title: buildPageTitle("Edit", collection.title, navData.siteName),
    navData,
    content: (
      <CollectionEditorPage
        mode="edit"
        collection={collection}
        cancelHref={cancelHref}
        sitePathPrefix={navData.sitePathPrefix}
      />
    ),
  });
});

collectionRoutes.get("/:slug", async (c) => {
  const slugExpression = c.req.param("slug");
  const page = parsePageNumber(c.req.query("page"));
  const paginatedPageTitle = formatPageLabel(page);

  const [selection, navData] = await Promise.all([
    c.var.services.collections.resolveSelection(slugExpression),
    getNavigationData(c),
  ]);
  if (!selection) return c.notFound();

  const canonicalPagePath = getCanonicalSelectionPath(selection.slugExpression);
  if (slugExpression !== selection.slugExpression) {
    const search = new URL(c.req.url).search;
    return c.redirect(
      toPublicPath(`${canonicalPagePath}${search}`, navData.sitePathPrefix),
      301,
    );
  }

  const sortQuery = c.req.query("sort");
  const requestedSort =
    sortQuery && CollectionSortOrderSchema.safeParse(sortQuery).success
      ? CollectionSortOrderSchema.parse(sortQuery)
      : undefined;
  const primaryCollection = selection.collections[0];
  if (!primaryCollection) return c.notFound();
  const collectionIds = selection.collections.map(
    (collection) => collection.id,
  );
  const isAggregate = selection.collections.length > 1;

  const ratedPostCount = await c.var.services.posts.countUpTo(
    {
      collectionIds,
      status: "published",
      excludePrivate: !navData.isAuthenticated,
      hasRating: true,
    },
    2,
  );
  const showRatingSort = supportsCollectionRatingSort(ratedPostCount);
  const requestedDefaultSort = isAggregate
    ? "newest"
    : primaryCollection.sortOrder;
  const defaultSort = resolveCollectionSortOrder(
    undefined,
    requestedDefaultSort,
    showRatingSort,
  );
  const currentSort = resolveCollectionSortOrder(
    requestedSort,
    defaultSort,
    showRatingSort,
  );

  const {
    items,
    totalCount: totalThreadCount,
    totalPages,
  } = await assembleCollectionTimeline(c, {
    collectionIds,
    page,
    isAuthenticated: navData.isAuthenticated,
    sortOrder: currentSort,
  });
  const i18n = getI18n(c);
  const selectionTitle = buildCollectionSelectionTitle(
    selection.collections,
    i18n,
  );

  return renderPublicPage(c, {
    title:
      page > 1
        ? buildPageTitle(selectionTitle, paginatedPageTitle, navData.siteName)
        : buildPageTitle(selectionTitle, navData.siteName),
    description: isAggregate
      ? undefined
      : (primaryCollection.description ?? undefined),
    navData,
    content: (
      <CollectionPage
        collections={selection.collections}
        items={items}
        totalThreadCount={totalThreadCount}
        currentPage={page}
        totalPages={totalPages}
        pagePath={canonicalPagePath}
        baseUrl={
          currentSort === defaultSort
            ? toPublicPath(canonicalPagePath, navData.sitePathPrefix)
            : toPublicPath(
                `${canonicalPagePath}?sort=${currentSort}`,
                navData.sitePathPrefix,
              )
        }
        currentSort={currentSort}
        defaultSort={defaultSort}
        showRatingSort={showRatingSort}
        isAuthenticated={navData.isAuthenticated}
        sitePathPrefix={navData.sitePathPrefix}
      />
    ),
  });
});

// Collection RSS feed
collectionRoutes.get("/:slug/feed", async (c) => {
  const slugExpression = c.req.param("slug");

  const selection =
    await c.var.services.collections.resolveSelection(slugExpression);
  if (!selection) return c.notFound();

  if (slugExpression !== selection.slugExpression) {
    const search = new URL(c.req.url).search;
    return c.redirect(
      toPublicPath(
        `${getCanonicalSelectionPath(selection.slugExpression)}/feed${search}`,
        c.var.appConfig.sitePathPrefix,
      ),
      301,
    );
  }

  const { appConfig } = c.var;
  const siteName = appConfig.siteName;
  const siteUrl = appConfig.siteUrl;
  const siteLanguage = appConfig.siteLanguage;
  const feedLimit = appConfig.rssFeedLimit;
  const primaryCollection = selection.collections[0];
  if (!primaryCollection) return c.notFound();

  const entries =
    await c.var.services.posts.listCollectionFeedEntriesForCollections(
      selection.collections.map((collection) => collection.id),
      {
        status: "published",
        excludePrivate: true,
        limit: feedLimit,
      },
    );
  const posts = entries.map((entry) => entry.post);

  // Batch load media and aliases for enclosures
  const postIds = posts.map((p) => p.id);
  const [rawMediaMap, aliasesMap] = await Promise.all([
    c.var.services.media.getByPostIds(postIds),
    c.var.services.paths.getPostAliases(postIds),
  ]);
  const mediaCtx = createMediaContext(appConfig);
  const mediaMap = buildMediaMap(
    rawMediaMap,
    mediaCtx.r2PublicUrl,
    mediaCtx.imageTransformUrl,
    mediaCtx.s3PublicUrl,
    mediaCtx.localPublicUrl,
    mediaCtx.sitePathPrefix,
  );
  const aliasMap = new Map<string, string>();
  for (const [id, aliases] of aliasesMap) {
    if (aliases[0]) aliasMap.set(id, aliases[0]);
  }

  const postViews = toPostViews(
    posts.map((p) => ({
      ...p,
      mediaAttachments: mediaMap.get(p.id) ?? [],
    })),
    mediaCtx,
    undefined,
    aliasMap,
  ).map((post, index) => {
    const collectedAt = entries[index]?.collectedAt;
    if (!collectedAt) return post;

    const feedTimestamp = toISOString(collectedAt);
    return {
      ...post,
      feedPublishedAt: feedTimestamp,
      feedUpdatedAt: feedTimestamp,
    };
  });
  const i18nRss = getI18n(c);
  const selectionTitle = buildCollectionSelectionTitle(
    selection.collections,
    i18nRss,
  );

  const xml = defaultRssRenderer({
    siteName: buildPageTitle(selectionTitle, siteName),
    siteDescription:
      selection.collections.length === 1
        ? (primaryCollection.description ?? "")
        : "",
    siteUrl,
    selfUrl: toAbsoluteSiteUrl(
      `${getCanonicalSelectionPath(selection.slugExpression)}/feed`,
      siteUrl,
      appConfig.sitePathPrefix,
    ),
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
