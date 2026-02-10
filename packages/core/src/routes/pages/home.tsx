/**
 * Home Page Route
 *
 * Timeline feed with per-type card components and thread previews.
 */

import { Hono } from "hono";
import { useLingui } from "@lingui/react/macro";
import type { FC } from "hono/jsx";
import type {
  Bindings,
  PostWithMedia,
  TimelineItemData,
  TimelineFeedProps,
} from "../../types.js";
import type { AppVariables } from "../../app.js";
import { BaseLayout, SiteLayout } from "../../theme/layouts/index.js";
import { buildMediaMap } from "../../lib/media-helpers.js";
import { resolveTimelineFeed } from "../../lib/theme-components.js";
import { TimelineFeed as DefaultTimelineFeed } from "../../theme/components/timeline/TimelineFeed.js";
import { getNavigationData } from "../../lib/navigation.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

const PAGE_SIZE = 20;

export const homeRoutes = new Hono<Env>();

function HomeContent({
  FeedComponent,
  feedProps,
}: {
  FeedComponent: FC<TimelineFeedProps>;
  feedProps: TimelineFeedProps;
}) {
  const { t } = useLingui();

  return (
    <>
      {feedProps.items.length === 0 ? (
        <p class="text-muted-foreground">
          {t({
            message: "No posts yet.",
            comment: "@context: Empty state message on home page",
          })}
        </p>
      ) : (
        <FeedComponent {...feedProps} />
      )}
    </>
  );
}

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
  const r2PublicUrl = c.env.R2_PUBLIC_URL;
  const imageTransformUrl = c.env.IMAGE_TRANSFORM_URL;
  const mediaMap = buildMediaMap(rawMediaMap, r2PublicUrl, imageTransformUrl);

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
          r2PublicUrl,
          imageTransformUrl,
        )
      : new Map();

  // Assemble timeline items
  const items: TimelineItemData[] = displayPosts.map((post) => {
    const postWithMedia: PostWithMedia = {
      ...post,
      mediaAttachments: mediaMap.get(post.id) ?? [],
    };

    const replyCount = replyCounts.get(post.id) ?? 0;
    const previewReplies = threadPreviews.get(post.id);

    if (replyCount > 0 && previewReplies) {
      return {
        post: postWithMedia,
        threadPreview: {
          replies: previewReplies.map((r) => ({
            ...r,
            mediaAttachments: previewMediaMap.get(r.id) ?? [],
          })),
          totalReplyCount: replyCount,
        },
      };
    }

    return { post: postWithMedia };
  });

  // Determine next cursor
  const lastPost = displayPosts[displayPosts.length - 1];
  const nextCursor = hasMore && lastPost ? lastPost.id : undefined;

  // Resolve theme components
  const Feed = resolveTimelineFeed(
    DefaultTimelineFeed,
    c.var.config.theme?.components,
  );

  const feedProps: TimelineFeedProps = {
    items,
    hasMore,
    nextCursor,
  };

  return c.html(
    <BaseLayout title={navData.siteName} c={c}>
      <SiteLayout {...navData}>
        <HomeContent FeedComponent={Feed} feedProps={feedProps} />
      </SiteLayout>
    </BaseLayout>,
  );
});
