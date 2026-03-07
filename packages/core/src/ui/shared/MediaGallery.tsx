/**
 * Media Gallery Component
 *
 * Renders media attachments in a unified horizontal row: images with
 * lightbox support, videos with play overlay, documents as styled card
 * tiles, and attached texts as summary cards. Audio renders as compact
 * player cards below the gallery row.
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

export function formatChars(count: number): string {
  if (count < 1000) return `${count} chars`;
  if (count < 1_000_000) {
    return `${parseFloat((count / 1000).toFixed(1))}k chars`;
  }
  return `${parseFloat((count / 1_000_000).toFixed(1))}M chars`;
}

/**
 * Format-specific file icon. Each MIME type gets a visually distinct icon
 * built on the same document silhouette base.
 */
const FileIcon = ({
  mimeType,
  size = 24,
}: {
  mimeType: string;
  size?: number;
}) => {
  const base = {
    width: `${size}`,
    height: `${size}`,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "1.5",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
  } as const;

  // PDF — bold "PDF" label
  if (mimeType === "application/pdf") {
    return (
      <svg {...base}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <text
          x="12"
          y="16.5"
          text-anchor="middle"
          fill="currentColor"
          stroke="none"
          font-size="6"
          font-weight="700"
          font-family="system-ui, sans-serif"
        >
          PDF
        </text>
      </svg>
    );
  }

  // Markdown — "#" heading symbol
  if (mimeType === "text/markdown") {
    return (
      <svg {...base}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <text
          x="12"
          y="16.5"
          text-anchor="middle"
          fill="currentColor"
          stroke="none"
          font-size="10"
          font-weight="700"
          font-family="system-ui, sans-serif"
        >
          #
        </text>
      </svg>
    );
  }

  // CSV — 3x2 grid/table
  if (mimeType === "text/csv") {
    return (
      <svg {...base}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        {/* Horizontal lines */}
        <line x1="8" y1="12" x2="16" y2="12" />
        <line x1="8" y1="15" x2="16" y2="15" />
        <line x1="8" y1="18" x2="16" y2="18" />
        {/* Vertical dividers */}
        <line x1="10.7" y1="12" x2="10.7" y2="18" />
        <line x1="13.3" y1="12" x2="13.3" y2="18" />
      </svg>
    );
  }

  // ZIP — vertical zipper dashes
  if (mimeType === "application/zip") {
    return (
      <svg {...base}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="12" y1="10" x2="12" y2="11.5" />
        <line x1="12" y1="13" x2="12" y2="14.5" />
        <line x1="12" y1="16" x2="12" y2="17.5" />
      </svg>
    );
  }

  // Tiptap JSON — notepad with paragraph lines
  if (mimeType === "text/x-tiptap+json") {
    return (
      <svg {...base}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="11" x2="8" y2="11" />
        <line x1="16" y1="14" x2="8" y2="14" />
        <line x1="12" y1="17" x2="8" y2="17" />
      </svg>
    );
  }

  // Plain text (default) — 3 horizontal text lines
  return (
    <svg {...base}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
};

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
  const documents = attachments.filter((a) => {
    const cat = getMediaCategory(a.mimeType);
    return cat === "document" || cat === "archive";
  });
  const texts = attachments.filter(
    (a) => getMediaCategory(a.mimeType) === "text",
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
    | (MediaView & { _kind: "text" });

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
    ...texts.map((t) => ({ ...t, _kind: "text" as const }) as GalleryItem),
  ];

  const hasGalleryItems = galleryItems.length > 0;
  const singleItem = galleryItems.length === 1;
  // Documents/texts have no intrinsic size — treat as single only if the one item is visual
  const firstItem = galleryItems[0];
  const singleVisual =
    singleItem &&
    firstItem !== undefined &&
    (firstItem._kind === "image" || firstItem._kind === "video");

  // When text/document attachments are mixed with visuals, use a compact row
  const hasNonVisual = texts.length > 0 || documents.length > 0;
  const COMPACT_HEIGHT = 160;

  // Row height adapts to the first visual item's aspect ratio
  const ROW_MIN = hasNonVisual ? 160 : 240;
  const ROW_MAX = hasNonVisual ? 240 : 400;
  let rowHeight = hasNonVisual ? COMPACT_HEIGHT : 320;
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

  // Document card: 3:4 portrait, same height as row
  const DOC_RATIO = 3 / 4;
  const docCardWidth = Math.round(rowHeight * DOC_RATIO);

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
                    width: `${docCardWidth}px`,
                    height: `${rowHeight}px`,
                  }}
                >
                  <div class="media-gallery-card-inner">
                    <div class="media-gallery-card-icon">
                      <FileIcon mimeType={item.mimeType} />
                    </div>
                    <span class="media-gallery-card-summary">
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

            // Text card — 3:4 portrait, matching document cards
            return (
              <button
                key={item.id}
                type="button"
                data-text-preview-id={item.id}
                class="media-gallery-card shrink-0 snap-start"
                style={{
                  width: `${docCardWidth}px`,
                  height: `${rowHeight}px`,
                }}
              >
                <div class="media-gallery-card-inner">
                  <div class="media-gallery-card-icon">
                    <FileIcon mimeType={item.mimeType} />
                  </div>
                  <span class="media-gallery-card-summary">
                    {item.summary || item.originalName || "Attached text"}
                  </span>
                  {typeof item.chars === "number" && item.chars > 0 && (
                    <span class="media-gallery-card-meta">
                      {formatChars(item.chars)}
                    </span>
                  )}
                </div>
              </button>
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
