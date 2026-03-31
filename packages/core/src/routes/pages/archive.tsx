/**
 * Archive Page Route
 *
 * Tumblr-style archive grid with rich filtering:
 * year, collection, format, media types, title presence.
 * Page-based pagination with media-enriched thread-root tiles.
 *
 * Also serves filtered RSS/Atom feeds at /archive/feed and /archive/feed/atom.xml.
 */

import { msg } from "@lingui/core/macro";
import { Hono } from "hono";
import type { Context } from "hono";
import type {
  Bindings,
  FeedData,
  Format,
  MediaKind,
  PostWithMedia,
} from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import type {
  ArchiveFilters,
  ArchiveView,
  ArchiveVisibility,
} from "../../types/props.js";
import { FORMATS, MEDIA_KINDS } from "../../types.js";
import { ArchivePage } from "../../ui/pages/ArchivePage.js";
import { defaultRssRenderer, defaultAtomRenderer } from "../../lib/feed.js";
import { getNavigationData } from "../../lib/navigation.js";
import { buildPageTitle } from "../../lib/page-title.js";
import { renderPublicPage } from "../../lib/render.js";
import { formatYearMonth } from "../../lib/time.js";
import { toAbsoluteSiteUrl } from "../../lib/url.js";
import {
  createMediaContext,
  toArchiveGroupsWithMedia,
  toPostViews,
} from "../../lib/view.js";
import { buildMediaMap } from "../../lib/media-helpers.js";
import { assembleTimelineItems } from "../../lib/timeline.js";
import { getI18n } from "../../i18n/index.js";
import type { PostFilters } from "../../services/post.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

// =============================================================================
// Shared filter parsing
// =============================================================================

/** Parsed archive query parameters (before service-level filter conversion). */
interface ParsedArchiveParams {
  format?: Format;
  validYear?: number;
  collectionSlug?: string;
  mediaKinds?: MediaKind[];
  hasMedia?: boolean;
  hasTitle?: boolean;
  visibility?: ArchiveVisibility;
  visibilityAll: boolean;
  view?: ArchiveView;
  currentPage: number;
}

/**
 * Parse archive filter query parameters from the request.
 *
 * @param c - Hono context
 * @returns Parsed and validated query parameters
 */
function parseArchiveParams(c: Context<Env>): ParsedArchiveParams {
  const formatParam = c.req.query("format") as Format | undefined;
  const format =
    formatParam && FORMATS.includes(formatParam) ? formatParam : undefined;

  const yearParam = c.req.query("year");
  const year = yearParam ? parseInt(yearParam, 10) : undefined;
  const validYear = year && !isNaN(year) && year > 1970 ? year : undefined;

  const collectionSlug = c.req.query("collection") || undefined;

  const mediaParam = c.req.query("media") || undefined;
  const mediaKinds = mediaParam
    ? (mediaParam
        .split(",")
        .filter((m): m is MediaKind =>
          (MEDIA_KINDS as readonly string[]).includes(m),
        ) as MediaKind[])
    : undefined;

  const hasMediaParam = c.req.query("hasMedia");
  const hasMedia =
    hasMediaParam === "1" ? true : hasMediaParam === "0" ? false : undefined;

  const hasTitleParam = c.req.query("hasTitle");
  const hasTitle =
    hasTitleParam === "1" ? true : hasTitleParam === "0" ? false : undefined;

  const VALID_VISIBILITIES = ["public", "latest_hidden", "private", "featured"];
  const visibilityParam = c.req.query("visibility");
  const visibilityAll = visibilityParam === "all";
  const visibility =
    visibilityParam && VALID_VISIBILITIES.includes(visibilityParam)
      ? (visibilityParam as ArchiveVisibility)
      : undefined;

  const viewParam = c.req.query("view") as ArchiveView | undefined;
  const view =
    viewParam && (viewParam === "grid" || viewParam === "list")
      ? viewParam
      : undefined;

  const pageParam = c.req.query("page");
  const currentPage = Math.max(1, parseInt(pageParam || "1", 10) || 1);

  return {
    format,
    validYear,
    collectionSlug,
    mediaKinds: mediaKinds && mediaKinds.length > 0 ? mediaKinds : undefined,
    hasMedia,
    hasTitle,
    visibility,
    visibilityAll,
    view,
    currentPage,
  };
}

/**
 * Build PostFilters from parsed archive params.
 *
 * @param params - Parsed query params
 * @param opts - Auth & collection context
 * @returns PostFilters for the post service
 */
function buildArchivePostFilters(
  params: ParsedArchiveParams,
  opts: {
    isAuthenticated: boolean;
    collectionId?: string;
  },
): PostFilters {
  const { isAuthenticated, collectionId } = opts;

  // Map visibility: feed routes force public; page respects auth
  const effectiveVisibility = isAuthenticated
    ? params.visibilityAll
      ? undefined
      : (params.visibility ?? "public")
    : undefined;

  let publishedAfter: number | undefined;
  let publishedBefore: number | undefined;
  if (params.validYear) {
    publishedAfter = Date.UTC(params.validYear, 0, 1) / 1000;
    publishedBefore = Date.UTC(params.validYear + 1, 0, 1) / 1000;
  }

  return {
    format: params.format,
    status: "published",
    excludeReplies: true,
    excludePrivate: !isAuthenticated,
    excludeLatestHidden: !isAuthenticated,
    ...(effectiveVisibility === "featured"
      ? { featured: true }
      : effectiveVisibility
        ? { visibility: effectiveVisibility }
        : {}),
    collectionId,
    publishedAfter,
    publishedBefore,
    mediaKinds: params.mediaKinds,
    hasMedia: params.hasMedia,
    hasTitle: params.hasTitle,
  };
}

/**
 * Build a query string from parsed archive params (for feed self-URL and
 * archive page feed link). Omits page-only params (view, page).
 */
function buildArchiveFeedQuery(params: ParsedArchiveParams): string {
  const qs = new URLSearchParams();
  if (params.format) qs.set("format", params.format);
  if (params.validYear) qs.set("year", String(params.validYear));
  if (params.collectionSlug) qs.set("collection", params.collectionSlug);
  if (params.mediaKinds && params.mediaKinds.length > 0) {
    qs.set("media", params.mediaKinds.join(","));
  }
  if (params.hasMedia !== undefined) {
    qs.set("hasMedia", params.hasMedia ? "1" : "0");
  }
  if (params.hasTitle !== undefined) {
    qs.set("hasTitle", params.hasTitle ? "1" : "0");
  }
  const str = qs.toString();
  return str ? `?${str}` : "";
}

export const archiveRoutes = new Hono<Env>();

// =============================================================================
// Archive page
// =============================================================================

archiveRoutes.get("/", async (c) => {
  const { services, appConfig } = c.var;
  const pageSize = appConfig.archivePageSize;
  const params = parseArchiveParams(c);

  // --- Resolve collection slug to ID ----------------------------------------

  const collection = params.collectionSlug
    ? await services.collections.getBySlug(params.collectionSlug)
    : undefined;
  const collectionId = collection?.id;

  const navData = await getNavigationData(c);

  const filters = buildArchivePostFilters(params, {
    isAuthenticated: navData.isAuthenticated,
    collectionId,
  });

  // --- Parallel data fetches ------------------------------------------------

  const [totalCount, monthlyCounts, posts, availableYears, allCollections] =
    await Promise.all([
      services.posts.count(filters),
      services.posts.countByYearMonth(filters),
      services.posts.list({
        ...filters,
        limit: pageSize,
        offset: (params.currentPage - 1) * pageSize,
      }),
      services.posts.getDistinctYears({
        status: "published",
        excludeReplies: true,
      }),
      services.collections.list(),
    ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // --- Group posts by year-month --------------------------------------------

  const grouped = new Map<string, PostWithMedia[]>();
  for (const post of posts) {
    const publishedAt = post.publishedAt ?? post.updatedAt;
    const key = formatYearMonth(publishedAt, appConfig.timeZone);
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Map.set() above guarantees key exists
    grouped.get(key)!.push({
      ...post,
      mediaAttachments: [],
    });
  }

  const monthlyCountMap = new Map(
    monthlyCounts.map((row) => [row.yearMonth, row.count] as const),
  );
  const mediaCtx = createMediaContext(appConfig);
  const allPostIds = posts.map((p) => p.id);
  const archiveAliasesMap =
    await c.var.services.paths.getPostAliases(allPostIds);
  const archiveAliasMap = new Map<string, string>();
  for (const [id, aliases] of archiveAliasesMap) {
    if (aliases[0]) archiveAliasMap.set(id, aliases[0]);
  }
  const groups =
    params.view === "list"
      ? await (async () => {
          const items = await assembleTimelineItems(c, posts);
          const itemsById = new Map(items.map((item) => [item.post.id, item]));

          return toArchiveGroupsWithMedia(
            grouped,
            mediaCtx,
            archiveAliasMap,
          ).map((group) => ({
            ...group,
            posts: [],
            items: group.posts
              .map((post) => itemsById.get(post.id))
              .filter((item): item is NonNullable<typeof item> => !!item),
            totalCount:
              monthlyCountMap.get(`${group.year}-${group.month}`) ??
              group.posts.length,
          }));
        })()
      : await (async () => {
          const postIds = posts.map((p) => p.id);
          const [rawMediaMap, replyCounts] = await Promise.all([
            services.media.getByPostIds(postIds),
            services.posts.getReplyCounts(postIds),
          ]);
          const mediaMap = buildMediaMap(
            rawMediaMap,
            mediaCtx.r2PublicUrl,
            mediaCtx.imageTransformUrl,
            mediaCtx.s3PublicUrl,
            mediaCtx.localPublicUrl,
            mediaCtx.sitePathPrefix,
          );

          for (const [key, monthPosts] of grouped) {
            grouped.set(
              key,
              monthPosts.map((post) => ({
                ...post,
                mediaAttachments: mediaMap.get(post.id) ?? [],
              })),
            );
          }

          return toArchiveGroupsWithMedia(
            grouped,
            mediaCtx,
            archiveAliasMap,
          ).map((group) => ({
            ...group,
            posts: group.posts.map((post) => ({
              ...post,
              replyCount: replyCounts.get(post.id) ?? undefined,
            })),
            totalCount:
              monthlyCountMap.get(`${group.year}-${group.month}`) ??
              group.posts.length,
          }));
        })();

  // --- Build active filter state for UI -------------------------------------

  const effectiveVisibility = navData.isAuthenticated
    ? params.visibilityAll
      ? undefined
      : (params.visibility ?? "public")
    : undefined;

  const archiveFilters: ArchiveFilters = {
    year: params.validYear,
    collectionSlug: params.collectionSlug,
    collectionTitle: collection?.title,
    format: params.format,
    mediaKinds: params.mediaKinds,
    hasMedia: params.hasMedia,
    hasTitle: params.hasTitle,
    visibility: effectiveVisibility,
    view: params.view,
  };

  const feedQuery = buildArchiveFeedQuery(params);

  const availableCollectionsList = allCollections.map((col) => ({
    slug: col.slug,
    title: col.title,
  }));

  return renderPublicPage(c, {
    title: buildPageTitle("Archive", navData.siteName),
    navData,
    content: (
      <ArchivePage
        groups={groups}
        totalCount={totalCount}
        currentPage={params.currentPage}
        totalPages={totalPages}
        filters={archiveFilters}
        availableYears={availableYears}
        availableCollections={availableCollectionsList}
        isAuthenticated={navData.isAuthenticated}
        sitePathPrefix={navData.sitePathPrefix}
        timeZone={appConfig.timeZone}
        feedHref={`/archive/feed${feedQuery}`}
      />
    ),
  });
});

// =============================================================================
// Archive feed
// =============================================================================

/**
 * Build a descriptive feed title from active filters.
 *
 * @param c - Hono context
 * @param params - Parsed archive filter params
 * @param collectionTitle - Resolved collection title (if any)
 * @returns Feed title string, e.g. "Site - Archive: Notes without title"
 */
function buildArchiveFeedTitle(
  c: Context<Env>,
  params: ParsedArchiveParams,
  collectionTitle?: string,
): string {
  const i18n = getI18n(c);
  const siteName = c.var.appConfig.siteName;

  const parts: string[] = [];

  if (params.format) {
    const formatLabels: Record<string, string> = {
      note: i18n._(
        msg({
          message: "Notes",
          comment:
            "@context: Archive feed title segment for note format filter",
        }),
      ),
      link: i18n._(
        msg({
          message: "Links",
          comment:
            "@context: Archive feed title segment for link format filter",
        }),
      ),
      quote: i18n._(
        msg({
          message: "Quotes",
          comment:
            "@context: Archive feed title segment for quote format filter",
        }),
      ),
    };
    parts.push(formatLabels[params.format] ?? params.format);
  }

  if (collectionTitle) {
    parts.push(collectionTitle);
  }

  if (params.hasTitle === false) {
    parts.push(
      i18n._(
        msg({
          message: "without title",
          comment: "@context: Archive feed title segment for hasTitle=0 filter",
        }),
      ),
    );
  } else if (params.hasTitle === true) {
    parts.push(
      i18n._(
        msg({
          message: "with title",
          comment: "@context: Archive feed title segment for hasTitle=1 filter",
        }),
      ),
    );
  }

  if (params.hasMedia === true) {
    parts.push(
      i18n._(
        msg({
          message: "with media",
          comment: "@context: Archive feed title segment for hasMedia=1 filter",
        }),
      ),
    );
  } else if (params.hasMedia === false) {
    parts.push(
      i18n._(
        msg({
          message: "without media",
          comment: "@context: Archive feed title segment for hasMedia=0 filter",
        }),
      ),
    );
  }

  if (params.validYear) {
    parts.push(String(params.validYear));
  }

  const archiveLabel = i18n._(
    msg({
      message: "Archive",
      comment: "@context: Archive feed title prefix",
    }),
  );

  if (parts.length === 0) {
    return `${siteName} - ${archiveLabel}`;
  }

  return `${siteName} - ${archiveLabel}: ${parts.join(", ")}`;
}

async function buildArchiveFeedData(
  c: Context<Env>,
  selfPath: string,
): Promise<FeedData> {
  const { appConfig, services } = c.var;
  const params = parseArchiveParams(c);

  const collection = params.collectionSlug
    ? await services.collections.getBySlug(params.collectionSlug)
    : undefined;

  // Feed always serves public-only content
  const filters: PostFilters = {
    format: params.format,
    status: "published",
    excludeReplies: true,
    excludePrivate: true,
    excludeLatestHidden: true,
    collectionId: collection?.id,
    mediaKinds: params.mediaKinds,
    hasMedia: params.hasMedia,
    hasTitle: params.hasTitle,
    ...(params.validYear
      ? {
          publishedAfter: Date.UTC(params.validYear, 0, 1) / 1000,
          publishedBefore: Date.UTC(params.validYear + 1, 0, 1) / 1000,
        }
      : {}),
    limit: appConfig.rssFeedLimit,
  };

  const posts = await services.posts.list(filters);

  // Batch load media and aliases
  const postIds = posts.map((p) => p.id);
  const [rawMediaMap, aliasesMap] = await Promise.all([
    services.media.getByPostIds(postIds),
    services.paths.getPostAliases(postIds),
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
  );

  const feedQuery = buildArchiveFeedQuery(params);

  return {
    siteName: appConfig.siteName,
    siteDescription: appConfig.siteDescription,
    siteUrl: appConfig.siteUrl,
    siteLanguage: appConfig.siteLanguage,
    title: buildArchiveFeedTitle(c, params, collection?.title),
    selfUrl: toAbsoluteSiteUrl(
      `${selfPath}${feedQuery}`,
      appConfig.siteUrl,
      appConfig.sitePathPrefix,
    ),
    posts: postViews,
  };
}

// RSS 2.0 — /archive/feed
archiveRoutes.get("/feed", async (c) => {
  const feedData = await buildArchiveFeedData(c, "/archive/feed");
  return new Response(defaultRssRenderer(feedData), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=180",
    },
  });
});

// Atom — /archive/feed/atom.xml
archiveRoutes.get("/feed/atom.xml", async (c) => {
  const feedData = await buildArchiveFeedData(c, "/archive/feed/atom.xml");
  return new Response(defaultAtomRenderer(feedData), {
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
      "Cache-Control": "public, max-age=180",
    },
  });
});
