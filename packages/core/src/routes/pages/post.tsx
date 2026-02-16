/**
 * Single Post Page Route
 */

import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../app.js";
import { PostPage as DefaultPostPage } from "../../themes/threads/pages/PostPage.js";
import * as sqid from "../../lib/sqid.js";
import { getNavigationData } from "../../lib/navigation.js";
import { renderPublicPage } from "../../lib/render.js";
import { buildMediaMap } from "../../lib/media-helpers.js";
import { createMediaContext, toPostView } from "../../lib/view.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const postRoutes = new Hono<Env>();

postRoutes.get("/:id", async (c) => {
  const paramId = c.req.param("id");

  // Try to decode as sqid first
  let id = sqid.decode(paramId);

  // If not a valid sqid, try to find by path
  if (!id) {
    const post = await c.var.services.posts.getByPath(paramId);
    if (post) {
      id = post.id;
    }
  }

  if (!id) return c.notFound();

  const post = await c.var.services.posts.getById(id);
  if (!post) return c.notFound();

  // Don't show drafts on public site
  if (post.visibility === "draft") {
    return c.notFound();
  }

  // Batch load media attachments
  const rawMediaMap = await c.var.services.media.getByPostIds([post.id]);
  const mediaCtx = createMediaContext(c);
  const mediaMap = buildMediaMap(
    rawMediaMap,
    mediaCtx.r2PublicUrl,
    mediaCtx.imageTransformUrl,
    mediaCtx.s3PublicUrl,
  );

  // Transform to View Model
  const postView = toPostView(
    { ...post, mediaAttachments: mediaMap.get(post.id) ?? [] },
    mediaCtx,
  );

  const navData = await getNavigationData(c);
  const title = post.title || navData.siteName;

  const components = c.var.config.theme?.components;
  const Page = components?.PostPage ?? DefaultPostPage;

  return renderPublicPage(c, {
    title,
    description: post.content?.slice(0, 160),
    navData,
    content: <Page post={postView} theme={components} />,
  });
});
