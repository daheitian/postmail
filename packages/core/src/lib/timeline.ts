/**
 * Timeline Data Assembly
 *
 * Shared helper for assembling timeline items with media and thread previews.
 * Used by both full-page rendering and load-more SSE responses.
 */

import type { Context } from "hono";
import type { Bindings, TimelineItemView, DateGroup } from "../types.js";
import type { AppVariables } from "../app.js";
import { buildMediaMap } from "./media-helpers.js";
import { createMediaContext, toPostView, toPostViews } from "./view.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

const DEFAULT_PAGE_SIZE = 20;

/**
 * Result from assembling a timeline page.
 */
export interface TimelineResult {
  items: TimelineItemView[];
  hasMore: boolean;
  nextCursor?: number;
}

/**
 * Assembles a page of timeline items with media attachments and thread previews.
 *
 * Fetches posts, batch-loads media, identifies threads, and returns
 * render-ready `TimelineItemView[]` with pagination info.
 *
 * @param c - Hono context (provides services + env)
 * @param options - Optional cursor for pagination
 * @returns Assembled timeline items with pagination info
 *
 * @example
 * ```ts
 * const { items, hasMore, nextCursor } = await assembleTimeline(c);
 * const { items, hasMore, nextCursor } = await assembleTimeline(c, { cursor: 42 });
 * ```
 */
export async function assembleTimeline(
  c: Context<Env>,
  options?: { cursor?: number },
): Promise<TimelineResult> {
  const pageSize =
    parseInt(c.env.PAGE_SIZE ?? String(DEFAULT_PAGE_SIZE), 10) ||
    DEFAULT_PAGE_SIZE;

  // Fetch one extra to determine if there are more
  const posts = await c.var.services.posts.list({
    status: "published",
    excludeReplies: true,
    limit: pageSize + 1,
    cursor: options?.cursor,
  });

  const hasMore = posts.length > pageSize;
  const displayPosts = hasMore ? posts.slice(0, pageSize) : posts;

  if (displayPosts.length === 0) {
    return { items: [], hasMore: false };
  }

  // Batch load media attachments
  const postIds = displayPosts.map((p) => p.id);
  const rawMediaMap = await c.var.services.media.getByPostIds(postIds);
  const mediaCtx = createMediaContext(c);
  const mediaMap = buildMediaMap(
    rawMediaMap,
    mediaCtx.r2PublicUrl,
    mediaCtx.imageTransformUrl,
    mediaCtx.s3PublicUrl,
  );

  // Get reply counts to identify thread roots
  const replyCounts = await c.var.services.posts.getReplyCounts(postIds);
  const threadRootIds = postIds.filter((id) => (replyCounts.get(id) ?? 0) > 0);

  // Batch load thread previews
  const threadPreviews = await c.var.services.posts.getThreadPreviews(
    threadRootIds,
    3,
  );

  // Batch load media for preview replies
  const previewReplyIds: number[] = [];
  for (const replies of threadPreviews.values()) {
    for (const reply of replies) {
      previewReplyIds.push(reply.id);
    }
  }
  const previewMediaMap =
    previewReplyIds.length > 0
      ? buildMediaMap(
          await c.var.services.media.getByPostIds(previewReplyIds),
          mediaCtx.r2PublicUrl,
          mediaCtx.imageTransformUrl,
          mediaCtx.s3PublicUrl,
        )
      : new Map();

  // Assemble timeline items with View Models
  const items: TimelineItemView[] = displayPosts.map((post) => {
    const postView = toPostView(
      { ...post, mediaAttachments: mediaMap.get(post.id) ?? [] },
      mediaCtx,
    );

    const replyCount = replyCounts.get(post.id) ?? 0;
    const previewReplies = threadPreviews.get(post.id);

    if (replyCount > 0 && previewReplies) {
      return {
        post: postView,
        threadPreview: {
          replies: toPostViews(
            previewReplies.map((r) => ({
              ...r,
              mediaAttachments: previewMediaMap.get(r.id) ?? [],
            })),
            mediaCtx,
          ),
          totalReplyCount: replyCount,
        },
      };
    }

    return { post: postView };
  });

  // Determine next cursor
  const lastPost = displayPosts[displayPosts.length - 1];
  const nextCursor = hasMore && lastPost ? lastPost.id : undefined;

  return { items, hasMore, nextCursor };
}

/**
 * Groups timeline items by their publication date (YYYY-MM-DD).
 *
 * @param items - Timeline items to group
 * @returns Array of date groups, each containing items published on the same day
 *
 * @example
 * ```ts
 * const groups = groupByDate(items);
 * // [{ dateKey: "2024-02-01", label: "Feb 1, 2024", items: [...] }, ...]
 * ```
 */
export function groupByDate(items: TimelineItemView[]): DateGroup[] {
  const groups: DateGroup[] = [];
  let current: DateGroup | null = null;

  for (const item of items) {
    const dateKey = item.post.publishedAt.slice(0, 10);
    if (!current || current.dateKey !== dateKey) {
      current = {
        dateKey,
        label: item.post.publishedAtFormatted,
        items: [],
      };
      groups.push(current);
    }
    current.items.push(item);
  }

  return groups;
}
