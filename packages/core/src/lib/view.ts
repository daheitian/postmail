/**
 * View Model Conversions (v2)
 *
 * Transforms raw database models into render-ready View types.
 * Theme components receive only View types -- no lib/ imports needed.
 */

import type {
  Post,
  PostWithMedia,
  Media,
  MediaView,
  PostView,
  CollectionTagView,
  NavItemView,
  NavItem,
  SearchResult,
  SearchResultView,
  ArchiveGroup,
  Collection,
  Format,
  Status,
  NavItemType,
  AppConfig,
} from "../types.js";
import {
  toISOString,
  formatDate,
  formatTime,
  formatRelativeTime,
} from "./time.js";
import { getMediaUrl, getImageUrl, getPublicUrlForProvider } from "./image.js";
import { getHtmlExcerpt } from "./excerpt.js";
import { highlightText } from "./search-snippet.js";
import { renderCollectionIcon } from "./icons.js";
import { escapeHtml } from "./html.js";
import { toPublicPath } from "./url.js";

// =============================================================================
// Media Context
// =============================================================================

/**
 * Central media config -- extracted once per request from appConfig.
 */
export interface MediaContext {
  r2PublicUrl?: string;
  imageTransformUrl?: string;
  s3PublicUrl?: string;
  sitePathPrefix?: string;
}

/**
 * Creates a MediaContext from AppConfig.
 *
 * @param appConfig - Resolved app configuration
 * @returns MediaContext with URL values
 */
export function createMediaContext(appConfig: AppConfig): MediaContext {
  return {
    r2PublicUrl: appConfig.r2PublicUrl || undefined,
    imageTransformUrl: appConfig.imageTransformUrl || undefined,
    s3PublicUrl: appConfig.s3PublicUrl || undefined,
    sitePathPrefix: appConfig.sitePathPrefix || undefined,
  };
}

// =============================================================================
// Media Conversions
// =============================================================================

/**
 * Converts a raw Media record to a render-ready MediaView.
 *
 * @param media - Raw media record from database
 * @param ctx - Media context with URL configuration
 * @returns Render-ready MediaView with pre-computed URLs
 */
export function toMediaView(media: Media, ctx: MediaContext): MediaView {
  const publicUrl = getPublicUrlForProvider(
    media.provider,
    ctx.r2PublicUrl,
    ctx.s3PublicUrl,
  );
  const url = getMediaUrl(media.storageKey, publicUrl, ctx.sitePathPrefix);

  // Only apply image transforms for image MIME types
  const thumbnailUrl = media.mimeType.startsWith("image/")
    ? getImageUrl(url, ctx.imageTransformUrl, {
        width: 1200,
        height: 768,
        quality: 80,
        format: "auto",
        fit: "scale-down",
      })
    : url;

  const posterRawUrl = media.posterKey
    ? getMediaUrl(media.posterKey, publicUrl, ctx.sitePathPrefix)
    : undefined;
  const posterUrl = posterRawUrl
    ? getImageUrl(posterRawUrl, ctx.imageTransformUrl, {
        width: 640,
        quality: 80,
        format: "auto",
        fit: "scale-down",
      })
    : undefined;

  return {
    id: media.id,
    url,
    thumbnailUrl,
    mimeType: media.mimeType,
    altText: media.alt ?? undefined,
    width: media.width ?? undefined,
    height: media.height ?? undefined,
    size: media.size,
    blurhash: media.blurhash ?? undefined,
    waveform: media.waveform ?? undefined,
    posterUrl,
    chars: media.chars ?? undefined,
  };
}

// =============================================================================
// Post Conversions
// =============================================================================

function normalizePreviewText(
  text: string | null | undefined,
): string | undefined {
  const normalized = (text ?? "").replace(/\s+/g, " ").trim();
  return normalized || undefined;
}

function getLegacyBodyPreview(post: PostWithMedia): string | undefined {
  const body = post.body?.trim();
  if (!body || body.startsWith("{") || body.startsWith("[")) {
    return undefined;
  }
  return normalizePreviewText(body);
}

function getPlainSummary(post: PostWithMedia): string | undefined {
  if (post.format === "quote") {
    return normalizePreviewText(post.quoteText);
  }

  return (
    normalizePreviewText(post.summary) ||
    normalizePreviewText(post.bodyText) ||
    getLegacyBodyPreview(post) ||
    normalizePreviewText(post.url)
  );
}

function clipPreviewText(
  text: string | undefined,
  maxChars: number,
): string | undefined {
  if (!text) return undefined;
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars).trimEnd()}...`;
}

/**
 * Converts a PostWithMedia to a render-ready PostView.
 *
 * @param post - Post with media attachments from database
 * @param _ctx - Media context with URL configuration
 * @param postCollections - Optional collections this post belongs to
 * @returns Render-ready PostView with pre-computed fields
 */
export function toPostView(
  post: PostWithMedia,
  ctx: MediaContext,
  postCollections?: Collection[],
  threadRootPermalink?: string,
  isLastInThread?: boolean,
): PostView {
  const id = post.id;
  const permalink = toPublicPath(`/${post.slug}`, ctx.sitePathPrefix);
  const publishedAt = post.publishedAt ?? post.updatedAt;
  const summary = getPlainSummary(post);

  // Pre-compute excerpt from the unified plain-text summary.
  const excerpt = clipPreviewText(summary, 160);

  // Pre-compute HTML summary for article-style posts (with title)
  let summaryHtml: string | undefined;
  let summaryHasMore: boolean | undefined;
  let bodyHtmlWithAnchor = post.bodyHtml;
  if (post.title && post.bodyHtml) {
    if (post.summary) {
      // Use stored summary (generated from Tiptap JSON)
      summaryHtml = post.summary
        .split("\n\n")
        .map((p) => `<p>${escapeHtml(p)}</p>`)
        .join("");
      summaryHasMore = true;
    } else {
      // Fallback: extract from rendered HTML
      const result = getHtmlExcerpt(post.bodyHtml);
      summaryHtml = result.excerpt;
      summaryHasMore = result.hasMore;

      // Inject #continue anchor at the excerpt boundary for scroll targeting
      if (result.hasMore) {
        const pos = result.excerptEnd;
        bodyHtmlWithAnchor =
          post.bodyHtml.slice(0, pos) +
          '<span id="continue"></span>' +
          post.bodyHtml.slice(pos);
      }
    }
  }

  // Convert collection tags
  const collections: CollectionTagView[] = (postCollections ?? []).map((c) => {
    const iconHtml = renderCollectionIcon(c.icon, { size: 12 }) || undefined;
    return {
      slug: c.slug,
      title: c.title,
      url: toPublicPath(`/c/${c.slug}`, ctx.sitePathPrefix),
      iconHtml,
    };
  });

  // Convert media attachments
  const media: MediaView[] = post.mediaAttachments.map((m) => ({
    id: m.id,
    url: m.url,
    thumbnailUrl: m.previewUrl,
    mimeType: m.mimeType,
    altText: m.alt ?? undefined,
    width: m.width ?? undefined,
    height: m.height ?? undefined,
    size: m.size ?? undefined,
    blurhash: m.blurhash ?? undefined,
    waveform: m.waveform ?? undefined,
    posterUrl: m.posterUrl ?? undefined,
    originalName: m.originalName ?? undefined,
    summary: m.summary ?? undefined,
    chars: m.chars ?? undefined,
  }));

  return {
    id,
    permalink,
    slug: post.slug,
    title: post.title ?? undefined,
    bodyHtml: bodyHtmlWithAnchor ?? undefined,
    summary,
    excerpt,
    summaryHtml,
    summaryHasMore,
    url: post.url ?? undefined,
    quoteText: post.quoteText ?? undefined,
    format: post.format as Format,
    status: post.status as Status,
    visibility: post.visibility,
    pinned: post.pinnedAt !== null,
    featured: post.featuredAt !== null,
    rating: post.rating ?? undefined,
    publishedAt: toISOString(publishedAt),
    publishedAtFormatted: formatDate(publishedAt),
    publishedAtTime: formatTime(publishedAt),
    publishedAtRelative: formatRelativeTime(publishedAt),
    updatedAt: toISOString(post.updatedAt),
    media,
    collections,
    replyToId: post.replyToId ?? undefined,
    threadRootId: post.replyToId ? post.threadId : undefined,
    threadRootPermalink,
    isLastInThread: isLastInThread ?? true,
    body: post.body ?? undefined,
  };
}

/**
 * Batch converts PostWithMedia[] to PostView[].
 *
 * @param posts - Posts with media attachments
 * @param ctx - Media context with URL configuration
 * @param threadRootPermalinkMap - Optional map of thread root ID → permalink
 * @returns Render-ready PostView[]
 */
export function toPostViews(
  posts: PostWithMedia[],
  ctx: MediaContext,
  threadRootPermalinkMap?: Map<string, string>,
  isLastInThreadMap?: Map<string, boolean>,
): PostView[] {
  return posts.map((p) => {
    const rootPermalink = p.replyToId
      ? threadRootPermalinkMap?.get(p.threadId)
      : undefined;
    return toPostView(
      p,
      ctx,
      undefined,
      rootPermalink,
      isLastInThreadMap?.get(p.id),
    );
  });
}

/**
 * Converts a bare Post (no media) to a PostView with empty media array.
 */
export function toPostViewFromPost(
  post: Post,
  ctx: MediaContext,
  threadRootPermalink?: string,
  isLastInThread?: boolean,
): PostView {
  return toPostView(
    { ...post, mediaAttachments: [] },
    ctx,
    undefined,
    threadRootPermalink,
    isLastInThread,
  );
}

/**
 * Batch converts Post[] (no media) to PostView[].
 */
export function toPostViewsFromPosts(
  posts: Post[],
  ctx: MediaContext,
  threadRootPermalinkMap?: Map<string, string>,
  isLastInThreadMap?: Map<string, boolean>,
): PostView[] {
  return posts.map((p) => {
    const rootPermalink = p.replyToId
      ? threadRootPermalinkMap?.get(p.threadId)
      : undefined;
    return toPostViewFromPost(
      p,
      ctx,
      rootPermalink,
      isLastInThreadMap?.get(p.id),
    );
  });
}

// =============================================================================
// Thread Helpers
// =============================================================================

/**
 * Builds a map of thread root ID → permalink for posts that are thread replies.
 *
 * @param posts - Posts to inspect for thread membership
 * @param getById - Lookup function to fetch a post by ID
 * @returns Map of thread root ID → permalink string (e.g. `/{slug}`)
 *
 * @example
 * ```ts
 * const map = await loadThreadRootPermalinks(posts, services.posts.getById);
 * const views = toPostViews(postsWithMedia, mediaCtx, map);
 * ```
 */
export async function loadThreadRootPermalinks(
  posts: Post[],
  getById: (id: string) => Promise<Post | null>,
  sitePathPrefix = "",
): Promise<Map<string, string>> {
  const threadRootIds = [
    ...new Set(posts.filter((p) => p.replyToId).map((p) => p.threadId)),
  ];
  const map = new Map<string, string>();
  if (threadRootIds.length > 0) {
    const roots = await Promise.all(threadRootIds.map(getById));
    for (const root of roots) {
      if (root) {
        map.set(root.id, toPublicPath(`/${root.slug}`, sitePathPrefix));
      }
    }
  }
  return map;
}

// =============================================================================
// Navigation Conversions
// =============================================================================

/**
 * Converts a NavItem to a NavItemView with pre-computed state.
 *
 * @param item - Raw nav item from database
 * @param currentPath - Current URL path for active state
 * @param isAuthenticated - Whether the user is logged in (affects system settings item)
 */
export function toNavItemView(
  item: NavItem,
  currentPath: string,
  isAuthenticated = false,
  sitePathPrefix = "",
): NavItemView {
  let url = item.url;
  let label = item.label;

  // System settings item: resolve URL and label based on auth.
  if (item.type === "system" && item.systemKey === "settings") {
    url = isAuthenticated ? "/settings" : "/signin";
    if (!isAuthenticated) {
      label = "Sign in";
    }
  }

  const isExternal = url.startsWith("http://") || url.startsWith("https://");
  const publicUrl = isExternal ? url : toPublicPath(url, sitePathPrefix);

  let isActive = false;
  if (!isExternal) {
    if (publicUrl === sitePathPrefix || publicUrl === "/") {
      isActive = currentPath === (sitePathPrefix || "/");
    } else {
      isActive =
        currentPath === publicUrl || currentPath.startsWith(`${publicUrl}/`);
    }
  }

  return {
    id: item.id,
    type: item.type as NavItemType,
    systemKey: item.systemKey,
    label,
    url: publicUrl,
    isActive,
    isExternal,
  };
}

/**
 * Batch converts NavItem[] to NavItemView[].
 *
 * @param items - Raw nav items from database
 * @param currentPath - Current URL path for active state
 * @param isAuthenticated - Whether the user is logged in
 */
export function toNavItemViews(
  items: NavItem[],
  currentPath: string,
  isAuthenticated = false,
  sitePathPrefix = "",
): NavItemView[] {
  return items.map((item) =>
    toNavItemView(item, currentPath, isAuthenticated, sitePathPrefix),
  );
}

// =============================================================================
// Search Result Conversions
// =============================================================================

/**
 * Converts a SearchResult to a SearchResultView with PostView.
 *
 * @param result - Raw search result with post and FTS metadata
 * @param ctx - Media context for URL computation
 * @param query - Original search query for client-side title/quote highlighting
 */
export function toSearchResultView(
  result: SearchResult,
  ctx: MediaContext,
  query?: string,
): SearchResultView {
  const post = toPostViewFromPost(result.post, ctx);

  let titleHighlighted: string | undefined;
  let quoteHighlighted: string | undefined;

  if (query) {
    if (post.title) {
      titleHighlighted = highlightText(post.title, query);
    }
    if (post.quoteText) {
      // Truncate before highlighting to avoid splitting inside <mark> tags
      const truncated =
        post.quoteText.length > 120
          ? post.quoteText.slice(0, 120) + "..."
          : post.quoteText;
      quoteHighlighted = highlightText(truncated, query);
    }
  }

  return {
    post,
    rank: result.rank,
    snippet: result.snippet,
    titleHighlighted,
    quoteHighlighted,
  };
}

/**
 * Batch converts SearchResult[] to SearchResultView[].
 *
 * @param results - Raw search results
 * @param ctx - Media context for URL computation
 * @param query - Original search query for title/quote highlighting
 */
export function toSearchResultViews(
  results: SearchResult[],
  ctx: MediaContext,
  query?: string,
): SearchResultView[] {
  return results.map((r) => toSearchResultView(r, ctx, query));
}

// =============================================================================
// Archive Group Conversions
// =============================================================================

/**
 * Converts a grouped post map to typed ArchiveGroup[].
 */
export function toArchiveGroups(
  grouped: Map<string, Post[]>,
  ctx: MediaContext,
): ArchiveGroup[] {
  const groups: ArchiveGroup[] = [];
  for (const [yearMonth, posts] of grouped) {
    const [year, month] = yearMonth.split("-");
    if (!year || !month) continue;

    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1);
    const label = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });

    groups.push({
      year,
      month,
      label,
      posts: toPostViewsFromPosts(posts, ctx),
    });
  }
  return groups;
}

/**
 * Converts a grouped PostWithMedia map to typed ArchiveGroup[].
 * Unlike toArchiveGroups, this preserves media attachments on each post.
 *
 * @param grouped - Map of "YYYY-MM" keys to PostWithMedia arrays
 * @param ctx - Media context for URL computation
 * @returns ArchiveGroup[] with full media data on each PostView
 */
export function toArchiveGroupsWithMedia(
  grouped: Map<string, PostWithMedia[]>,
  ctx: MediaContext,
): ArchiveGroup[] {
  const groups: ArchiveGroup[] = [];
  for (const [yearMonth, posts] of grouped) {
    const [year, month] = yearMonth.split("-");
    if (!year || !month) continue;

    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1);
    const label = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });

    groups.push({
      year,
      month,
      label,
      posts: toPostViews(posts, ctx),
    });
  }
  return groups;
}
