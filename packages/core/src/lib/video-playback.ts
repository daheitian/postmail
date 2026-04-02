/**
 * Shared video playback heuristics for feed autoplay and lightbox controls.
 */

export const SHORT_VIDEO_MAX_DURATION_SECONDS = 15;
export const SHORT_VIDEO_MAX_AUTOPLAY_SIZE_BYTES = 12 * 1024 * 1024;

/**
 * Normalize a media duration into a whole-second value suitable for storage
 * and heuristic checks.
 *
 * @param value - Duration in seconds, usually from video metadata
 * @returns Ceiled whole-second duration, or `undefined` when invalid
 *
 * @example
 * ```ts
 * normalizeDurationSeconds(14.2); // 15
 * ```
 */
export function normalizeDurationSeconds(
  value: number | null | undefined,
): number | undefined {
  if (!Number.isFinite(value) || !value || value <= 0) {
    return undefined;
  }

  return Math.ceil(value);
}

/**
 * Decide whether a video should use the short-video autoplay/custom-player
 * treatment.
 *
 * @param media - Minimal media fields needed for the heuristic
 * @returns `true` when the media should use the short-video experience
 *
 * @example
 * ```ts
 * shouldUseShortVideoExperience({
 *   mimeType: "video/mp4",
 *   durationSeconds: 12,
 *   size: 3_000_000,
 * });
 * ```
 */
export function shouldUseShortVideoExperience(media: {
  mimeType?: string | null;
  durationSeconds?: number | null;
  size?: number | null;
}): boolean {
  if (!media.mimeType?.startsWith("video/")) {
    return false;
  }

  if (
    !Number.isFinite(media.durationSeconds) ||
    !media.durationSeconds ||
    media.durationSeconds <= 0
  ) {
    return false;
  }

  if (media.durationSeconds > SHORT_VIDEO_MAX_DURATION_SECONDS) {
    return false;
  }

  const size = media.size;
  if (typeof size === "number" && size > SHORT_VIDEO_MAX_AUTOPLAY_SIZE_BYTES) {
    return false;
  }

  return true;
}
