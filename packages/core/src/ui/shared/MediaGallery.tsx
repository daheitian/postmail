/**
 * Media Gallery Component
 *
 * Renders media attachments in a unified horizontal row: images with
 * lightbox support, videos with play overlay, documents as styled card
 * tiles, and attached texts as summary cards. Audio renders as compact
 * player cards below the gallery row.
 */

import type { FC } from "hono/jsx";
import type { MediaView, AttachedTextView } from "../../types.js";
import { getMediaCategory } from "../../lib/upload.js";
import { blurhashToDataUrl } from "../../lib/blurhash-placeholder.js";

export interface MediaGalleryProps {
  attachments: MediaView[];
  textAttachments?: AttachedTextView[];
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Document icon SVG (file with lines) */
const DocumentIcon = () => (
  <svg
    width="24"
    height="24"
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
);

/** Text icon SVG (file with text lines) */
const TextIcon = () => (
  <svg
    width="24"
    height="24"
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
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);

export const MediaGallery: FC<MediaGalleryProps> = ({
  attachments,
  textAttachments,
}) => {
  const hasTextAttachments = textAttachments && textAttachments.length > 0;
  if (attachments.length === 0 && !hasTextAttachments) return null;

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

  // Build lightbox group from images + videos (documents/texts don't use lightbox)
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
  type GalleryItem =
    | (MediaView & { _kind: "image" | "video"; _lbIdx: number })
    | (MediaView & { _kind: "document" })
    | { _kind: "text"; _text: AttachedTextView };

  const galleryItems: GalleryItem[] = [
    ...images.map(
      (img, i) =>
        ({ ...img, _kind: "image" as const, _lbIdx: i }) as GalleryItem,
    ),
    ...videos.map(
      (v, i) =>
        ({
          ...v,
          _kind: "video" as const,
          _lbIdx: images.length + i,
        }) as GalleryItem,
    ),
    ...documents.map(
      (d) => ({ ...d, _kind: "document" as const }) as GalleryItem,
    ),
    ...(hasTextAttachments
      ? textAttachments.map(
          (t) => ({ _kind: "text" as const, _text: t }) as GalleryItem,
        )
      : []),
  ];

  const hasGalleryItems = galleryItems.length > 0;
  const singleItem = galleryItems.length === 1;
  // Documents/texts have no intrinsic size — treat as single only if the one item is visual
  const firstItem = galleryItems[0];
  const singleVisual =
    singleItem &&
    firstItem !== undefined &&
    (firstItem._kind === "image" || firstItem._kind === "video");

  // Row height adapts to the first visual item's aspect ratio
  const ROW_MIN = 240;
  const ROW_MAX = 400;
  let rowHeight = 320;
  if (!singleVisual && galleryItems.length > 1) {
    const firstVisual = galleryItems.find(
      (item) => item._kind === "image" || item._kind === "video",
    );
    if (firstVisual && "width" in firstVisual && "height" in firstVisual) {
      const firstRatio =
        firstVisual.width && firstVisual.height
          ? firstVisual.width / firstVisual.height
          : 4 / 3;
      rowHeight = Math.round(
        Math.min(ROW_MAX, Math.max(ROW_MIN, 320 / Math.max(firstRatio, 0.5))),
      );
    }
  }

  // Document/text card width: 3:4 portrait aspect ratio
  const CARD_RATIO = 3 / 4;
  const cardWidth = Math.round(rowHeight * CARD_RATIO);

  return (
    <>
      {/* Unified gallery row */}
      {hasGalleryItems && (
        <div
          data-post-media
          data-lightbox-group={
            lightboxItems.length > 0 ? JSON.stringify(lightboxItems) : undefined
          }
          class={`mt-3 flex gap-2 ${singleVisual ? "" : "overflow-x-auto scroll-smooth snap-x snap-mandatory"}`}
          style={
            singleVisual
              ? undefined
              : "scrollbar-width: none; -ms-overflow-style: none;"
          }
        >
          {galleryItems.map((item) => {
            if (item._kind === "image") {
              const ratio =
                item.width && item.height ? item.width / item.height : 4 / 3;
              const placeholder = item.blurhash
                ? blurhashToDataUrl(item.blurhash)
                : undefined;
              const itemWidth = singleVisual
                ? undefined
                : `${Math.round(Math.max(160, rowHeight * ratio))}px`;

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

            if (item._kind === "video") {
              const ratio =
                item.width && item.height ? item.width / item.height : 4 / 3;
              const placeholder = item.blurhash
                ? blurhashToDataUrl(item.blurhash)
                : undefined;
              const itemWidth = singleVisual
                ? undefined
                : `${Math.round(Math.max(160, rowHeight * ratio))}px`;
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
            }

            if (item._kind === "document") {
              return (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="media-gallery-card shrink-0 snap-start"
                  style={{
                    width: `${cardWidth}px`,
                    height: `${rowHeight}px`,
                  }}
                >
                  <div class="media-gallery-card-inner">
                    <div class="media-gallery-card-icon">
                      <DocumentIcon />
                    </div>
                    <span class="media-gallery-card-name">
                      {item.originalName || item.altText || "Document"}
                    </span>
                    {item.size != null && (
                      <span class="media-gallery-card-meta">
                        {formatSize(item.size)}
                      </span>
                    )}
                  </div>
                </a>
              );
            }

            // Text card — item._kind === "text" after all other branches
            const text = (item as { _kind: "text"; _text: AttachedTextView })
              ._text;
            return (
              <div
                key={`text-${text.id}`}
                class="media-gallery-card shrink-0 snap-start"
                style={{
                  width: `${cardWidth}px`,
                  height: `${rowHeight}px`,
                }}
              >
                <div class="media-gallery-card-inner">
                  <div class="media-gallery-card-icon">
                    <TextIcon />
                  </div>
                  <span class="media-gallery-card-name">
                    {text.summary || "Attached text"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Audio cards (remain below the gallery — they need inline players) */}
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
    </>
  );
};
