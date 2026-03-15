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
import { buildPostMeta } from "../../lib/post-meta.js";
import { createMediaContext, toPostView } from "../../lib/view.js";
import type { Post } from "../../types.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const pageRoutes = new Hono<Env>();

async function renderPost(c: Context<Env>, post: Post) {
  const mediaCtx = createMediaContext(c.var.appConfig);

  // Start navData fetch immediately — it's independent of thread/media queries
  const navDataPromise = getNavigationData(c);

  // Load the full thread if this post is part of one
  const threadRootId = post.threadId;
  const threadPosts = (
    await c.var.services.posts.getThread(threadRootId)
  ).filter((threadPost) => threadPost.status === "published");

  // Batch load media + collections in parallel
  const allPostIds =
    threadPosts.length > 1 ? threadPosts.map((p) => p.id) : [post.id];
  const [rawMediaMap, collectionsMap] = await Promise.all([
    c.var.services.media.getByPostIds(allPostIds),
    c.var.services.collections.getCollectionsByPostIds(allPostIds),
  ]);
  const mediaMap = buildMediaMap(
    rawMediaMap,
    mediaCtx.r2PublicUrl,
    mediaCtx.imageTransformUrl,
    mediaCtx.s3PublicUrl,
  );

  const postView = toPostView(
    { ...post, mediaAttachments: mediaMap.get(post.id) ?? [] },
    mediaCtx,
    collectionsMap.get(post.id),
  );

  // Build thread post views if this is a multi-post thread
  const threadPostViews =
    threadPosts.length > 1
      ? threadPosts.map((tp, i) =>
          toPostView(
            { ...tp, mediaAttachments: mediaMap.get(tp.id) ?? [] },
            mediaCtx,
            collectionsMap.get(tp.id),
            undefined,
            i === threadPosts.length - 1,
          ),
        )
      : undefined;

  const navData = await navDataPromise;
  const meta = buildPostMeta(post, navData.siteName);

  return renderPublicPage(c, {
    title: meta.title,
    description: meta.description,
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

    // If accessed via slug but an alias exists, redirect to the alias
    if (resolved.kind === "slug") {
      const alias = await c.var.services.customUrls.getByTarget(
        "post",
        post.id,
      );
      if (alias) {
        return c.redirect(`/${alias.path}`, 301);
      }
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
