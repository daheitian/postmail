/**
 * Single Post Page Route
 */

import { Hono } from "hono";
import { useLingui } from "@lingui/react/macro";
import type { Bindings, Post, MediaAttachment } from "../../types.js";
import type { AppVariables } from "../../app.js";
import { BaseLayout, SiteLayout } from "../../theme/layouts/index.js";
import { MediaGallery } from "../../theme/components/index.js";
import * as sqid from "../../lib/sqid.js";
import * as time from "../../lib/time.js";
import { getMediaUrl, getImageUrl } from "../../lib/image.js";
import { getNavigationData } from "../../lib/navigation.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const postRoutes = new Hono<Env>();

function PostContent({
  post,
  mediaAttachments,
}: {
  post: Post;
  mediaAttachments: MediaAttachment[];
}) {
  const { t } = useLingui();

  return (
    <article class="h-entry">
      {post.title && (
        <h1 class="p-name text-2xl font-semibold mb-4">{post.title}</h1>
      )}

      <div
        class="e-content prose"
        dangerouslySetInnerHTML={{ __html: post.contentHtml || "" }}
      />

      {mediaAttachments.length > 0 && (
        <MediaGallery attachments={mediaAttachments} />
      )}

      <footer class="mt-6 pt-4 border-t text-sm text-muted-foreground">
        <time
          class="dt-published"
          datetime={time.toISOString(post.publishedAt)}
        >
          {time.formatDate(post.publishedAt)}
        </time>
        <a href={`/p/${sqid.encode(post.id)}`} class="u-url ml-4">
          {t({
            message: "Permalink",
            comment: "@context: Link to permanent URL of post",
          })}
        </a>
      </footer>
    </article>
  );
}

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

  const mediaAttachments: MediaAttachment[] = rawMedia.map((m) => ({
    id: m.id,
    url: getMediaUrl(m.id, m.r2Key, r2PublicUrl),
    previewUrl: getImageUrl(
      getMediaUrl(m.id, m.r2Key, r2PublicUrl),
      imageTransformUrl,
      { width: 400, quality: 80, format: "auto", fit: "cover" },
    ),
    alt: m.alt,
    blurhash: m.blurhash,
    width: m.width,
    height: m.height,
    position: m.position,
    mimeType: m.mimeType,
  }));

  const navData = await getNavigationData(c);
  const title = post.title || navData.siteName;

  return c.html(
    <BaseLayout title={title} description={post.content?.slice(0, 160)} c={c}>
      <SiteLayout {...navData}>
        <PostContent post={post} mediaAttachments={mediaAttachments} />
      </SiteLayout>
    </BaseLayout>,
  );
});
