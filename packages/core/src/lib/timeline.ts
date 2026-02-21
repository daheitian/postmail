/**
 * Timeline Data Assembly
 *
 * Shared helper for assembling timeline items with media and thread previews.
 * Used by page rendering with page-based pagination.
 */

import type { Context } from "hono";
import type { Bindings, TimelineItemView } from "../types.js";
import type { AppVariables } from "../types/app-context.js";
import { buildMediaMap } from "./media-helpers.js";
import { createMediaContext, toPostView, toPostViews } from "./view.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

/**
 * Result from assembling a timeline page.
 */
export interface TimelineResult {
  items: TimelineItemView[];
  currentPage: number;
  totalPages: number;
}

/**
 * Assembles a page of timeline items with media attachments and thread previews.
 *
 * Fetches posts using offset-based pagination, batch-loads media, identifies
 * threads, and returns render-ready `TimelineItemView[]` with page info.
 *
 * @param c - Hono context (provides services + appConfig)
 * @param options - Optional page number (1-indexed, defaults to 1)
 * @returns Assembled timeline items with pagination info
 *
 * @example
 * ```ts
 * const { items, currentPage, totalPages } = await assembleTimeline(c);
 * const { items, currentPage, totalPages } = await assembleTimeline(c, { page: 2 });
 * ```
 */
export async function assembleTimeline(
  c: Context<Env>,
  options?: { page?: number },
): Promise<TimelineResult> {
  const pageSize = c.var.appConfig.pageSize;

  const page = Math.max(1, options?.page ?? 1);
  const offset = (page - 1) * pageSize;

  // Get total count for pagination
  const totalCount = await c.var.services.posts.count({
    status: "published",
    excludeReplies: true,
  });
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Fetch posts for the current page
  const posts = await c.var.services.posts.list({
    status: "published",
    excludeReplies: true,
    limit: pageSize,
    offset,
  });

  if (posts.length === 0) {
    return { items: [], currentPage: page, totalPages };
  }

  // Batch load media attachments
  const postIds = posts.map((p) => p.id);
  const rawMediaMap = await c.var.services.media.getByPostIds(postIds);
  const mediaCtx = createMediaContext(c.var.appConfig);
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
  const items: TimelineItemView[] = posts.map((post) => {
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

  return { items, currentPage: page, totalPages };
}
