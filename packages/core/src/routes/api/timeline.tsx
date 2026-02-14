/**
 * Timeline API Routes
 *
 * Provides load-more functionality for the timeline feed via SSE.
 */

import { Hono } from "hono";
import type { Bindings, TimelineItemView } from "../../types.js";
import type { AppVariables } from "../../app.js";
import { sse } from "../../lib/sse.js";
import { buildMediaMap } from "../../lib/media-helpers.js";
import { TimelineItem } from "../../theme/components/timeline/TimelineItem.js";
import { ThreadPreview as DefaultThreadPreview } from "../../theme/components/timeline/ThreadPreview.js";
import { createMediaContext, toPostView, toPostViews } from "../../lib/view.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

const PAGE_SIZE = 20;

export const timelineApiRoutes = new Hono<Env>();

timelineApiRoutes.get("/", async (c) => {
  const cursorParam = c.req.query("cursor");
  const cursor = cursorParam ? parseInt(cursorParam, 10) : undefined;

  if (!cursor || isNaN(cursor)) {
    return c.json({ error: "cursor parameter required" }, 400);
  }

  // Fetch one extra to determine if there are more
  const posts = await c.var.services.posts.list({
    visibility: ["featured", "quiet"],
    excludeReplies: true,
    excludeTypes: ["page"],
    limit: PAGE_SIZE + 1,
    cursor,
  });

  const hasMore = posts.length > PAGE_SIZE;
  const displayPosts = hasMore ? posts.slice(0, PAGE_SIZE) : posts;

  if (displayPosts.length === 0) {
    return sse(c, async (stream) => {
      stream.remove("#load-more-container");
    });
  }

  // Build media map
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

  // Get thread previews
  const threadPreviews = await c.var.services.posts.getThreadPreviews(
    threadRootIds,
    3,
  );

  // Load media for preview replies
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

  // Resolve theme components for card rendering
  const theme = c.var.config.theme?.components;
  const ResolvedThreadPreview = theme?.ThreadPreview ?? DefaultThreadPreview;

  // Render items to HTML
  const itemsHtml = items
    .map((item) => {
      if (item.threadPreview) {
        return (
          <ResolvedThreadPreview
            rootPost={item.post}
            previewReplies={item.threadPreview.replies}
            totalReplyCount={item.threadPreview.totalReplyCount}
            theme={theme}
          />
        );
      }
      return <TimelineItem item={item} theme={theme} />;
    })
    .map((jsx) => jsx.toString())
    .join("");

  // Determine next cursor
  const lastPost = displayPosts[displayPosts.length - 1];
  const nextCursor = hasMore && lastPost ? lastPost.id : undefined;

  // Build load-more button HTML
  const loadMoreHtml = nextCursor
    ? `<div id="load-more-container" class="mt-6 text-center"><button class="btn btn-outline" data-on:click="@get('/api/timeline?cursor=${nextCursor}')">Load more</button></div>`
    : "";

  return sse(c, async (stream) => {
    // Append new items to the feed
    stream.patchElements(itemsHtml, {
      mode: "append",
      selector: "#timeline-feed",
    });
    // Replace or remove the load-more container
    if (loadMoreHtml) {
      stream.patchElements(loadMoreHtml);
    } else {
      stream.remove("#load-more-container");
    }
  });
});
