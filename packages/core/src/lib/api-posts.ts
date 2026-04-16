import { isTextAttachment } from "../services/media.js";
import type { Media, Post } from "../types.js";
import { getImageUrl, getMediaUrl, getPublicUrlForProvider } from "./image.js";
import { toPublicPath } from "./url.js";

export type ApiPostResponse = Omit<Post, "title" | "url"> & {
  attachments?: ReturnType<typeof toApiAttachment>[];
  collectionIds?: string[];
  title?: string | null;
  url?: string | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
};

export function toApiAttachment(
  media: Media,
  r2PublicUrl?: string,
  imageTransformUrl?: string,
  s3PublicUrl?: string,
  localPublicUrl?: string,
  sitePathPrefix?: string,
) {
  const publicUrl = getPublicUrlForProvider(
    media.provider,
    r2PublicUrl,
    s3PublicUrl,
    localPublicUrl,
  );
  const url = getMediaUrl(media.storageKey, publicUrl, sitePathPrefix);

  if (isTextAttachment(media)) {
    return {
      type: "text" as const,
      id: media.id,
      contentFormat: "markdown" as const,
      contentUrl: toPublicPath(
        `/api/attachments/${media.id}/content`,
        sitePathPrefix,
      ),
      summary: media.summary,
      chars: media.chars,
    };
  }

  const previewUrl = getImageUrl(url, imageTransformUrl, {
    width: 1200,
    height: 768,
    quality: 80,
    format: "auto",
    fit: "scale-down",
  });
  const posterUrl = media.posterKey
    ? getMediaUrl(media.posterKey, publicUrl, sitePathPrefix)
    : null;

  return {
    type: "media" as const,
    id: media.id,
    url,
    previewUrl,
    posterUrl,
    alt: media.alt,
    blurhash: media.blurhash,
    width: media.width,
    height: media.height,
    durationSeconds: media.durationSeconds,
    mimeType: media.mimeType,
    originalName: media.originalName,
    size: media.size,
    summary: media.summary,
    chars: media.chars,
  };
}

export function toApiPost(
  post: Post,
  extras: {
    attachments?: ReturnType<typeof toApiAttachment>[];
    collectionIds?: string[];
  } = {},
): ApiPostResponse {
  const { title, url, ...rest } = post;

  if (post.format === "quote") {
    return {
      ...rest,
      ...extras,
      sourceName: title ?? null,
      sourceUrl: url ?? null,
    };
  }

  return {
    ...rest,
    ...extras,
    title: title ?? null,
    url: url ?? null,
  };
}
