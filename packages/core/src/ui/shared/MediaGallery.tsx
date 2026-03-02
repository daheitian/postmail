/**
 * Media Gallery Component
 *
 * Renders media attachments: images in a horizontal scrollable row
 * (with lightbox support), videos inline with play overlay, audio
 * as compact player cards, and PDFs as file cards linking to the file.
 */

import type { FC } from "hono/jsx";
import type { MediaView } from "../../types.js";
import { getMediaCategory } from "../../lib/upload.js";
import { blurhashToDataUrl } from "../../lib/blurhash-placeholder.js";

export interface MediaGalleryProps {
  attachments: MediaView[];
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const MediaGallery: FC<MediaGalleryProps> = ({ attachments }) => {
  if (attachments.length === 0) return null;

  const images = attachments.filter(
    (a) => getMediaCategory(a.mimeType) === "image",
  );
  const videos = attachments.filter(
    (a) => getMediaCategory(a.mimeType) === "video",
  );
  const audios = attachments.filter(
    (a) => getMediaCategory(a.mimeType) === "audio",
  );
  const documents = attachments.filter(
    (a) => getMediaCategory(a.mimeType) === "document",
  );

  // Build lightbox group from images + videos
  const lightboxItems = [
    ...images.map((img) => ({
      url: img.url,
      alt: img.altText || "",
      width: img.width,
      height: img.height,
    })),
    ...videos.map((v) => ({
      url: v.url,
      alt: v.altText || "",
      width: v.width,
      height: v.height,
      mimeType: v.mimeType,
      posterUrl: v.posterUrl || undefined,
    })),
  ];

  // Merge images + videos into display order (images first, then videos)
  const visuals = [
    ...images.map((img, i) => ({ ...img, _kind: "image" as const, _lbIdx: i })),
    ...videos.map((v, i) => ({
      ...v,
      _kind: "video" as const,
      _lbIdx: images.length + i,
    })),
  ];

  const hasVisualMedia = visuals.length > 0;
  const singleVisual = visuals.length === 1;

  // In multi mode, row height adapts to the first item's aspect ratio:
  //   landscape/square first → shorter row (feels natural)
  //   portrait first → taller row (shows the portrait well)
  // Clamped between 240px and 400px.
  const ROW_MIN = 240;
  const ROW_MAX = 400;
  let rowHeight = 320; // default
  if (!singleVisual && visuals.length > 0) {
    const first = visuals[0];
    const firstRatio =
      first.width && first.height ? first.width / first.height : 4 / 3;
    // Portrait (ratio < 1) → taller row; landscape → shorter row
    rowHeight = Math.round(
      Math.min(ROW_MAX, Math.max(ROW_MIN, 320 / Math.max(firstRatio, 0.5))),
    );
  }

  return (
    <>
      {/* Images + Videos gallery */}
      {hasVisualMedia && (
        <div
          data-post-media
          data-lightbox-group={JSON.stringify(lightboxItems)}
          class={`mt-3 flex gap-2 ${singleVisual ? "" : "overflow-x-auto scroll-smooth snap-x snap-mandatory"}`}
          style={
            singleVisual
              ? undefined
              : "scrollbar-width: none; -ms-overflow-style: none;"
          }
        >
          {visuals.map((item) => {
            const ratio =
              item.width && item.height ? item.width / item.height : 4 / 3;
            const placeholder = item.blurhash
              ? blurhashToDataUrl(item.blurhash)
              : undefined;

            // In multi mode, each item's width = rowHeight × its aspect ratio
            // Clamped: min 160px (tappable), max 85vw (peek at next item)
            const itemWidth = singleVisual
              ? undefined
              : `${Math.round(Math.max(160, rowHeight * ratio))}px`;

            if (item._kind === "image") {
              return (
                <a
                  key={item.id}
                  href={item.url}
                  data-lightbox-index={item._lbIdx}
                  class={`${singleVisual ? "" : "shrink-0 snap-start"} block rounded-lg overflow-hidden`}
                  style={{
                    ...(singleVisual
                      ? {}
                      : { width: itemWidth, maxWidth: "85%" }),
                    ...(placeholder
                      ? {
                          backgroundImage: `url(${placeholder})`,
                          backgroundSize: "cover",
                        }
                      : {}),
                  }}
                >
                  <img
                    src={item.thumbnailUrl}
                    alt={item.altText || ""}
                    style={
                      singleVisual && item.width && item.height
                        ? { aspectRatio: `${item.width}/${item.height}` }
                        : { height: `${rowHeight}px` }
                    }
                    class={
                      singleVisual
                        ? "rounded-lg max-w-full max-h-96 h-auto object-contain bg-transparent"
                        : "w-full object-cover bg-transparent"
                    }
                    loading="lazy"
                  />
                </a>
              );
            }

            // Video
            const posterSrc = item.posterUrl || placeholder;
            return (
              <a
                key={item.id}
                href={item.url}
                data-lightbox-index={item._lbIdx}
                class={`${singleVisual ? "" : "shrink-0 snap-start"} media-video-wrap`}
                style={
                  singleVisual
                    ? undefined
                    : { width: itemWidth, maxWidth: "85%" }
                }
              >
                <video
                  preload="none"
                  muted
                  playsinline
                  poster={posterSrc}
                  style={
                    singleVisual && item.width && item.height
                      ? { aspectRatio: `${item.width}/${item.height}` }
                      : { height: `${rowHeight}px` }
                  }
                  class={singleVisual ? "max-h-96" : "w-full object-cover"}
                />
                <div class="media-video-play-overlay">
                  <svg viewBox="0 0 24 24" fill="white">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </a>
            );
          })}
        </div>
      )}

      {/* Audio cards */}
      {audios.map((a) => (
        <div key={a.id} class="media-audio-card">
          <div class="media-audio-icon">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>
          {a.altText && <span class="media-audio-name">{a.altText}</span>}
          <div class="media-audio-player">
            <audio controls preload="metadata">
              <source src={a.url} type={a.mimeType} />
            </audio>
          </div>
        </div>
      ))}

      {/* PDF cards */}
      {documents.map((d) => (
        <a
          key={d.id}
          href={d.url}
          target="_blank"
          rel="noopener noreferrer"
          class="media-pdf-card"
        >
          <div class="media-pdf-icon">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <span class="media-pdf-name">{d.altText || "PDF"}</span>
          {d.size != null && (
            <span class="media-pdf-size">{formatSize(d.size)}</span>
          )}
        </a>
      ))}
    </>
  );
};
