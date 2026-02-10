/**
 * Media Helper Utilities
 *
 * Shared logic for building MediaAttachment maps from raw media data.
 */

import type { Media, MediaAttachment } from "../types.js";
import { getMediaUrl, getImageUrl } from "./image.js";

/**
 * Builds a map of post IDs to MediaAttachment arrays from raw media data.
 *
 * Transforms raw Media objects (with R2 keys) into MediaAttachment objects
 * (with public URLs and preview URLs) suitable for rendering.
 *
 * @param rawMediaMap - Map of post IDs to raw Media arrays from the media service
 * @param r2PublicUrl - Optional R2 public URL for direct CDN access
 * @param imageTransformUrl - Optional image transformation service URL
 * @returns Map of post IDs to MediaAttachment arrays
 *
 * @example
 * ```ts
 * const rawMediaMap = await services.media.getByPostIds(postIds);
 * const mediaMap = buildMediaMap(rawMediaMap, c.env.R2_PUBLIC_URL, c.env.IMAGE_TRANSFORM_URL);
 * ```
 */
export function buildMediaMap(
  rawMediaMap: Map<number, Media[]>,
  r2PublicUrl?: string,
  imageTransformUrl?: string,
): Map<number, MediaAttachment[]> {
  const mediaMap = new Map<number, MediaAttachment[]>();
  for (const [postId, mediaList] of rawMediaMap) {
    mediaMap.set(
      postId,
      mediaList.map((m) => ({
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
      })),
    );
  }
  return mediaMap;
}
