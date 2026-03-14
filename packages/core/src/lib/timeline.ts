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
import { elapsedMs, logTiming } from "./request-timing.js";
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
  const shouldLogTiming = c.var.requestTrace.path === "/";
  const timelineStart = shouldLogTiming ? Date.now() : 0;
  const pageSize = c.var.appConfig.pageSize;

  const page = Math.max(1, options?.page ?? 1);
  const offset = (page - 1) * pageSize;

  const excludePrivate = !(options?.isAuthenticated ?? false);

  // Get total count for pagination
  const countStart = shouldLogTiming ? Date.now() : 0;
  const totalCount = await c.var.services.posts.count({
    status: "published",
    excludeReplies: true,
    excludeUnlisted: true,
    excludePrivate,
  });
  if (shouldLogTiming) {
    logTiming(c.var.requestTrace, "home.timeline.count.completed", {
      durationMs: elapsedMs(countStart),
      totalCount,
    });
  }
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Fetch posts for the current page
  const listStart = shouldLogTiming ? Date.now() : 0;
  const posts = await c.var.services.posts.list({
    status: "published",
    excludeReplies: true,
    excludeUnlisted: true,
    excludePrivate,
    limit: pageSize,
    offset,
  });
  if (shouldLogTiming) {
    logTiming(c.var.requestTrace, "home.timeline.posts.loaded", {
      durationMs: elapsedMs(listStart),
      postCount: posts.length,
      page,
    });
  }

  if (posts.length === 0) {
    if (shouldLogTiming) {
      logTiming(c.var.requestTrace, "home.timeline.completed", {
        durationMs: elapsedMs(timelineStart),
        itemCount: 0,
        page,
        totalPages,
      });
    }
    return { items: [], currentPage: page, totalPages };
  }

  // Batch load media
  const postIds = posts.map((p) => p.id);
  const mediaStart = shouldLogTiming ? Date.now() : 0;
  const rawMediaMap = await c.var.services.media.getByPostIds(postIds);
  const mediaCtx = createMediaContext(c.var.appConfig);
  const mediaMap = buildMediaMap(
    rawMediaMap,
    mediaCtx.r2PublicUrl,
    mediaCtx.imageTransformUrl,
    mediaCtx.s3PublicUrl,
  );
  if (shouldLogTiming) {
    logTiming(c.var.requestTrace, "home.timeline.media.loaded", {
      durationMs: elapsedMs(mediaStart),
    });
  }

  // Batch load collections for main posts
  const collectionsStart = shouldLogTiming ? Date.now() : 0;
  const collectionsMap =
    await c.var.services.collections.getCollectionsByPostIds(postIds);
  if (shouldLogTiming) {
    logTiming(c.var.requestTrace, "home.timeline.collections.loaded", {
      durationMs: elapsedMs(collectionsStart),
    });
  }

  // Get reply counts to identify thread roots
  const replyCountsStart = shouldLogTiming ? Date.now() : 0;
  const replyCounts = await c.var.services.posts.getReplyCounts(postIds);
  if (shouldLogTiming) {
    logTiming(c.var.requestTrace, "home.timeline.reply-counts.loaded", {
      durationMs: elapsedMs(replyCountsStart),
    });
  }
  const threadRootIds = postIds.filter((id) => (replyCounts.get(id) ?? 0) > 0);

  // Batch load thread timeline context (latest reply + parent)
  const threadContextStart = shouldLogTiming ? Date.now() : 0;
  const threadContexts =
    await c.var.services.posts.getThreadTimelineContext(threadRootIds);
  if (shouldLogTiming) {
    logTiming(c.var.requestTrace, "home.timeline.thread-context.loaded", {
      durationMs: elapsedMs(threadContextStart),
      threadCount: threadContexts.size,
    });
  }

  // Batch load media for context posts (latestReply + parentReply)
  const contextPostIds: string[] = [];
  for (const ctx of threadContexts.values()) {
    contextPostIds.push(ctx.latestReply.id);
    if (ctx.parentReply) {
      contextPostIds.push(ctx.parentReply.id);
    }
  }
  const contextAssetsStart = shouldLogTiming ? Date.now() : 0;
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
  if (shouldLogTiming && contextPostIds.length > 0) {
    logTiming(c.var.requestTrace, "home.timeline.context-assets.loaded", {
      durationMs: elapsedMs(contextAssetsStart),
      contextPostCount: contextPostIds.length,
    });
  }

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

  if (shouldLogTiming) {
    logTiming(c.var.requestTrace, "home.timeline.completed", {
      durationMs: elapsedMs(timelineStart),
      itemCount: items.length,
      page,
      totalPages,
    });
  }

  return { items, currentPage: page, totalPages };
}
