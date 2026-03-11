/**
 * Catch-all Route
 *
 * Resolves post slugs, aliases, redirects, and collection aliases.
 * Must be registered last.
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
  const threadRootId = post.threadId;
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

// Catch-all for path-registry backed post URLs, aliases, and redirects
pageRoutes.get("/*", async (c) => {
  const fullPath = c.req.path.slice(1); // Remove leading /
  if (!fullPath) return c.notFound();

  const resolved = await c.var.services.paths.resolve(fullPath);
  if (!resolved) return c.notFound();

  if (resolved.kind === "redirect" && resolved.redirectToPath) {
    return c.redirect(
      `/${resolved.redirectToPath}`,
      resolved.redirectType ?? 301,
    );
  }

  if (resolved.postId) {
    const post = await c.var.services.posts.getById(resolved.postId);
    if (!post || post.status === "draft") return c.notFound();

    if (post.visibility === "private") {
      const navData = await getNavigationData(c);
      if (!navData.isAuthenticated) return c.notFound();
    }

    if (resolved.kind === "alias") {
      return c.redirect(`/${post.slug}`, 301);
    }

    return renderPost(c, post);
  }

  if (resolved.collectionId) {
    const collection = await c.var.services.collections.getById(
      resolved.collectionId,
    );
    if (!collection) return c.notFound();

    if (resolved.kind === "alias") {
      return c.redirect(`/c/${collection.slug}`, 301);
    }
  }

  return c.notFound();
});
