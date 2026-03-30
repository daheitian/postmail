/**
 * YouTube URL Utilities
 *
 * Parses YouTube URLs, extracts video IDs, and generates thumbnail URLs.
 * Supports youtube.com/watch, youtu.be short links, and youtube.com/shorts.
 */

/**
 * Extracts a YouTube video ID from a URL.
 *
 * @param url - A URL string that may be a YouTube video link
 * @returns The 11-character video ID, or null if the URL is not a recognized YouTube format
 *
 * @example
 * ```ts
 * extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
 * // "dQw4w9WgXcQ"
 *
 * extractYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ");
 * // "dQw4w9WgXcQ"
 *
 * extractYouTubeVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ");
 * // "dQw4w9WgXcQ"
 *
 * extractYouTubeVideoId("https://example.com");
 * // null
 * ```
 */
export function extractYouTubeVideoId(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const hostname = parsed.hostname.replace(/^www\./, "");

  // youtube.com/watch?v=VIDEO_ID
  if (
    (hostname === "youtube.com" || hostname === "m.youtube.com") &&
    parsed.pathname === "/watch"
  ) {
    const v = parsed.searchParams.get("v");
    return isValidVideoId(v) ? v : null;
  }

  // youtube.com/shorts/VIDEO_ID
  if (
    (hostname === "youtube.com" || hostname === "m.youtube.com") &&
    parsed.pathname.startsWith("/shorts/")
  ) {
    const id = parsed.pathname.split("/")[2];
    return isValidVideoId(id) ? id : null;
  }

  // youtube.com/embed/VIDEO_ID
  if (
    (hostname === "youtube.com" || hostname === "m.youtube.com") &&
    parsed.pathname.startsWith("/embed/")
  ) {
    const id = parsed.pathname.split("/")[2];
    return isValidVideoId(id) ? id : null;
  }

  // youtu.be/VIDEO_ID
  if (hostname === "youtu.be") {
    const id = parsed.pathname.slice(1).split("/")[0];
    return isValidVideoId(id) ? id : null;
  }

  return null;
}

/**
 * Returns whether a URL is a recognized YouTube video link.
 *
 * @param url - A URL string to check
 * @returns true if the URL points to a YouTube video
 *
 * @example
 * ```ts
 * isYouTubeUrl("https://youtube.com/watch?v=abc12345678"); // true
 * isYouTubeUrl("https://example.com"); // false
 * ```
 */
export function isYouTubeUrl(url: string): boolean {
  return extractYouTubeVideoId(url) !== null;
}

/**
 * Returns the best-available YouTube thumbnail URL for a video ID.
 *
 * Tries `maxresdefault.jpg` first (1280×720), falling back to
 * `hqdefault.jpg` (480×360) if the high-res version is not available.
 *
 * @param videoId - An 11-character YouTube video ID
 * @returns An array of thumbnail URLs ordered by preference (best first)
 *
 * @example
 * ```ts
 * getYouTubeThumbnailUrls("dQw4w9WgXcQ");
 * // [
 * //   "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
 * //   "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
 * // ]
 * ```
 */
export function getYouTubeThumbnailUrls(videoId: string): string[] {
  return [
    `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
  ];
}

/** YouTube video IDs are exactly 11 characters: alphanumeric, hyphens, and underscores. */
function isValidVideoId(id: string | null | undefined): id is string {
  return typeof id === "string" && /^[\w-]{11}$/.test(id);
}
