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
  NavItemView,
  NavItem,
  SearchResult,
  SearchResultView,
  ArchiveGroup,
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
  const url = getMediaUrl(media.storageKey, publicUrl);

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
    ? getMediaUrl(media.posterKey, publicUrl)
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

/**
 * Converts a PostWithMedia to a render-ready PostView.
 *
 * @param post - Post with media attachments from database
 * @param _ctx - Media context with URL configuration
 * @returns Render-ready PostView with pre-computed fields
 */
export function toPostView(post: PostWithMedia, _ctx: MediaContext): PostView {
  const id = post.id;
  const permalink = `/${post.slug}`;

  // Pre-compute excerpt from raw body
  let excerpt: string | undefined;
  if (post.body) {
    excerpt =
      post.body.length > 160 ? post.body.slice(0, 160) + "..." : post.body;
  }

  // Pre-compute HTML summary for article-style posts (with title)
  let summaryHtml: string | undefined;
  let summaryHasMore: boolean | undefined;
  let bodyHtmlWithAnchor = post.bodyHtml;
  if (post.title && post.bodyHtml) {
    if (post.summary) {
      // Use stored summary (generated from Tiptap JSON)
      summaryHtml = post.summary
        .split("\n\n")
        .map((p) => `<p>${p}</p>`)
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
    excerpt,
    summaryHtml,
    summaryHasMore,
    url: post.url ?? undefined,
    quoteText: post.quoteText ?? undefined,
    format: post.format as Format,
    status: post.status as Status,
    visibility: post.visibility,
    pinned: post.pinnedAt !== null,
    rating: post.rating ?? undefined,
    publishedAt: toISOString(post.publishedAt),
    publishedAtFormatted: formatDate(post.publishedAt),
    publishedAtTime: formatTime(post.publishedAt),
    publishedAtRelative: formatRelativeTime(post.publishedAt),
    updatedAt: toISOString(post.updatedAt),
    media,
    replyToId: post.replyToId ?? undefined,
    threadRootId: post.threadId ?? undefined,
    body: post.body ?? undefined,
  };
}

/**
 * Batch converts PostWithMedia[] to PostView[].
 */
export function toPostViews(
  posts: PostWithMedia[],
  ctx: MediaContext,
): PostView[] {
  return posts.map((p) => toPostView(p, ctx));
}

/**
 * Converts a bare Post (no media) to a PostView with empty media array.
 */
export function toPostViewFromPost(post: Post, ctx: MediaContext): PostView {
  return toPostView({ ...post, mediaAttachments: [] }, ctx);
}

/**
 * Batch converts Post[] (no media) to PostView[].
 */
export function toPostViewsFromPosts(
  posts: Post[],
  ctx: MediaContext,
): PostView[] {
  return posts.map((p) => toPostViewFromPost(p, ctx));
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
): NavItemView {
  let url = item.url;
  let label = item.label;

  // System settings item: resolve URL and label based on auth
  // Also handles legacy "/dash" URLs from existing DB data
  if (
    item.type === "system" &&
    (item.url === "/settings" || item.url === "/dash")
  ) {
    url = isAuthenticated ? "/settings" : "/signin";
    if (!isAuthenticated) {
      label = "Sign in";
    }
  }

  const isExternal = url.startsWith("http://") || url.startsWith("https://");

  let isActive = false;
  if (!isExternal) {
    if (url === "/") {
      isActive = currentPath === "/";
    } else {
      isActive = currentPath === url || currentPath.startsWith(url + "/");
    }
  }

  return {
    id: item.id,
    type: item.type as NavItemType,
    label,
    url,
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
): NavItemView[] {
  return items.map((item) => toNavItemView(item, currentPath, isAuthenticated));
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
