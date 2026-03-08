/**
 * Catch-all Route
 *
 * Resolves slug -> post and custom URL -> post/collection.
 * Must be registered last.
 *
 * Resolution order:
 * 1. Direct slug match in posts -> check for custom URL override -> 301 or serve
 * 2. Custom URL match -> serve post or collection
 * 3. Not found
 */

import { Hono, type Context } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { PostPage } from "../../ui/pages/PostPage.js";
import { getNavigationData } from "../../lib/navigation.js";
import { renderPublicPage } from "../../lib/render.js";
import { buildMediaMap } from "../../lib/media-helpers.js";
import { createMediaContext, toPostView } from "../../lib/view.js";
import type { Post } from "../../types.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const pageRoutes = new Hono<Env>();

async function renderPost(c: Context<Env>, post: Post) {
  const mediaCtx = createMediaContext(c.var.appConfig);

  // Load the full thread if this post is part of one
  const threadRootId = post.threadId ?? post.id;
  const threadPosts = await c.var.services.posts.getThread(threadRootId);

  // Batch load media for all thread posts (or just this post if solo)
  const allPostIds =
    threadPosts.length > 1 ? threadPosts.map((p) => p.id) : [post.id];
  const rawMediaMap = await c.var.services.media.getByPostIds(allPostIds);
  const mediaMap = buildMediaMap(
    rawMediaMap,
    mediaCtx.r2PublicUrl,
    mediaCtx.imageTransformUrl,
    mediaCtx.s3PublicUrl,
  );

  // Batch load collections for all posts
  const collectionsMap =
    await c.var.services.collections.getCollectionsByPostIds(allPostIds);

  const postView = toPostView(
    { ...post, mediaAttachments: mediaMap.get(post.id) ?? [] },
    mediaCtx,
    collectionsMap.get(post.id),
  );

  // Build thread post views if this is a multi-post thread
  const threadPostViews =
    threadPosts.length > 1
      ? threadPosts.map((tp) =>
          toPostView(
            { ...tp, mediaAttachments: mediaMap.get(tp.id) ?? [] },
            mediaCtx,
            collectionsMap.get(tp.id),
          ),
        )
      : undefined;

  const navData = await getNavigationData(c);
  const title = post.title || navData.siteName;

  return renderPublicPage(c, {
    title,
    description: post.body?.slice(0, 160),
    navData,
    content: <PostPage post={postView} threadPosts={threadPostViews} />,
  });
}

// Catch-all for slug-based post URLs and custom URL mappings
pageRoutes.get("/*", async (c) => {
  const fullPath = c.req.path.slice(1); // Remove leading /
  if (!fullPath) return c.notFound();

  // 1. Direct slug match
  const post = await c.var.services.posts.getBySlug(fullPath);
  if (post && post.status !== "draft") {
    // Check for custom URL override -> 301 redirect to canonical
    const override = await c.var.services.customUrls.getByTarget(
      "post",
      post.id,
    );
    if (override) {
      return c.redirect(`/${override.path}`, 301);
    }
    // Serve the post at /{slug}
    return renderPost(c, post);
  }

  // 2. Custom URL match
  const customUrl = await c.var.services.customUrls.getByPath(fullPath);
  if (customUrl) {
    if (customUrl.targetType === "post" && customUrl.targetId) {
      const targetPost = await c.var.services.posts.getById(customUrl.targetId);
      if (targetPost && targetPost.status !== "draft") {
        return renderPost(c, targetPost);
      }
    }
    if (customUrl.targetType === "collection" && customUrl.targetId) {
      // Collection custom URLs are not handled here -- they use /c/ prefix
      // This is a placeholder for future collection custom URL support
    }
  }

  return c.notFound();
});
