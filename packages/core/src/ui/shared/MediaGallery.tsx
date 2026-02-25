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
    })),
  ];

  const hasVisualMedia = images.length > 0 || videos.length > 0;
  const singleVisual = images.length + videos.length === 1;

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
          {images.map((img, index) => {
            const aspectRatio =
              img.width && img.height ? img.width / img.height : 4 / 3;
            const itemWidth = singleVisual
              ? undefined
              : `${Math.round(320 * Math.min(Math.max(aspectRatio, 0.6), 1.6))}px`;

            return (
              <a
                key={img.id}
                href={img.url}
                data-lightbox-index={index}
                class={`${singleVisual ? "" : "shrink-0 snap-start"} block rounded-lg overflow-hidden`}
                style={
                  singleVisual
                    ? undefined
                    : { width: itemWidth, maxWidth: "85%" }
                }
              >
                <img
                  src={img.thumbnailUrl}
                  alt={img.altText || ""}
                  class={
                    singleVisual
                      ? "rounded-lg max-w-full max-h-96 h-auto object-contain"
                      : "h-80 w-full object-cover"
                  }
                  loading="lazy"
                />
              </a>
            );
          })}
          {videos.map((v, vIdx) => {
            const lightboxIndex = images.length + vIdx;
            return (
              <a
                key={v.id}
                href={v.url}
                data-lightbox-index={lightboxIndex}
                class={`${singleVisual ? "" : "shrink-0 snap-start"} media-video-wrap`}
                style={
                  singleVisual ? undefined : { width: "320px", maxWidth: "85%" }
                }
              >
                <video
                  src={v.url}
                  preload="metadata"
                  muted
                  playsinline
                  class={singleVisual ? "max-h-96" : "h-80 w-full object-cover"}
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
