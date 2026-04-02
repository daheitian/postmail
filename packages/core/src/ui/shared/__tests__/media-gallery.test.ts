import { renderToString } from "hono/jsx/dom/server";
import { describe, expect, it } from "vitest";
import type { MediaView } from "../../../types.js";
import { MediaGallery } from "../MediaGallery.js";

const HASH = "LEHV6nWB2yk8pyo0adR*.7kCMdnj";

function createMediaView(overrides: Partial<MediaView> = {}): MediaView {
  return {
    id: "media-1",
    url: "/media/full.jpg",
    thumbnailUrl: "/media/thumb.jpg",
    mimeType: "image/jpeg",
    ...overrides,
  };
}

describe("MediaGallery", () => {
  it("renders intrinsic image dimensions and blurhash placeholder styles", () => {
    const html = renderToString(
      MediaGallery({
        attachments: [
          createMediaView({
            width: 1600,
            height: 900,
            blurhash: HASH,
          }),
        ],
      }),
    );

    expect(html).toContain('width="1600"');
    expect(html).toContain('height="900"');
    expect(html).toContain('decoding="async"');
    expect(html).toContain("aspect-ratio:1600/900");
    expect(html).toMatch(/background-image:url\(data:image\/bmp;base64,/);
  });

  it("keeps a single portrait image left-aligned instead of letterboxing a full-width frame", () => {
    const html = renderToString(
      MediaGallery({
        attachments: [
          createMediaView({
            width: 900,
            height: 1600,
            blurhash: HASH,
          }),
        ],
      }),
    );

    expect(html).toContain("aspect-ratio:900/1600");
    expect(html).toMatch(/width:min\(100%, ?calc\(24rem ?\* ?0\.5625\)\)/);
    expect(html).not.toContain("object-contain");
  });

  it("renders intrinsic video dimensions and keeps a blurhash backdrop", () => {
    const html = renderToString(
      MediaGallery({
        attachments: [
          createMediaView({
            id: "media-2",
            url: "/media/video.mp4",
            thumbnailUrl: "/media/video.mp4",
            mimeType: "video/mp4",
            width: 1080,
            height: 1920,
            durationSeconds: 42,
            blurhash: HASH,
            posterUrl: "/media/video-poster.webp",
          }),
        ],
      }),
    );

    expect(html).toContain("<video");
    expect(html).toContain('poster="/media/video-poster.webp"');
    expect(html).toContain('width="1080"');
    expect(html).toContain('height="1920"');
    expect(html).toContain("aspect-ratio:1080/1920");
    expect(html).toMatch(/background-image:url\(data:image\/bmp;base64,/);
  });

  it("marks short videos for feed autoplay instead of the static play overlay", () => {
    const html = renderToString(
      MediaGallery({
        attachments: [
          createMediaView({
            id: "media-3",
            url: "/media/clip.mp4",
            thumbnailUrl: "/media/clip.mp4",
            mimeType: "video/mp4",
            width: 1080,
            height: 1920,
            durationSeconds: 12,
            size: 3_000_000,
            posterUrl: "/media/clip-poster.webp",
          }),
        ],
      }),
    );

    expect(html).toContain("data-feed-short-video");
    expect(html).toContain('data-video-src="/media/clip.mp4"');
    expect(html).toContain("data-feed-video-mute-toggle");
    expect(html).not.toContain("media-video-play-overlay");
    expect(html).not.toContain("media-short-video-progress");
  });
});
