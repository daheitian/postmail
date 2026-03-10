/**
 * Archive Page Route
 *
 * Tumblr-style archive grid with rich filtering:
 * year, collection, format, media types, title presence.
 * Page-based pagination with media-enriched post tiles.
 */

import { Hono } from "hono";
import type {
  Bindings,
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
import { getNavigationData } from "../../lib/navigation.js";
import { renderPublicPage } from "../../lib/render.js";
import {
  createMediaContext,
  toArchiveGroupsWithMedia,
} from "../../lib/view.js";
import { buildMediaMap } from "../../lib/media-helpers.js";
import type { PostFilters } from "../../services/post.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

const PAGE_SIZE = 60;

export const archiveRoutes = new Hono<Env>();

archiveRoutes.get("/", async (c) => {
  const { services, appConfig } = c.var;

  // --- Parse query params ---------------------------------------------------

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

  const VALID_VISIBILITIES = ["public", "unlisted", "private", "featured"];
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

  // --- Resolve collection slug to ID ----------------------------------------

  const collection = collectionSlug
    ? await services.collections.getBySlug(collectionSlug)
    : undefined;
  const collectionId = collection?.id;

  // --- Build timestamp range for year filter --------------------------------

  let publishedAfter: number | undefined;
  let publishedBefore: number | undefined;
  if (validYear) {
    publishedAfter = Date.UTC(validYear, 0, 1) / 1000;
    publishedBefore = Date.UTC(validYear + 1, 0, 1) / 1000;
  }

  // --- Build filters --------------------------------------------------------

  const navData = await getNavigationData(c);

  // --- Map visibility filter to service-level filters -------------------------
  // Visibility filter is only meaningful when authenticated — unauthenticated
  // users cannot see unlisted or private posts regardless of the query param.

  // Default to "public" when authenticated unless explicitly set to "all"
  const effectiveVisibility = navData.isAuthenticated
    ? visibilityAll
      ? undefined
      : (visibility ?? "public")
    : undefined;

  const filters: PostFilters = {
    format,
    status: "published",
    excludeReplies: true,
    excludePrivate: !navData.isAuthenticated,
    excludeUnlisted: !navData.isAuthenticated,
    ...(effectiveVisibility === "featured"
      ? { featured: true }
      : effectiveVisibility
        ? { visibility: effectiveVisibility }
        : {}),
    collectionId,
    publishedAfter,
    publishedBefore,
    mediaKinds: mediaKinds && mediaKinds.length > 0 ? mediaKinds : undefined,
    hasMedia,
    hasTitle,
  };

  // --- Parallel data fetches ------------------------------------------------

  const [totalCount, posts, availableYears, allCollections] = await Promise.all(
    [
      services.posts.count(filters),
      services.posts.list({
        ...filters,
        limit: PAGE_SIZE,
        offset: (currentPage - 1) * PAGE_SIZE,
      }),
      services.posts.getDistinctYears({
        status: "published",
        excludeReplies: true,
      }),
      services.collections.list(),
    ],
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // --- Batch-load media for posts -------------------------------------------

  const postIds = posts.map((p) => p.id);
  const rawMediaMap = await services.media.getByPostIds(postIds);
  const mediaCtx = createMediaContext(appConfig);
  const mediaMap = buildMediaMap(
    rawMediaMap,
    mediaCtx.r2PublicUrl,
    mediaCtx.imageTransformUrl,
    mediaCtx.s3PublicUrl,
  );

  // --- Group posts by year-month with media ---------------------------------

  const grouped = new Map<string, PostWithMedia[]>();
  for (const post of posts) {
    const date = new Date(post.publishedAt * 1000);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Map.set() above guarantees key exists
    grouped.get(key)!.push({
      ...post,
      mediaAttachments: mediaMap.get(post.id) ?? [],
    });
  }

  const groups = toArchiveGroupsWithMedia(grouped, mediaCtx);

  // --- Build active filter state for UI -------------------------------------

  const archiveFilters: ArchiveFilters = {
    year: validYear,
    collectionSlug,
    collectionTitle: collection?.title,
    format,
    mediaKinds: mediaKinds && mediaKinds.length > 0 ? mediaKinds : undefined,
    hasMedia,
    hasTitle,
    visibility: effectiveVisibility,
    view,
  };

  const availableCollectionsList = allCollections.map((col) => ({
    slug: col.slug,
    title: col.title,
  }));

  return renderPublicPage(c, {
    title: `Archive - ${navData.siteName}`,
    navData,
    content: (
      <ArchivePage
        groups={groups}
        currentPage={currentPage}
        totalPages={totalPages}
        filters={archiveFilters}
        availableYears={availableYears}
        availableCollections={availableCollectionsList}
        isAuthenticated={navData.isAuthenticated}
      />
    ),
  });
});
