/**
 * View Model Conversions
 *
 * Transforms raw database models into render-ready View types.
 * Theme components receive only View types — no lib/ imports needed.
 */

import type { Context } from "hono";
import type {
  Post,
  PostWithMedia,
  Media,
  MediaView,
  PostView,
  NavLinkView,
  NavigationLink,
  SearchResult,
  SearchResultView,
  ArchiveGroup,
} from "../types.js";
import { encode } from "./sqid.js";
import { toISOString, formatDate } from "./time.js";
import { getMediaUrl, getImageUrl, getPublicUrlForProvider } from "./image.js";

// =============================================================================
// Media Context
// =============================================================================

/**
 * Central media config — extracted once per request from env.
 */
export interface MediaContext {
  r2PublicUrl?: string;
  imageTransformUrl?: string;
  s3PublicUrl?: string;
}

/**
 * Creates a MediaContext from Hono context environment variables.
 *
 * @param c - Hono context
 * @returns MediaContext with env values
 *
 * @example
 * ```ts
 * const mediaCtx = createMediaContext(c);
 * const postView = toPostView(post, mediaCtx);
 * ```
 */
export function createMediaContext(c: Context): MediaContext {
  return {
    r2PublicUrl: c.env.R2_PUBLIC_URL,
    imageTransformUrl: c.env.IMAGE_TRANSFORM_URL,
    s3PublicUrl: c.env.S3_PUBLIC_URL,
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
  const url = getMediaUrl(media.id, media.storageKey, publicUrl);
  const thumbnailUrl = getImageUrl(url, ctx.imageTransformUrl, {
    width: 400,
    quality: 80,
    format: "auto",
    fit: "cover",
  });

  return {
    id: media.id,
    url,
    thumbnailUrl,
    mimeType: media.mimeType,
    altText: media.alt ?? undefined,
    width: media.width ?? undefined,
    height: media.height ?? undefined,
    size: media.size,
  };
}

// =============================================================================
// Post Conversions
// =============================================================================

/**
 * Converts a PostWithMedia to a render-ready PostView.
 *
 * @param post - Post with media attachments from database
 * @param ctx - Media context with URL configuration
 * @returns Render-ready PostView with pre-computed fields
 *
 * @example
 * ```ts
 * const mediaCtx = createMediaContext(c);
 * const postView = toPostView({ ...post, mediaAttachments: [...] }, mediaCtx);
 * ```
 */
export function toPostView(post: PostWithMedia, ctx: MediaContext): PostView {
  const permalink = `/p/${encode(post.id)}`;

  // Pre-compute excerpt from raw content
  let excerpt: string | undefined;
  if (post.content) {
    excerpt =
      post.content.length > 160
        ? post.content.slice(0, 160) + "..."
        : post.content;
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
  }));

  return {
    id: post.id,
    permalink,
    title: post.title ?? undefined,
    contentHtml: post.contentHtml ?? undefined,
    excerpt,
    type: post.type,
    visibility: post.visibility,
    path: post.path ?? undefined,
    publishedAt: toISOString(post.publishedAt),
    publishedAtFormatted: formatDate(post.publishedAt),
    updatedAt: toISOString(post.updatedAt),
    sourceUrl: post.sourceUrl ?? undefined,
    sourceName: post.sourceName ?? undefined,
    sourceDomain: post.sourceDomain ?? undefined,
    media,
    replyToId: post.replyToId ?? undefined,
    threadRootId: post.threadId ?? undefined,
    content: post.content ?? undefined,
  };
}

/**
 * Batch converts PostWithMedia[] to PostView[].
 *
 * @param posts - Array of posts with media
 * @param ctx - Media context
 * @returns Array of PostView
 */
export function toPostViews(
  posts: PostWithMedia[],
  ctx: MediaContext,
): PostView[] {
  return posts.map((p) => toPostView(p, ctx));
}

/**
 * Converts a bare Post (no media) to a PostView with empty media array.
 *
 * @param post - Post without media
 * @param ctx - Media context (unused but kept for consistency)
 * @returns PostView with empty media
 */
export function toPostViewFromPost(post: Post, ctx: MediaContext): PostView {
  return toPostView({ ...post, mediaAttachments: [] }, ctx);
}

/**
 * Batch converts Post[] (no media) to PostView[].
 *
 * @param posts - Array of posts without media
 * @param ctx - Media context
 * @returns Array of PostView
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
 * Converts a NavigationLink to a NavLinkView with pre-computed state.
 *
 * @param link - Raw navigation link from database
 * @param currentPath - Current page path for active state computation
 * @returns NavLinkView with isActive and isExternal pre-computed
 */
export function toNavLinkView(
  link: NavigationLink,
  currentPath: string,
): NavLinkView {
  const isExternal =
    link.url.startsWith("http://") || link.url.startsWith("https://");

  let isActive = false;
  if (!isExternal) {
    if (link.url === "/") {
      isActive = currentPath === "/";
    } else {
      isActive =
        currentPath === link.url || currentPath.startsWith(link.url + "/");
    }
  }

  return {
    id: link.id,
    label: link.label,
    url: link.url,
    isActive,
    isExternal,
  };
}

/**
 * Batch converts NavigationLink[] to NavLinkView[].
 *
 * @param links - Raw navigation links
 * @param currentPath - Current page path
 * @returns Array of NavLinkView
 */
export function toNavLinkViews(
  links: NavigationLink[],
  currentPath: string,
): NavLinkView[] {
  return links.map((l) => toNavLinkView(l, currentPath));
}

// =============================================================================
// Search Result Conversions
// =============================================================================

/**
 * Converts a SearchResult to a SearchResultView with PostView.
 *
 * @param result - Raw search result
 * @param ctx - Media context
 * @returns SearchResultView with PostView
 */
export function toSearchResultView(
  result: SearchResult,
  ctx: MediaContext,
): SearchResultView {
  return {
    post: toPostViewFromPost(result.post, ctx),
    rank: result.rank,
    snippet: result.snippet,
  };
}

/**
 * Batch converts SearchResult[] to SearchResultView[].
 *
 * @param results - Raw search results
 * @param ctx - Media context
 * @returns Array of SearchResultView
 */
export function toSearchResultViews(
  results: SearchResult[],
  ctx: MediaContext,
): SearchResultView[] {
  return results.map((r) => toSearchResultView(r, ctx));
}

// =============================================================================
// Archive Group Conversions
// =============================================================================

/**
 * Converts a grouped post map to typed ArchiveGroup[].
 *
 * @param grouped - Map of "YYYY-MM" keys to Post arrays
 * @param ctx - Media context
 * @returns Array of ArchiveGroup with pre-formatted labels
 */
export function toArchiveGroups(
  grouped: Map<string, Post[]>,
  ctx: MediaContext,
): ArchiveGroup[] {
  const groups: ArchiveGroup[] = [];
  for (const [yearMonth, posts] of grouped) {
    const [year, month] = yearMonth.split("-");
    if (!year || !month) continue;

    // Format label like "February 2024"
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
