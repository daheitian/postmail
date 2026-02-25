/**
 * Dashboard Media Routes
 */

import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { DashLayout } from "../../ui/layouts/DashLayout.js";
import { dsRedirect } from "../../lib/sse.js";
import {
  getMediaUrl,
  getImageUrl,
  getPublicUrlForProvider,
} from "../../lib/image.js";
import { MediaListContent } from "../../ui/dash/media/MediaListContent.js";
import { ViewMediaContent } from "../../ui/dash/media/ViewMediaContent.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const mediaRoutes = new Hono<Env>();

// List media
mediaRoutes.get("/", async (c) => {
  const mediaList = await c.var.services.media.list({ limit: 100 });
  const siteName = c.var.appConfig.siteName;

  return c.html(
    <DashLayout
      c={c}
      title="Media"
      siteName={siteName}
      siteAvatarUrl={c.var.appConfig.siteAvatarUrl}
      currentPath="/dash/media"
    >
      <MediaListContent
        mediaList={mediaList}
        r2PublicUrl={c.var.appConfig.r2PublicUrl}
        imageTransformUrl={c.var.appConfig.imageTransformUrl}
        s3PublicUrl={c.var.appConfig.s3PublicUrl}
        uploadMaxFileSize={c.var.appConfig.uploadMaxFileSize}
      />
    </DashLayout>,
  );
});

// Media picker (returns HTML fragment for PostForm dialog)
// Must be defined before /:id to avoid "picker" matching as an ID
mediaRoutes.get("/picker", async (c) => {
  const mediaList = await c.var.services.media.list({
    limit: 100,
    mimePrefix: "image/",
  });
  const r2PublicUrl = c.var.appConfig.r2PublicUrl;
  const imageTransformUrl = c.var.appConfig.imageTransformUrl;
  const s3PublicUrl = c.var.appConfig.s3PublicUrl;

  if (mediaList.length === 0) {
    return c.html(
      <p class="text-muted-foreground text-sm col-span-4">
        No media uploaded yet. Upload media from the Media page first.
      </p>,
    );
  }

  return c.html(
    <>
      {mediaList.map((m) => {
        const pUrl = getPublicUrlForProvider(
          m.provider,
          r2PublicUrl,
          s3PublicUrl,
        );
        const url = getMediaUrl(m.storageKey, pUrl);
        const thumbUrl = getImageUrl(url, imageTransformUrl, {
          width: 150,
          quality: 80,
          format: "auto",
          fit: "cover",
        });
        return (
          <button
            key={m.id}
            type="button"
            class="aspect-square rounded-lg overflow-hidden border-2 hover:border-primary cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            data-media-id={m.id}
          >
            <img
              src={thumbUrl}
              alt={m.alt || m.originalName}
              class="w-full h-full object-cover"
              loading="lazy"
            />
          </button>
        );
      })}
    </>,
  );
});

// View single media
mediaRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const media = await c.var.services.media.getById(id);
  if (!media) return c.notFound();

  const siteName = c.var.appConfig.siteName;

  return c.html(
    <DashLayout
      c={c}
      title={media.originalName}
      siteName={siteName}
      siteAvatarUrl={c.var.appConfig.siteAvatarUrl}
      currentPath="/dash/media"
    >
      <ViewMediaContent
        media={media}
        r2PublicUrl={c.var.appConfig.r2PublicUrl}
        imageTransformUrl={c.var.appConfig.imageTransformUrl}
        s3PublicUrl={c.var.appConfig.s3PublicUrl}
      />
    </DashLayout>,
  );
});

// Delete media
mediaRoutes.post("/:id/delete", async (c) => {
  const id = c.req.param("id");
  const media = await c.var.services.media.getById(id);
  if (!media) return c.notFound();

  await c.var.services.media.delete(id, c.var.storage);

  return dsRedirect("/dash/media");
});
