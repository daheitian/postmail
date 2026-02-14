/**
 * Single Post Page Route
 */

import { Hono } from "hono";
import type { Bindings, MediaAttachment } from "../../types.js";
import type { AppVariables } from "../../app.js";
import { PostPage as DefaultPostPage } from "../../theme/pages/PostPage.js";
import * as sqid from "../../lib/sqid.js";
import {
  getMediaUrl,
  getImageUrl,
  getPublicUrlForProvider,
} from "../../lib/image.js";
import { getNavigationData } from "../../lib/navigation.js";
import { renderPublicPage } from "../../lib/render.js";

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

  // Load media attachments
  const rawMedia = await c.var.services.media.getByPostId(post.id);
  const r2PublicUrl = c.env.R2_PUBLIC_URL;
  const imageTransformUrl = c.env.IMAGE_TRANSFORM_URL;
  const s3PublicUrl = c.env.S3_PUBLIC_URL;

  const mediaAttachments: MediaAttachment[] = rawMedia.map((m) => {
    const publicUrl = getPublicUrlForProvider(
      m.provider,
      r2PublicUrl,
      s3PublicUrl,
    );
    return {
      id: m.id,
      url: getMediaUrl(m.id, m.storageKey, publicUrl),
      previewUrl: getImageUrl(
        getMediaUrl(m.id, m.storageKey, publicUrl),
        imageTransformUrl,
        { width: 400, quality: 80, format: "auto", fit: "cover" },
      ),
      alt: m.alt,
      blurhash: m.blurhash,
      width: m.width,
      height: m.height,
      position: m.position,
      mimeType: m.mimeType,
    };
  });

  const navData = await getNavigationData(c);
  const title = post.title || navData.siteName;

  const components = c.var.config.theme?.components;
  const Page = components?.PostPage ?? DefaultPostPage;

  return renderPublicPage(c, {
    title,
    description: post.content?.slice(0, 160),
    navData,
    content: (
      <Page
        post={post}
        mediaAttachments={mediaAttachments}
        theme={components}
      />
    ),
  });
});
