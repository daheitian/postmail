/**
 * Home Page Route
 *
 * Timeline feed with per-type card components and thread previews.
 */

import { Hono } from "hono";
import type { Bindings, TimelineItemView } from "../../types.js";
import type { AppVariables } from "../../app.js";
import { buildMediaMap } from "../../lib/media-helpers.js";
import { getNavigationData } from "../../lib/navigation.js";
import { renderPublicPage } from "../../lib/render.js";
import { HomePage as DefaultHomePage } from "../../themes/minimal/pages/HomePage.js";
import { createMediaContext, toPostView, toPostViews } from "../../lib/view.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

const PAGE_SIZE = 20;

export const homeRoutes = new Hono<Env>();

homeRoutes.get("/", async (c) => {
  const navData = await getNavigationData(c);

  // Fetch one extra to determine if there are more
  const posts = await c.var.services.posts.list({
    visibility: ["featured", "quiet"],
    excludeReplies: true,
    excludeTypes: ["page"],
    limit: PAGE_SIZE + 1,
  });

  const hasMore = posts.length > PAGE_SIZE;
  const displayPosts = hasMore ? posts.slice(0, PAGE_SIZE) : posts;

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

  // Resolve page component
  const components = c.var.config.theme?.components;
  const Page = components?.HomePage ?? DefaultHomePage;

  return renderPublicPage(c, {
    title: navData.siteName,
    navData,
    content: (
      <Page
        items={items}
        hasMore={hasMore}
        nextCursor={nextCursor}
        theme={components}
      />
    ),
  });
});
