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
import { createMediaContext, toPostView } from "./view.js";

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
  options?: { page?: number; isAuthenticated?: boolean },
): Promise<TimelineResult> {
  const pageSize = c.var.appConfig.pageSize;

  const page = Math.max(1, options?.page ?? 1);
  const offset = (page - 1) * pageSize;

  const excludePrivate = !(options?.isAuthenticated ?? false);

  // Count + list are independent — run in parallel
  const [totalCount, posts] = await Promise.all([
    c.var.services.posts.count({
      status: "published",
      excludeReplies: true,
      excludeUnlisted: true,
      excludePrivate,
    }),
    c.var.services.posts.list({
      status: "published",
      excludeReplies: true,
      excludeUnlisted: true,
      excludePrivate,
      limit: pageSize,
      offset,
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  if (posts.length === 0) {
    return { items: [], currentPage: page, totalPages };
  }

  // Batch load media, collections, and reply counts in parallel
  const postIds = posts.map((p) => p.id);
  const mediaCtx = createMediaContext(c.var.appConfig);
  const [rawMediaMap, collectionsMap, replyCounts] = await Promise.all([
    c.var.services.media.getByPostIds(postIds),
    c.var.services.collections.getCollectionsByPostIds(postIds),
    c.var.services.posts.getReplyCounts(postIds),
  ]);
  const mediaMap = buildMediaMap(
    rawMediaMap,
    mediaCtx.r2PublicUrl,
    mediaCtx.imageTransformUrl,
    mediaCtx.s3PublicUrl,
  );
  const threadRootIds = postIds.filter((id) => (replyCounts.get(id) ?? 0) > 0);

  // Batch load thread timeline context (latest reply + parent)
  const threadContexts =
    await c.var.services.posts.getThreadTimelineContext(threadRootIds);

  // Batch load media for context posts (latestReply + parentReply)
  const contextPostIds: string[] = [];
  for (const ctx of threadContexts.values()) {
    contextPostIds.push(ctx.latestReply.id);
    if (ctx.parentReply) {
      contextPostIds.push(ctx.parentReply.id);
    }
  }
  const [contextMediaMap, contextCollectionsMap] =
    contextPostIds.length > 0
      ? await Promise.all([
          c.var.services.media
            .getByPostIds(contextPostIds)
            .then((raw) =>
              buildMediaMap(
                raw,
                mediaCtx.r2PublicUrl,
                mediaCtx.imageTransformUrl,
                mediaCtx.s3PublicUrl,
              ),
            ),
          c.var.services.collections.getCollectionsByPostIds(contextPostIds),
        ])
      : [new Map(), new Map()];

  // Assemble timeline items with View Models
  const items: TimelineItemView[] = posts.map((post) => {
    const postView = toPostView(
      {
        ...post,
        mediaAttachments: mediaMap.get(post.id) ?? [],
      },
      mediaCtx,
      collectionsMap.get(post.id),
    );

    const threadCtx = threadContexts.get(post.id);

    if (threadCtx) {
      // Thread root is not the last post — hide reply button on it
      postView.isLastInThread = false;

      const latestReplyView = toPostView(
        {
          ...threadCtx.latestReply,
          mediaAttachments: contextMediaMap.get(threadCtx.latestReply.id) ?? [],
        },
        mediaCtx,
        contextCollectionsMap.get(threadCtx.latestReply.id),
        undefined,
        true, // latestReply is the last post in the thread
      );

      const parentReplyView = threadCtx.parentReply
        ? toPostView(
            {
              ...threadCtx.parentReply,
              mediaAttachments:
                contextMediaMap.get(threadCtx.parentReply.id) ?? [],
            },
            mediaCtx,
            contextCollectionsMap.get(threadCtx.parentReply.id),
            undefined,
            false, // parentReply is not the last post
          )
        : undefined;

      return {
        post: postView,
        threadPreview: {
          latestReply: latestReplyView,
          parentReply: parentReplyView,
          totalReplyCount: threadCtx.totalReplyCount,
        },
      };
    }

    return { post: postView };
  });

  return { items, currentPage: page, totalPages };
}
