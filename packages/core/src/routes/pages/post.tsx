/**
 * Single Post Page Route
 */

import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { PostPage } from "../../ui/pages/PostPage.js";
import * as sqid from "../../lib/sqid.js";
import { getNavigationData } from "../../lib/navigation.js";
import { renderPublicPage } from "../../lib/render.js";
import { buildMediaMap } from "../../lib/media-helpers.js";
import { createMediaContext, toPostView } from "../../lib/view.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const postRoutes = new Hono<Env>();

postRoutes.get("/:id", async (c) => {
  const paramId = c.req.param("id");

  // Decode sqid to numeric ID
  const id = sqid.decode(paramId);
  if (!id) return c.notFound();

  const post = await c.var.services.posts.getById(id);
  if (!post) return c.notFound();

  // Don't show drafts on public site
  if (post.status === "draft") {
    return c.notFound();
  }

  // Batch load media
  const rawMediaMap = await c.var.services.media.getByPostIds([post.id]);
  const mediaCtx = createMediaContext(c.var.appConfig);
  const mediaMap = buildMediaMap(
    rawMediaMap,
    mediaCtx.r2PublicUrl,
    mediaCtx.imageTransformUrl,
    mediaCtx.s3PublicUrl,
  );

  // Transform to View Model
  const postView = toPostView(
    {
      ...post,
      mediaAttachments: mediaMap.get(post.id) ?? [],
    },
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
});
