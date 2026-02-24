/**
 * Custom Page Route
 *
 * Serves pages and posts with custom paths via the path registry.
 * This is a catch-all route mounted at "/" - must be registered last.
 * The path registry eliminates ambiguity: each path maps to exactly
 * one entity (page, post, or redirect).
 */

import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { SinglePage } from "../../ui/pages/SinglePage.js";
import { PostPage } from "../../ui/pages/PostPage.js";
import { getNavigationData } from "../../lib/navigation.js";
import { renderPublicPage } from "../../lib/render.js";
import { buildMediaMap } from "../../lib/media-helpers.js";
import { createMediaContext, toPageView, toPostView } from "../../lib/view.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const pageRoutes = new Hono<Env>();

// Catch-all for custom page slugs and post paths (including multi-level)
pageRoutes.get("/*", async (c) => {
  const fullPath = c.req.path.slice(1); // Remove leading /
  if (!fullPath) return c.notFound();

  const entry = await c.var.services.pathRegistry.getByPath(fullPath);

  if (entry?.ownerType === "page") {
    const page = await c.var.services.pages.getById(entry.ownerId);
    if (!page || page.status === "draft") {
      return c.notFound();
    }

    const navData = await getNavigationData(c);
    const pageView = toPageView(page);

    return renderPublicPage(c, {
      title: `${page.title || fullPath} - ${navData.siteName}`,
      description: page.body?.slice(0, 160),
      navData,
      content: <SinglePage page={pageView} />,
    });
  }

  if (entry?.ownerType === "post") {
    const post = await c.var.services.posts.getById(entry.ownerId);
    if (!post || post.status === "draft") {
      return c.notFound();
    }

    // Load media attachments
    const rawMediaMap = await c.var.services.media.getByPostIds([post.id]);
    const mediaCtx = createMediaContext(c.var.appConfig);
    const mediaMap = buildMediaMap(
      rawMediaMap,
      mediaCtx.r2PublicUrl,
      mediaCtx.imageTransformUrl,
      mediaCtx.s3PublicUrl,
    );

    const postView = toPostView(
      { ...post, mediaAttachments: mediaMap.get(post.id) ?? [] },
      mediaCtx,
    );

    const navData = await getNavigationData(c);
    const title = post.title || navData.siteName;

    return renderPublicPage(c, {
      title,
      description: post.body?.slice(0, 160),
      navData,
      content: <PostPage post={postView} />,
    });
  }

  return c.notFound();
});
