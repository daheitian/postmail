/**
 * Custom Page Route
 *
 * Serves pages from the pages table and posts with custom slugs.
 * This is a catch-all route mounted at "/" - must be registered last.
 */

import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../app.js";
import { SinglePage as DefaultSinglePage } from "../../themes/threads/pages/SinglePage.js";
import { PostPage as DefaultPostPage } from "../../themes/threads/pages/PostPage.js";
import { getNavigationData } from "../../lib/navigation.js";
import { renderPublicPage } from "../../lib/render.js";
import { buildMediaMap } from "../../lib/media-helpers.js";
import { createMediaContext, toPageView, toPostView } from "../../lib/view.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const pageRoutes = new Hono<Env>();

// Catch-all for custom page paths and post slugs
pageRoutes.get("/:slug", async (c) => {
  const slug = c.req.param("slug");

  // First, try to find a page by slug
  const page = await c.var.services.pages.getBySlug(slug);

  if (page) {
    // Don't show draft pages
    if (page.status === "draft") {
      return c.notFound();
    }

    const navData = await getNavigationData(c);
    const pageView = toPageView(page);

    const components = c.var.config.theme?.components;
    const Page = components?.SinglePage ?? DefaultSinglePage;

    return renderPublicPage(c, {
      title: `${page.title || slug} - ${navData.siteName}`,
      description: page.body?.slice(0, 160),
      navData,
      content: <Page page={pageView} theme={components} />,
    });
  }

  // Then, try to find a post by slug
  const post = await c.var.services.posts.getBySlug(slug);

  if (post) {
    // Don't show draft posts
    if (post.status === "draft") {
      return c.notFound();
    }

    // Load media attachments
    const rawMediaMap = await c.var.services.media.getByPostIds([post.id]);
    const mediaCtx = createMediaContext(c);
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

    const components = c.var.config.theme?.components;
    const PostPage = components?.PostPage ?? DefaultPostPage;

    return renderPublicPage(c, {
      title,
      description: post.body?.slice(0, 160),
      navData,
      content: <PostPage post={postView} theme={components} />,
    });
  }

  return c.notFound();
});
